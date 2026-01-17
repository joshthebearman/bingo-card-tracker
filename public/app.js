// Global state
let currentCard = null;
let currentGoals = [];
let currentBingos = [];
let selectedGoalId = null;
let isViewingOtherCard = false;

const API_URL = 'http://localhost:3000/api';

// Themes
const themes = [
  { id: 'royal', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'sunset', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)' },
  { id: 'ocean', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'forest', gradient: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)' },
  { id: 'lavender', gradient: 'linear-gradient(135deg, #a8caba 0%, #5d4e6d 100%)' },
  { id: 'sunset-pink', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }
];

// Stamp options
const stamps = ['⭐', '✓', '❤️', '🎉', '✨', '🔥', '💪', '🏆'];

// Stamp colors
const stampColors = [
  '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#FFA07A', '#98D8C8', '#F7B731', '#5F27CD'
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeCreatePage();
});

// Navigation
function showLanding() {
  hideAllPages();
  document.getElementById('landing-page').classList.add('active');
  document.getElementById('load-card-section').classList.add('hidden');
  isViewingOtherCard = false;
}

function showCreateCard() {
  hideAllPages();
  document.getElementById('create-page').classList.add('active');
}

function showLoadCard() {
  document.getElementById('load-card-section').classList.remove('hidden');
}

function hideAllPages() {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
}

function showCardPage() {
  hideAllPages();
  document.getElementById('card-page').classList.add('active');
}

function showSettings() {
  hideAllPages();
  document.getElementById('settings-page').classList.add('active');
  populateSettings();
  closeDrawer();
}

function hideSettings() {
  showCardPage();
}

function toggleDrawer() {
  document.getElementById('side-drawer').classList.toggle('open');
}

function closeDrawer() {
  document.getElementById('side-drawer').classList.remove('open');
}

function showViewOtherCard() {
  document.getElementById('view-other-section').classList.remove('hidden');
  closeDrawer();
}

function hideViewOtherCard() {
  document.getElementById('view-other-section').classList.add('hidden');
}

// Create Card Page
function initializeCreatePage() {
  const container = document.getElementById('goals-container');
  container.innerHTML = '';

  for (let i = 0; i < 25; i++) {
    const row = document.createElement('div');
    row.className = 'goal-input-row';

    const number = document.createElement('span');
    number.className = 'goal-number';
    number.textContent = `${i + 1}.`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `goal-${i}`;
    input.placeholder = `Goal ${i + 1}`;
    input.maxLength = 60;

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'free-space';
    radio.value = i;
    radio.id = `free-${i}`;

    const label = document.createElement('label');
    label.htmlFor = `free-${i}`;
    label.className = 'free-space-label';
    label.textContent = 'Free Space';

    row.appendChild(number);
    row.appendChild(input);
    row.appendChild(radio);
    row.appendChild(label);

    container.appendChild(row);
  }
}

