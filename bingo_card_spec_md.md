# Bingo Card Goal Tracker - Complete Specification v1.0

## Overview
A web app for couples to create, track, and complete yearly goal bingo cards with persistence across devices.

---

## Card Structure

### Grid Layout
- **Grid:** 5x5 (25 squares total)
- **Free Space:** User designates one goal as "free space" during creation
  - Free space automatically placed in center square
  - All other 24 goals randomly distributed to remaining squares
  - Free space is NOT auto-completed
- **Goal Text:** Character limit TBD (will determine during build based on visual layout)

---

## User Flow

### Card Creation
1. User enters their name/identifier
2. User enters 25 goals (one text input per goal)
3. User selects one goal via radio button as "free space"
4. Submit → generates unique card code (e.g., "ALICE-2026")
5. Goals randomized into grid (except free space → center)

### Card Access
1. User enters their unique card code
2. Card loads with current state

---

## Goal Management

### Editing Goals
- Goals can be edited after creation
- Edit functionality available but not prominently displayed in UI
- No confirmation friction
- **Adding/Removing:** Out of scope for MVP

---

## Completion Tracking

### Marking Complete
- Click/tap incomplete square → Completion modal appears with:
  - Date field (auto-populated with today's date, editable)
  - Notes/reflection text area (optional)
  - Confirm button applies stamp and saves data (date + notes)
- Completion data saved: stamp overlay, completion date, notes

### Viewing/Editing Completed Goals
- Click/tap completed square → View modal appears showing:
  - Completion date (editable)
  - Notes/reflection (editable)
  - "Uncomplete" button to remove completion status
  - Save changes button
- Uncompleting removes stamp, clears date and notes

### Bingo Detection
- App detects completed rows, columns, and diagonals
- **Visual:** Persistent line drawn through completed bingo
- **Celebration:** On first completion of a bingo:
  - Confetti animation
  - Small sound effect
- **Note:** If user uncompletes a goal that breaks a bingo, the line should be removed

### Progress Stats
- Display: X/25 goals complete
- Display: Number of bingos achieved

---

## Navigation & Personalization

### Main UI
- Bingo card grid (primary view)
- Progress stats
- Hamburger menu icon to open side drawer

### Side Drawer Menu
- Settings/Personalization
- View Other Card (enter code to view partner's card)
- (Future: other navigation items)

### Settings/Personalization Page
- **Display Name:** Edit the name shown on the card
- **Card Theme/Color:** Choose color scheme for card background/borders
- **Stamp Selection:** Choose from preset stamp options (icons)
- **Stamp Color:** Customize stamp color
- **Card Code Display:** Show user's unique card code for access
- **Share Card:** Generate shareable image of current card state
  - Converts bingo card to JPEG (shows goals, completion stamps, bingo lines)
  - Download or share via native share options
  - Visual only (no completion notes/dates visible)

---

## Data Persistence

### Backend Storage
- **Backend:** Simple database with unique card codes
- **Access:** Enter code to load card from any device
- **State Saved:**
  - All 25 goals and their positions
  - Completion status per square (stamp, date, notes)
  - Which bingos are complete
  - User's personalization settings (display name, theme/color, stamp choice, stamp color)
  - Card owner name

---

## Multi-User Support

### MVP Scope
- **MVP:** Two users (you and your wife)
- **Privacy:** Cards not private - anyone with code can view/edit
- **Card Viewing:** Each user can view the other's card by entering their code

---

## Technical Stack

### Frontend
- Simple HTML/CSS/JavaScript (vanilla)
- Mobile responsive
- Touch-friendly interactions

### Backend
- Minimal backend for data storage
- REST API for save/load operations
- Simple database (SQLite, PostgreSQL, or similar)

### Deployment
- TBD based on Claude Code recommendations

---

## Design Requirements

### Visual Style
- **Style:** Colorful and simple
- **Feel:** Tactile/interactive (stamp mechanic reinforces this)
- **Mobile:** Fully responsive, mobile-first approach
- **Stamps:** Visual variety in preset stamp options
- **Bingo Lines:** Clear, celebratory visual treatment

### Color Themes
Users can choose from multiple gradient color themes for their card background

### Stamp Options
Preset stamp icons include:
- Star (⭐)
- Checkmark (✓)
- Heart (❤️)
- Party (🎉)
- Sparkles (✨)
- Fire (🔥)
- Muscle (💪)
- Trophy (🏆)

Users can customize stamp color from preset color options

---

## Out of Scope for MVP

The following features are explicitly **not** included in the minimum viable product:

- User authentication/login
- Password protection for cards
- Goal categories/tags
- Photo uploads on completion
- Print-friendly view
- Card archiving for year transitions
- Social features beyond basic sharing
- Multiple cards per user

---

## UI Mockup Descriptions

### 1. Main Bingo Card View
- 5x5 grid display with goal text in each square
- Completed goals show stamp overlay
- Free space in center with distinct visual treatment
- Progress stats at top (X/25 complete, # of bingos)
- Hamburger menu for navigation
- Bingo lines drawn through completed rows/columns/diagonals
- Colorful gradient background based on user's theme choice

### 2. Card Creation Page
- Step 1: Name input field
- Step 2: 25 goal input fields with numbering
- Radio button next to each goal to designate as "free space"
- Scrollable list of goals
- Info box explaining free space placement
- "Create My Bingo Card" submit button

### 3. Completion Modal
**New Completion:**
- Celebration icon/emoji at top
- Goal text displayed prominently
- Date field (auto-populated, editable)
- Notes/reflection textarea (optional)
- Cancel and Confirm buttons

**View/Edit Mode:**
- Shows completion stamp/icon
- "Completed" badge
- Editable date and notes
- "Uncomplete" button
- Close and Save buttons

### 4. Settings/Personalization Page
- Back button to return to main card
- Sections for:
  - Display name input
  - Card theme color selection (grid of gradient options)
  - Stamp icon selection (grid of emoji/icon options)
  - Stamp color selection (color swatches)
  - Card code display with copy button
  - "Generate Shareable Image" button

---

## Implementation Notes for Claude Code

### Key Technical Considerations
1. **Randomization:** Implement Fisher-Yates shuffle for goal placement (excluding center square for free space)
2. **Bingo Detection:** Check all rows, columns, and both diagonals on each completion
3. **Confetti Animation:** Use canvas or CSS animation for celebration effect
4. **Image Generation:** Use html2canvas or similar library to convert card to JPEG
5. **Character Limit:** Test with various screen sizes to determine optimal character limit per goal (likely 40-60 characters)
6. **Sound Effect:** Use Web Audio API with a short, pleasant sound file
7. **Mobile Touch Events:** Ensure touch events work smoothly for modal interactions
8. **Code Generation:** Generate unique codes using name + year + random string or hash

### API Endpoints Needed
- `POST /api/cards` - Create new card
- `GET /api/cards/:code` - Load card by code
- `PUT /api/cards/:code` - Update card state
- `GET /api/cards/:code/export` - Generate shareable image

### Database Schema Considerations
**Cards Table:**
- `code` (primary key, string)
- `owner_name` (string)
- `display_name` (string)
- `theme` (string)
- `stamp_icon` (string)
- `stamp_color` (string)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Goals Table:**
- `id` (primary key)
- `card_code` (foreign key)
- `position` (integer 0-24)
- `text` (string)
- `is_free_space` (boolean)
- `is_completed` (boolean)
- `completed_date` (date, nullable)
- `notes` (text, nullable)

**Bingos Table:**
- `id` (primary key)
- `card_code` (foreign key)
- `type` (enum: 'row', 'column', 'diagonal')
- `index` (integer - which row/column, or 0/1 for diagonals)
- `completed_at` (timestamp)

---

## Testing Checklist

### Functionality
- [ ] Card creation with 25 goals
- [ ] Free space designation and placement
- [ ] Goal randomization (excluding free space)
- [ ] Unique code generation
- [ ] Card loading by code
- [ ] Goal completion with date and notes
- [ ] Goal editing
- [ ] Goal uncompleting
- [ ] Bingo detection (rows, columns, diagonals)
- [ ] Confetti animation triggers
- [ ] Sound effect plays
- [ ] Progress stats update
- [ ] Theme customization persists
- [ ] Stamp customization persists
- [ ] Image export generates correctly
- [ ] Cross-device data persistence

### Responsive Design
- [ ] Mobile phone display (320px - 480px)
- [ ] Tablet display (768px - 1024px)
- [ ] Desktop display (1024px+)
- [ ] Touch interactions work smoothly
- [ ] Modal overlays are accessible on all screen sizes

### Edge Cases
- [ ] Very long goal text handling
- [ ] Empty goal fields validation
- [ ] No free space selected validation
- [ ] Invalid card code handling
- [ ] Network error handling
- [ ] Concurrent edits from different devices
- [ ] Browser back button behavior
- [ ] Clearing browser data doesn't break app

---

## Future Enhancement Ideas
(Post-MVP considerations)

- User authentication and private cards
- Multiple cards per user (e.g., personal, family, work)
- Goal categories and filtering
- Photo uploads for completed goals
- Printable card view
- Annual archives
- Social sharing with other users
- Progress charts and analytics
- Recurring goals across years
- Collaborative cards (shared goals)
- Mobile app versions (iOS/Android)
- Email reminders for uncompleted goals
- Import/export card data as JSON