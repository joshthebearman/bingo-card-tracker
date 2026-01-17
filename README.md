# Bingo Card Goal Tracker

A web app for couples to create, track, and complete yearly goal bingo cards with persistence across devices.

## Features

- 5x5 bingo card with customizable goals
- Free space designation (automatically placed in center)
- Goal completion tracking with dates and notes
- Automatic bingo detection (rows, columns, diagonals)
- Confetti animation and sound effects for bingos
- Personalization options (themes, stamp icons, colors)
- Card sharing via unique codes
- Mobile-responsive design

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser to `http://localhost:3000`

## Usage

### Creating a Card
1. Click "Create New Card"
2. Enter your name
3. Enter 25 goals
4. Select one goal as the "free space" (will be placed in center)
5. Click "Create My Bingo Card"
6. Save your unique card code!

### Loading a Card
1. Click "Load Existing Card"
2. Enter your card code
3. Your card will load with all progress saved

### Completing Goals
- Click an incomplete goal to mark it complete
- Add completion date and optional notes
- Click completed goals to view/edit details or uncomplete

### Viewing Partner's Card
1. Click hamburger menu
2. Select "View Other Card"
3. Enter their card code

### Customization
1. Click hamburger menu
2. Select "Settings & Personalization"
3. Customize display name, theme, stamp icon, and stamp color
4. Save settings

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: SQLite
- **API**: RESTful endpoints

## API Endpoints

- `POST /api/cards` - Create new card
- `GET /api/cards/:code` - Load card by code
- `PUT /api/cards/:code` - Update card settings
- `PUT /api/goals/:id` - Update goal
- `POST /api/bingos` - Add bingo
- `DELETE /api/bingos/:cardCode/:type/:index` - Delete bingo

## Development

For development with auto-restart:
```bash
npm run dev
```

## Future Enhancements

See `bingo_card_spec_md.md` for planned future features including:
- User authentication
- Multiple cards per user
- Photo uploads
- Print-friendly view
- Mobile apps