async function createCard() {
  const ownerName = document.getElementById('owner-name').value.trim();
  const errorEl = document.getElementById('create-error');

  if (!ownerName) {
    errorEl.textContent = 'Please enter your name';
    return;
  }

  const goals = [];
  let hasEmptyGoal = false;

  for (let i = 0; i < 25; i++) {
    const goalText = document.getElementById(`goal-${i}`).value.trim();
    if (!goalText) {
      hasEmptyGoal = true;
      break;
    }
    goals.push(goalText);
  }

  if (hasEmptyGoal) {
    errorEl.textContent = 'Please fill in all 25 goals';
    return;
  }

  const freeSpaceRadio = document.querySelector('input[name="free-space"]:checked');
  if (!freeSpaceRadio) {
    errorEl.textContent = 'Please select one goal as the free space';
    return;
  }

  const freeSpaceIndex = parseInt(freeSpaceRadio.value);

  try {
    const response = await fetch(`${API_URL}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerName, goals, freeSpaceIndex })
    });

    const data = await response.json();

    if (response.ok) {
      await loadCardByCode(data.code);
      showCardPage();
    } else {
      errorEl.textContent = data.error || 'Failed to create card';
    }
  } catch (error) {
    errorEl.textContent = 'Network error. Please try again.';
  }
}

// Load Card
async function loadCard() {
  const code = document.getElementById('card-code-input').value.trim();
  const errorEl = document.getElementById('load-error');

  if (!code) {
    errorEl.textContent = 'Please enter a card code';
    return;
  }

  await loadCardByCode(code);
}

async function loadOtherCard() {
  const code = document.getElementById('other-card-code').value.trim();

  if (!code) {
    alert('Please enter a card code');
    return;
  }

  isViewingOtherCard = true;
  await loadCardByCode(code);
  hideViewOtherCard();
}

async function loadCardByCode(code) {
  try {
    const response = await fetch(`${API_URL}/cards/${code}`);
    const data = await response.json();

    if (response.ok) {
      currentCard = data.card;
      currentGoals = data.goals;
      currentBingos = data.bingos;

      renderCard();
      showCardPage();

      document.getElementById('load-error').textContent = '';
    } else {
      document.getElementById('load-error').textContent = data.error || 'Card not found';
    }
  } catch (error) {
    document.getElementById('load-error').textContent = 'Network error. Please try again.';
  }
}

// Render Card
function renderCard() {
  if (!currentCard) return;

  // Set theme
  document.body.setAttribute('data-theme', currentCard.theme || 'royal');

  // Set title
  document.getElementById('card-title').textContent = `${currentCard.display_name}'s Bingo Card`;

  // Render grid
  const grid = document.getElementById('bingo-card');
  grid.innerHTML = '';

  currentGoals.forEach((goal, index) => {
    const square = document.createElement('div');
    square.className = 'bingo-square';
    square.dataset.goalId = goal.id;
    square.dataset.position = goal.position;

    if (goal.is_free_space) {
      square.classList.add('free-space');
    }

    if (goal.is_completed) {
      square.classList.add('completed');
    }

    const text = document.createElement('div');
    text.className = 'goal-text';
    text.textContent = goal.text;

    square.appendChild(text);

    if (goal.is_completed) {
      const stamp = document.createElement('div');
      stamp.className = 'stamp-overlay';
      stamp.textContent = currentCard.stamp_icon || '⭐';
      stamp.style.color = currentCard.stamp_color || '#FFD700';
      square.appendChild(stamp);
    }

    square.addEventListener('click', () => openGoalModal(goal));

    grid.appendChild(square);
  });

  // Update stats
  const completedCount = currentGoals.filter(g => g.is_completed).length;
  document.getElementById('goals-complete').textContent = completedCount;
  document.getElementById('bingos-count').textContent = currentBingos.length;

  // Draw bingo lines
  drawBingoLines();
}

// Modal
function openGoalModal(goal) {
  if (isViewingOtherCard) {
    // Can't edit other people's cards in MVP
    alert('You can only view this card. Switch to your own card to make changes.');
    return;
  }

  selectedGoalId = goal.id;
  const modal = document.getElementById('completion-modal');
  const title = document.getElementById('modal-title');
  const goalText = document.getElementById('modal-goal-text');
  const dateInput = document.getElementById('completion-date');
  const notesInput = document.getElementById('completion-notes');
  const confirmBtn = document.getElementById('modal-confirm-btn');
  const uncompleteBtn = document.getElementById('modal-uncomplete-btn');

  goalText.textContent = goal.text;

  if (goal.is_completed) {
    title.textContent = '✓ Completed Goal';
    dateInput.value = goal.completed_date || '';
    notesInput.value = goal.notes || '';
    confirmBtn.textContent = 'Save Changes';
    uncompleteBtn.classList.remove('hidden');
  } else {
    title.textContent = '🎉 Complete Goal';
    dateInput.value = new Date().toISOString().split('T')[0];
    notesInput.value = '';
    confirmBtn.textContent = 'Confirm';
    uncompleteBtn.classList.add('hidden');
  }

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('completion-modal').classList.remove('active');
  selectedGoalId = null;
}

async function confirmCompletion() {
  const goal = currentGoals.find(g => g.id === selectedGoalId);
  const dateInput = document.getElementById('completion-date').value;
  const notesInput = document.getElementById('completion-notes').value;

  const wasCompleted = goal.is_completed;

  try {
    const response = await fetch(`${API_URL}/goals/${selectedGoalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isCompleted: true,
        completedDate: dateInput,
        notes: notesInput
      })
    });

    if (response.ok) {
      goal.is_completed = true;
      goal.completed_date = dateInput;
      goal.notes = notesInput;

      closeModal();
      renderCard();

      // Check for new bingos
      if (!wasCompleted) {
        await checkForBingos();
      }
    }
  } catch (error) {
    alert('Failed to update goal');
  }
}

async function uncompleteGoal() {
  try {
    const response = await fetch(`${API_URL}/goals/${selectedGoalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: false })
    });

    if (response.ok) {
      const goal = currentGoals.find(g => g.id === selectedGoalId);
      goal.is_completed = false;
      goal.completed_date = null;
      goal.notes = null;

      closeModal();

      // Check if any bingos should be removed
      await checkForBingos();

      renderCard();
    }
  } catch (error) {
    alert('Failed to update goal');
  }
}

