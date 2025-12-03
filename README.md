# Little League Boundary Verifier

[![Verify League Boundaries](https://github.com/whyisjake/little-league-boundary-verifier/actions/workflows/verify.yml/badge.svg)](https://github.com/whyisjake/little-league-boundary-verifier/actions/workflows/verify.yml)

Automated verification tool that checks if player addresses fall within your Little League's boundaries using the official [Little League Finder](https://maps.littleleague.org/leaguefinder/).

## Features

- Loads player data from Google Sheets or local JSON files
- Verifies addresses against the Little League boundary lookup tool
- Supports baseball, softball, and challenger divisions
- Handles rate limiting with automatic retries
- Runs divisions in parallel via GitHub Actions matrix
- Privacy-safe: only shows pass/fail counts publicly (no player names/addresses)

## Quick Start (Fork This Repo)

1. **Fork this repository** to your own GitHub account

2. **Add secrets** in Settings > Secrets and variables > Actions:
   - `LEAGUE_NAME` - Your league name as it appears in Little League Finder (e.g., "EXAMPLE CITY LL")
   - `GOOGLE_SHEETS_ID` - The ID from your spreadsheet URL
   - `GOOGLE_SHEETS_TAB` - The tab name containing player data
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Your service account email
   - `GOOGLE_PRIVATE_KEY` - Your service account private key

3. **Update divisions** in `.github/workflows/verify.yml` to match your league's division names

4. **Run the workflow** from Actions > "Verify League Boundaries" > "Run workflow"

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
    "division": "Major League (Age 10-12)"
  }
]
```

## Usage

### Run locally

```bash
# Set your league name
export LEAGUE_NAME="YOUR LEAGUE NAME LL"

npm run verify
```

### Run via GitHub Actions

1. Add the required secrets (see Quick Start above)

2. Update the division matrix in `.github/workflows/verify.yml` to match your divisions

3. Go to Actions > "Verify League Boundaries" > "Run workflow"

4. View results in the job summary (pass/fail counts per division)

## Configuration

Set via environment variables or `.env` file:

- `LEAGUE_NAME` - Your league name to match (required)
- `DIVISION` - Filter to a specific division (optional)
- `DELAY_BETWEEN_REQUESTS` - Delay between lookups in ms (default: 30000)
- `RATE_LIMIT_DELAY` - Wait time when rate limited (default: 60000)
- `MAX_RETRIES` - Retry attempts for rate limits (default: 3)

## Privacy

This tool is designed to be safe for public repositories:
- Job summaries only show pass/fail **counts** (no names or addresses)
- Detailed results are saved to `results.json` locally but not uploaded as artifacts
- Player data never leaves your Google Sheet or local machine

## License

MIT
