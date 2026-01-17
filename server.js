const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 3000;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'bingo-card-tracker' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Database setup - SQLite
const db = new sqlite3.Database('./bingo_cards.db', (err) => {
  if (err) {
    logger.error('Error opening database:', err);
  } else {
    logger.info('Connected to SQLite database');
    initializeDatabase();
  }
});

// Middleware - Request size limits
app.use(bodyParser.json({ limit: '100kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '100kb' }));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === 'production') {
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  }
}));

app.use(express.static('public'));

// Rate limiting
const createCardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 card creations per 15 minutes
  message: 'Too many cards created from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Input validation helpers
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return validator.escape(text.trim());
}

function validateGoalText(text) {
  if (!text || typeof text !== 'string') return false;
  if (text.length < 1 || text.length > 100) return false;
  return true;
}

function validateOwnerName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 1 || name.length > 50) return false;
  return true;
}

function validateCardCode(code) {
  if (!code || typeof code !== 'string') return false;
  // Card code format: NAME-YEAR-XXXX
  if (!/^[A-Z0-9]+-\d{4}-[A-Z0-9]{4}$/.test(code)) return false;
  return true;
}

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS cards (
      code TEXT PRIMARY KEY,
      owner_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      theme TEXT DEFAULT 'default',
      stamp_icon TEXT DEFAULT '⭐',
      stamp_color TEXT DEFAULT '#FFD700',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) logger.error('Error creating cards table:', err);
    });

    db.run(`CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_code TEXT NOT NULL,
      position INTEGER NOT NULL,
      text TEXT NOT NULL,
      is_free_space BOOLEAN DEFAULT 0,
      is_completed BOOLEAN DEFAULT 0,
      completed_date DATE,
      notes TEXT,
      FOREIGN KEY (card_code) REFERENCES cards(code)
    )`, (err) => {
      if (err) logger.error('Error creating goals table:', err);
    });

    db.run(`CREATE TABLE IF NOT EXISTS bingos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_code TEXT NOT NULL,
      type TEXT NOT NULL,
      index_num INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_code) REFERENCES cards(code)
    )`, (err) => {
      if (err) logger.error('Error creating bingos table:', err);
    });
  });
}