// Bingo Detection
async function checkForBingos() {
  const grid = Array(5).fill(null).map(() => Array(5).fill(false));

  currentGoals.forEach(goal => {
    const row = Math.floor(goal.position / 5);
    const col = goal.position % 5;
    grid[row][col] = goal.is_completed;
  });

  const newBingos = [];
  const existingBingos = new Set(currentBingos.map(b => `${b.type}-${b.index_num}`));

  // Check rows
  for (let i = 0; i < 5; i++) {
    if (grid[i].every(cell => cell)) {
      const key = `row-${i}`;
      if (!existingBingos.has(key)) {
        newBingos.push({ type: 'row', index: i });
      }
    } else {
      // Remove bingo if it exists
      const bingo = currentBingos.find(b => b.type === 'row' && b.index_num === i);
      if (bingo) {
        await deleteBingo('row', i);
      }
    }
  }

  // Check columns
  for (let i = 0; i < 5; i++) {
    if (grid.every(row => row[i])) {
      const key = `column-${i}`;
      if (!existingBingos.has(key)) {
        newBingos.push({ type: 'column', index: i });
      }
    } else {
      const bingo = currentBingos.find(b => b.type === 'column' && b.index_num === i);
      if (bingo) {
        await deleteBingo('column', i);
      }
    }
  }

  // Check diagonal (top-left to bottom-right)
  if ([0, 1, 2, 3, 4].every(i => grid[i][i])) {
    const key = 'diagonal-0';
    if (!existingBingos.has(key)) {
      newBingos.push({ type: 'diagonal', index: 0 });
    }
  } else {
    const bingo = currentBingos.find(b => b.type === 'diagonal' && b.index_num === 0);
    if (bingo) {
      await deleteBingo('diagonal', 0);
    }
  }

  // Check diagonal (top-right to bottom-left)
  if ([0, 1, 2, 3, 4].every(i => grid[i][4 - i])) {
    const key = 'diagonal-1';
    if (!existingBingos.has(key)) {
      newBingos.push({ type: 'diagonal', index: 1 });
    }
  } else {
    const bingo = currentBingos.find(b => b.type === 'diagonal' && b.index_num === 1);
    if (bingo) {
      await deleteBingo('diagonal', 1);
    }
  }

  // Add new bingos
  for (const bingo of newBingos) {
    await addBingo(bingo.type, bingo.index);
  }

  // Trigger celebration for first new bingo
  if (newBingos.length > 0) {
    celebrateBingo();
  }

  // Reload bingos
  await reloadBingos();
}

