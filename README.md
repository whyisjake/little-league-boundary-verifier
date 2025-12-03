# Little League Finder

[![Verify League Boundaries](https://github.com/whyisjake/Little-League-Finder/actions/workflows/verify.yml/badge.svg)](https://github.com/whyisjake/Little-League-Finder/actions/workflows/verify.yml)

Automated verification tool that checks if player addresses fall within Little League boundaries using the official [Little League Finder](https://maps.littleleague.org/leaguefinder/).

## Features

- Loads player data from Google Sheets or local JSON files
- Verifies addresses against the Little League boundary lookup tool
- Supports baseball, softball, and challenger divisions
- Handles rate limiting with automatic retries
- Runs divisions in parallel via GitHub Actions matrix
- Generates detailed reports with pass/fail results

## Setup

### 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Configure data source

**Option A: Google Sheets**

1. Create a Google Cloud service account with Sheets API access
2. Share your spreadsheet with the service account email
3. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required columns in your spreadsheet:
- Player First Name
- Player Last Name
- Street Address
- City
- State
- Postal Code
- Player Birth Date (MM/DD/YYYY)
- Division Name

**Option B: Local JSON file**

Create `data/kids-2025.json` with player data:

```json
[
  {
    "firstname": "Test",
    "lastname": "Player",
    "address": "123 Main Street",
    "city": "Your City",
    "state": "CA",
    "zip": "12345",
    "sport": "baseball",
    "birthday": "07/20/2017",
    "division": "AAA - Player Pitch - Evaluation Based (Age 10-11)"
  }
]
```

## Usage

### Run locally

```bash
npm run verify
```

### Run via GitHub Actions

1. Add secrets to your repository:
   - `GOOGLE_SHEETS_ID`
   - `GOOGLE_SHEETS_TAB`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`

2. Go to Actions > "Verify League Boundaries" > "Run workflow"

3. Download results from the Artifacts section when complete

## Configuration

Edit `verify.js` to customize:

- `LEAGUE_NAME` - The league name to match (default: "WALNUT CREEK LL")
- `DELAY_BETWEEN_REQUESTS` - Delay between lookups in ms (default: 30000)
- `RATE_LIMIT_DELAY` - Wait time when rate limited (default: 60000)
- `MAX_RETRIES` - Retry attempts for rate limits (default: 3)

## License

MIT