// Generate unique card code
function generateCardCode(name) {
  const year = new Date().getFullYear();
  const sanitizedName = name.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 10);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${sanitizedName}-${year}-${random}`;
}

// Shuffle array (Fisher-Yates)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// API Endpoints

// Create new card
app.post('/api/cards', createCardLimiter, (req, res) => {
  const { ownerName, goals, freeSpaceIndex } = req.body;

  // Validation
  if (!validateOwnerName(ownerName)) {
    logger.warn('Invalid owner name attempted');
    return res.status(400).json({ error: 'Invalid owner name (1-50 characters required)' });
  }

  if (!Array.isArray(goals) || goals.length !== 25) {
    logger.warn('Invalid goals array');
    return res.status(400).json({ error: 'Invalid card data: 25 goals required' });
  }

  if (typeof freeSpaceIndex !== 'number' || freeSpaceIndex < 0 || freeSpaceIndex >= 25) {
    logger.warn('Invalid free space index');
    return res.status(400).json({ error: 'Invalid free space selection' });
  }

  // Validate all goal texts
  for (let i = 0; i < goals.length; i++) {
    if (!validateGoalText(goals[i])) {
      logger.warn(`Invalid goal text at index ${i}`);
      return res.status(400).json({ error: `Invalid goal text at position ${i + 1} (1-100 characters required)` });
    }
  }

  const sanitizedOwnerName = sanitizeText(ownerName);
  const sanitizedGoals = goals.map(g => sanitizeText(g));
  const cardCode = generateCardCode(sanitizedOwnerName);

  // Separate free space from other goals
  const freeSpaceGoal = sanitizedGoals[freeSpaceIndex];
  const otherGoals = sanitizedGoals.filter((_, index) => index !== freeSpaceIndex);

  // Shuffle other goals
  const shuffledGoals = shuffleArray(otherGoals);

  // Place free space in center (position 12), others around it
  const positions = [];
  for (let i = 0; i < 25; i++) {
    if (i === 12) {
      positions.push({ text: freeSpaceGoal, isFreeSpace: true });
    } else if (i < 12) {
      positions.push({ text: shuffledGoals[i], isFreeSpace: false });
    } else {
      positions.push({ text: shuffledGoals[i - 1], isFreeSpace: false });
    }
  }

  db.serialize(() => {
    // Insert card
    db.run(
      `INSERT INTO cards (code, owner_name, display_name) VALUES (?, ?, ?)`,
      [cardCode, sanitizedOwnerName, sanitizedOwnerName],
      function(err) {
        if (err) {
          logger.error('Error creating card:', err);
          return res.status(500).json({ error: 'Failed to create card' });
        }

        // Insert goals
        const stmt = db.prepare(`INSERT INTO goals (card_code, position, text, is_free_space) VALUES (?, ?, ?, ?)`);
        positions.forEach((goal, index) => {
          stmt.run(cardCode, index, goal.text, goal.isFreeSpace ? 1 : 0);
        });
        stmt.finalize((err) => {
          if (err) {
            logger.error('Error inserting goals:', err);
            return res.status(500).json({ error: 'Failed to insert goals' });
          }
          logger.info(`Card created: ${cardCode}`);
          res.json({ code: cardCode });
        });
      }
    );
  });
});

// Get card by code
app.get('/api/cards/:code', (req, res) => {
  const { code } = req.params;

  if (!validateCardCode(code)) {
    return res.status(400).json({ error: 'Invalid card code format' });
  }

  db.get(`SELECT * FROM cards WHERE code = ?`, [code], (err, card) => {
    if (err || !card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    db.all(`SELECT * FROM goals WHERE card_code = ? ORDER BY position`, [code], (err, goals) => {
      if (err) {
        logger.error('Error loading goals:', err);
        return res.status(500).json({ error: 'Failed to load goals' });
      }

      db.all(`SELECT * FROM bingos WHERE card_code = ?`, [code], (err, bingos) => {
        if (err) {
          logger.error('Error loading bingos:', err);
          return res.status(500).json({ error: 'Failed to load bingos' });
        }

        res.json({
          card,
          goals,
          bingos
        });
      });
    });
  });
});

// Update card settings
app.put('/api/cards/:code', (req, res) => {
  const { code } = req.params;
  const { displayName, theme, stampIcon, stampColor } = req.body;

  if (!validateCardCode(code)) {
    return res.status(400).json({ error: 'Invalid card code format' });
  }

  const updates = [];
  const values = [];

  if (displayName !== undefined) {
    if (!validateOwnerName(displayName)) {
      return res.status(400).json({ error: 'Invalid display name (1-50 characters required)' });
    }
    updates.push('display_name = ?');
    values.push(sanitizeText(displayName));
  }

  if (theme !== undefined) {
    const validThemes = ['royal', 'sunset', 'ocean', 'forest', 'lavender', 'sunset-pink'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }
    updates.push('theme = ?');
    values.push(theme);
  }

  if (stampIcon !== undefined) {
    const validStamps = ['⭐', '✓', '❤️', '🎉', '✨', '🔥', '💪', '🏆'];
    if (!validStamps.includes(stampIcon)) {
      return res.status(400).json({ error: 'Invalid stamp icon' });
    }
    updates.push('stamp_icon = ?');
    values.push(stampIcon);
  }

  if (stampColor !== undefined) {
    if (!/^#[0-9A-F]{6}$/i.test(stampColor)) {
      return res.status(400).json({ error: 'Invalid stamp color format' });
    }
    updates.push('stamp_color = ?');
    values.push(stampColor);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(code);

  db.run(
    `UPDATE cards SET ${updates.join(', ')} WHERE code = ?`,
    values,
    function(err) {
      if (err) {
        logger.error('Error updating card:', err);
        return res.status(500).json({ error: 'Failed to update card' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Card not found' });
      }
      logger.info(`Card updated: ${code}`);
      res.json({ success: true });
    }
  );
});

// Update goal
app.put('/api/goals/:id', (req, res) => {
  const { id } = req.params;
  const { text, isCompleted, completedDate, notes } = req.body;

  if (isNaN(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid goal ID' });
  }

  const updates = [];
  const values = [];

  if (text !== undefined) {
    if (!validateGoalText(text)) {
      return res.status(400).json({ error: 'Invalid goal text (1-100 characters required)' });
    }
    updates.push('text = ?');
    values.push(sanitizeText(text));
  }

  if (isCompleted !== undefined) {
    updates.push('is_completed = ?');
    values.push(isCompleted ? 1 : 0);
    if (isCompleted) {
      updates.push('completed_date = ?');
      values.push(completedDate || new Date().toISOString().split('T')[0]);
    } else {
      updates.push('completed_date = NULL');
      updates.push('notes = NULL');
    }
  }

  if (notes !== undefined && isCompleted) {
    if (notes.length > 500) {
      return res.status(400).json({ error: 'Notes too long (max 500 characters)' });
    }
    updates.push('notes = ?');
    values.push(sanitizeText(notes));
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  values.push(id);

  db.run(
    `UPDATE goals SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        logger.error('Error updating goal:', err);
        return res.status(500).json({ error: 'Failed to update goal' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      logger.info(`Goal updated: ${id}`);
      res.json({ success: true });
    }
  );
});