async function addBingo(type, index) {
  try {
    await fetch(`${API_URL}/bingos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardCode: currentCard.code,
        type,
        index
      })
    });
  } catch (error) {
    console.error('Failed to add bingo:', error);
  }
}

async function deleteBingo(type, index) {
  try {
    await fetch(`${API_URL}/bingos/${currentCard.code}/${type}/${index}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Failed to delete bingo:', error);
  }
}

async function reloadBingos() {
  try {
    const response = await fetch(`${API_URL}/cards/${currentCard.code}`);
    const data = await response.json();
    if (response.ok) {
      currentBingos = data.bingos;
      renderCard();
    }
  } catch (error) {
    console.error('Failed to reload bingos:', error);
  }
}

// Draw Bingo Lines
function drawBingoLines() {
  const svg = document.getElementById('bingo-lines');
  svg.innerHTML = '';

  const grid = document.getElementById('bingo-card');
  const gridRect = grid.getBoundingClientRect();
  const squares = grid.querySelectorAll('.bingo-square');

  svg.style.width = `${gridRect.width}px`;
  svg.style.height = `${gridRect.height}px`;
  svg.setAttribute('viewBox', `0 0 ${gridRect.width} ${gridRect.height}`);

  currentBingos.forEach(bingo => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke', '#FFD700');
    line.setAttribute('stroke-width', '8');
    line.setAttribute('stroke-linecap', 'round');

    let x1, y1, x2, y2;

    if (bingo.type === 'row') {
      const startSquare = squares[bingo.index_num * 5];
      const endSquare = squares[bingo.index_num * 5 + 4];
      const startRect = startSquare.getBoundingClientRect();
      const endRect = endSquare.getBoundingClientRect();

      x1 = startRect.left - gridRect.left + startRect.width / 2;
      y1 = startRect.top - gridRect.top + startRect.height / 2;
      x2 = endRect.left - gridRect.left + endRect.width / 2;
      y2 = endRect.top - gridRect.top + endRect.height / 2;
    } else if (bingo.type === 'column') {
      const startSquare = squares[bingo.index_num];
      const endSquare = squares[20 + bingo.index_num];
      const startRect = startSquare.getBoundingClientRect();
      const endRect = endSquare.getBoundingClientRect();

      x1 = startRect.left - gridRect.left + startRect.width / 2;
      y1 = startRect.top - gridRect.top + startRect.height / 2;
      x2 = endRect.left - gridRect.left + endRect.width / 2;
      y2 = endRect.top - gridRect.top + endRect.height / 2;
    } else if (bingo.type === 'diagonal' && bingo.index_num === 0) {
      const startSquare = squares[0];
      const endSquare = squares[24];
      const startRect = startSquare.getBoundingClientRect();
      const endRect = endSquare.getBoundingClientRect();

      x1 = startRect.left - gridRect.left + startRect.width / 2;
      y1 = startRect.top - gridRect.top + startRect.height / 2;
      x2 = endRect.left - gridRect.left + endRect.width / 2;
      y2 = endRect.top - gridRect.top + endRect.height / 2;
    } else if (bingo.type === 'diagonal' && bingo.index_num === 1) {
      const startSquare = squares[4];
      const endSquare = squares[20];
      const startRect = startSquare.getBoundingClientRect();
      const endRect = endSquare.getBoundingClientRect();

      x1 = startRect.left - gridRect.left + startRect.width / 2;
      y1 = startRect.top - gridRect.top + startRect.height / 2;
      x2 = endRect.left - gridRect.left + endRect.width / 2;
      y2 = endRect.top - gridRect.top + endRect.height / 2;
    }

    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);

    svg.appendChild(line);
  });
}

// Celebration
function celebrateBingo() {
  playBingoSound();
  triggerConfetti();
}

