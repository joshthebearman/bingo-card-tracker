const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./bingo_cards.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Cards table
    db.run(`CREATE TABLE IF NOT EXISTS cards (
      code TEXT PRIMARY KEY,
      owner_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      theme TEXT DEFAULT 'default',
      stamp_icon TEXT DEFAULT '⭐',
      stamp_color TEXT DEFAULT '#FFD700',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Goals table
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
    )`);

    // Bingos table
    db.run(`CREATE TABLE IF NOT EXISTS bingos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_code TEXT NOT NULL,
      type TEXT NOT NULL,
      index_num INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_code) REFERENCES cards(code)
    )`);
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
app.post('/api/cards', (req, res) => {
  const { ownerName, goals, freeSpaceIndex } = req.body;

  if (!ownerName || !goals || goals.length !== 25 || freeSpaceIndex === undefined) {
    return res.status(400).json({ error: 'Invalid card data' });
  }

  const cardCode = generateCardCode(ownerName);

  // Separate free space from other goals
  const freeSpaceGoal = goals[freeSpaceIndex];
  const otherGoals = goals.filter((_, index) => index !== freeSpaceIndex);

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
      [cardCode, ownerName, ownerName],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create card' });
        }

        // Insert goals
        const stmt = db.prepare(`INSERT INTO goals (card_code, position, text, is_free_space) VALUES (?, ?, ?, ?)`);
        positions.forEach((goal, index) => {
          stmt.run(cardCode, index, goal.text, goal.isFreeSpace ? 1 : 0);
        });
        stmt.finalize();

        res.json({ code: cardCode });
      }
    );
  });
});

// Get card by code
app.get('/api/cards/:code', (req, res) => {
  const { code } = req.params;

  db.get(`SELECT * FROM cards WHERE code = ?`, [code], (err, card) => {
    if (err || !card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    db.all(`SELECT * FROM goals WHERE card_code = ? ORDER BY position`, [code], (err, goals) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to load goals' });
      }

      db.all(`SELECT * FROM bingos WHERE card_code = ?`, [code], (err, bingos) => {
        if (err) {
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

  const updates = [];
  const values = [];

  if (displayName !== undefined) {
    updates.push('display_name = ?');
    values.push(displayName);
  }
  if (theme !== undefined) {
    updates.push('theme = ?');
    values.push(theme);
  }
  if (stampIcon !== undefined) {
    updates.push('stamp_icon = ?');
    values.push(stampIcon);
  }
  if (stampColor !== undefined) {
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
        return res.status(500).json({ error: 'Failed to update card' });
      }
      res.json({ success: true });
    }
  );
});

// Update goal
app.put('/api/goals/:id', (req, res) => {
  const { id } = req.params;
  const { text, isCompleted, completedDate, notes } = req.body;

  const updates = [];
  const values = [];

  if (text !== undefined) {
    updates.push('text = ?');
    values.push(text);
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
    updates.push('notes = ?');
    values.push(notes);
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
        return res.status(500).json({ error: 'Failed to update goal' });
      }
      res.json({ success: true });
    }
  );
});

// Add bingo
app.post('/api/bingos', (req, res) => {
  const { cardCode, type, index } = req.body;

  db.run(
    `INSERT INTO bingos (card_code, type, index_num) VALUES (?, ?, ?)`,
    [cardCode, type, index],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add bingo' });
      }
      res.json({ id: this.lastID });
    }
  );
});

// Delete bingo
app.delete('/api/bingos/:cardCode/:type/:index', (req, res) => {
  const { cardCode, type, index } = req.params;

  db.run(
    `DELETE FROM bingos WHERE card_code = ? AND type = ? AND index_num = ?`,
    [cardCode, type, index],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete bingo' });
      }
      res.json({ success: true });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