// Add bingo
app.post('/api/bingos', (req, res) => {
  const { cardCode, type, index } = req.body;

  if (!validateCardCode(cardCode)) {
    return res.status(400).json({ error: 'Invalid card code format' });
  }

  const validTypes = ['row', 'column', 'diagonal'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid bingo type' });
  }

  if (typeof index !== 'number' || index < 0 || index > 4) {
    return res.status(400).json({ error: 'Invalid bingo index' });
  }

  db.run(
    `INSERT INTO bingos (card_code, type, index_num) VALUES (?, ?, ?)`,
    [cardCode, type, index],
    function(err) {
      if (err) {
        logger.error('Error adding bingo:', err);
        return res.status(500).json({ error: 'Failed to add bingo' });
      }
      logger.info(`Bingo added: ${cardCode} - ${type} ${index}`);
      res.json({ id: this.lastID });
    }
  );
});

// Delete bingo
app.delete('/api/bingos/:cardCode/:type/:index', (req, res) => {
  const { cardCode, type, index } = req.params;

  if (!validateCardCode(cardCode)) {
    return res.status(400).json({ error: 'Invalid card code format' });
  }

  const validTypes = ['row', 'column', 'diagonal'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid bingo type' });
  }

  db.run(
    `DELETE FROM bingos WHERE card_code = ? AND type = ? AND index_num = ?`,
    [cardCode, type, parseInt(index)],
    function(err) {
      if (err) {
        logger.error('Error deleting bingo:', err);
        return res.status(500).json({ error: 'Failed to delete bingo' });
      }
      logger.info(`Bingo deleted: ${cardCode} - ${type} ${index}`);
      res.json({ success: true });
    }
  );
});

// Delete card - requires owner name verification
app.delete('/api/cards/:code', (req, res) => {
  const { code } = req.params;
  const { ownerName } = req.body;

  if (!validateCardCode(code)) {
    return res.status(400).json({ error: 'Invalid card code format' });
  }

  if (!validateOwnerName(ownerName)) {
    return res.status(400).json({ error: 'Owner name required for deletion' });
  }

  const sanitizedOwnerName = sanitizeText(ownerName);

  // Verify owner name matches
  db.get(`SELECT owner_name FROM cards WHERE code = ?`, [code], (err, card) => {
    if (err) {
      logger.error('Error fetching card for deletion:', err);
      return res.status(500).json({ error: 'Failed to delete card' });
    }

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (card.owner_name !== sanitizedOwnerName) {
      logger.warn(`Failed delete attempt for card ${code} - owner name mismatch`);
      return res.status(403).json({ error: 'Owner name does not match. Cannot delete card.' });
    }

    // Delete card and related data
    db.serialize(() => {
      db.run(`DELETE FROM bingos WHERE card_code = ?`, [code], (err) => {
        if (err) {
          logger.error('Error deleting bingos:', err);
          return res.status(500).json({ error: 'Failed to delete bingos' });
        }

        db.run(`DELETE FROM goals WHERE card_code = ?`, [code], (err) => {
          if (err) {
            logger.error('Error deleting goals:', err);
            return res.status(500).json({ error: 'Failed to delete goals' });
          }

          db.run(`DELETE FROM cards WHERE code = ?`, [code], function(err) {
            if (err) {
              logger.error('Error deleting card:', err);
              return res.status(500).json({ error: 'Failed to delete card' });
            }

            if (this.changes === 0) {
              return res.status(404).json({ error: 'Card not found' });
            }

            logger.info(`Card deleted: ${code}`);
            res.json({ success: true });
          });
        });
      });
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