function playBingoSound() {
  // Simple beep using Web Audio API
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const confetti = [];
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#feca57', '#ff9ff3', '#54a0ff'];

  for (let i = 0; i < 150; i++) {
    confetti.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * 10 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngle: 0,
      tiltAngleIncrement: Math.random() * 0.1 + 0.05
    });
  }

  function drawConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    confetti.forEach((p, index) => {
      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
      ctx.stroke();

      p.tiltAngle += p.tiltAngleIncrement;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.d);
      p.tilt = Math.sin(p.tiltAngle - index / 3) * 15;

      if (p.y > canvas.height) {
        confetti.splice(index, 1);
      }
    });

    if (confetti.length > 0) {
      requestAnimationFrame(drawConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  drawConfetti();
}

// Settings
function populateSettings() {
  if (!currentCard) return;

  document.getElementById('settings-display-name').value = currentCard.display_name;
  document.getElementById('display-card-code').textContent = currentCard.code;

  // Theme grid
  const themeGrid = document.getElementById('theme-grid');
  themeGrid.innerHTML = '';
  themes.forEach(theme => {
    const option = document.createElement('div');
    option.className = 'theme-option';
    option.style.background = theme.gradient;
    option.dataset.theme = theme.id;
    if (currentCard.theme === theme.id) {
      option.classList.add('selected');
    }
    option.addEventListener('click', () => selectTheme(theme.id));
    themeGrid.appendChild(option);
  });

  // Stamp grid
  const stampGrid = document.getElementById('stamp-grid');
  stampGrid.innerHTML = '';
  stamps.forEach(stamp => {
    const option = document.createElement('div');
    option.className = 'stamp-option';
    option.textContent = stamp;
    option.dataset.stamp = stamp;
    if (currentCard.stamp_icon === stamp) {
      option.classList.add('selected');
    }
    option.addEventListener('click', () => selectStamp(stamp));
    stampGrid.appendChild(option);
  });

  // Color grid
  const colorGrid = document.getElementById('color-grid');
  colorGrid.innerHTML = '';
  stampColors.forEach(color => {
    const option = document.createElement('div');
    option.className = 'color-option';
    option.style.background = color;
    option.dataset.color = color;
    if (currentCard.stamp_color === color) {
      option.classList.add('selected');
    }
    option.addEventListener('click', () => selectColor(color));
    colorGrid.appendChild(option);
  });
}

function selectTheme(themeId) {
  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  document.querySelector(`[data-theme="${themeId}"]`).classList.add('selected');
}

function selectStamp(stamp) {
  document.querySelectorAll('.stamp-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  document.querySelector(`[data-stamp="${stamp}"]`).classList.add('selected');
}

function selectColor(color) {
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  document.querySelector(`[data-color="${color}"]`).classList.add('selected');
}

async function saveSettings() {
  const displayName = document.getElementById('settings-display-name').value.trim();
  const selectedTheme = document.querySelector('.theme-option.selected')?.dataset.theme;
  const selectedStamp = document.querySelector('.stamp-option.selected')?.dataset.stamp;
  const selectedColor = document.querySelector('.color-option.selected')?.dataset.color;

  try {
    const response = await fetch(`${API_URL}/cards/${currentCard.code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName,
        theme: selectedTheme,
        stampIcon: selectedStamp,
        stampColor: selectedColor
      })
    });

    if (response.ok) {
      currentCard.display_name = displayName;
      currentCard.theme = selectedTheme;
      currentCard.stamp_icon = selectedStamp;
      currentCard.stamp_color = selectedColor;

      renderCard();
      hideSettings();
    } else {
      alert('Failed to save settings');
    }
  } catch (error) {
    alert('Network error');
  }
}

function copyCardCode() {
  const code = currentCard.code;
  navigator.clipboard.writeText(code).then(() => {
    alert('Card code copied to clipboard!');
  });
}

function generateShareImage() {
  alert('Share image feature will use html2canvas library. Install it to enable this feature.');
  // TODO: Implement with html2canvas
  // This would convert the bingo card to a canvas and then to a JPEG
}

// Handle window resize for bingo lines
window.addEventListener('resize', () => {
  if (currentCard && currentBingos.length > 0) {
    drawBingoLines();
  }
});
