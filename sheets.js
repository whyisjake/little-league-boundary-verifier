import { google } from 'googleapis';

/**
 * Load kids data from a Google Sheet
 *
 * Required environment variables:
 * - GOOGLE_SHEETS_ID: The ID from the sheet URL (between /d/ and /edit)
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: Service account email
 * - GOOGLE_PRIVATE_KEY: Service account private key (with \n for newlines)
 *
 * Sheet format (first row is headers):
 * firstname | lastname | address | city | state | zip | sport | birthMonth | birthYear
 */
export async function loadFromGoogleSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: process.env.GOOGLE_SHEETS_TAB || 'Player Details',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('No data found in sheet');
  }

  // First row is headers
  const headers = rows[0].map(h => h.toLowerCase().trim());
  const data = rows.slice(1);

  return data.map(row => {
    const kid = {};
    headers.forEach((header, i) => {
      let value = row[i]?.trim() || '';

      // Normalize header names
      const fieldMap = {
        'firstname': 'firstname',
        'first name': 'firstname',
        'player first name': 'firstname',
        'lastname': 'lastname',
        'last name': 'lastname',
        'player last name': 'lastname',
        'street address': 'address',
        'postal code': 'zip',
        'birth date': 'birthday',
        'birthdate': 'birthday',
        'player birth date': 'birthday',
        'dob': 'birthday',
        'division': 'division',
        'division name': 'division',
        'player division': 'division',
      };

      const fieldName = fieldMap[header] || header;
      kid[fieldName] = value;
    });

    // Default sport to baseball if not specified
    if (!kid.sport) kid.sport = 'baseball';

    return kid;
  }).filter(kid => kid.firstname && kid.lastname && kid.address);
}
