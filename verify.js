import "dotenv/config";
import { chromium } from "playwright";
import { readFileSync, existsSync, writeFileSync, appendFileSync } from "fs";
import { loadFromGoogleSheets } from "./sheets.js";

const LEAGUE_NAME = process.env.LEAGUE_NAME || "WALNUT CREEK LL";
const FINDER_URL = "https://maps.littleleague.org/leaguefinder/";
const DELAY_BETWEEN_REQUESTS = 30000; // 30 seconds between each search
const RATE_LIMIT_DELAY = 60000; // 60 seconds wait if rate limited
const MAX_RETRIES = 3;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Load kids data from Google Sheets or JSON file
let kids;
const dataFile = process.argv[2] || "data/kids-2025.json";

if (process.env.GOOGLE_SHEETS_ID) {
  console.log("Loading data from Google Sheets...");
  kids = await loadFromGoogleSheets();
} else if (existsSync(dataFile)) {
  console.log(`Loading data from ${dataFile}...`);
  kids = JSON.parse(readFileSync(dataFile, "utf-8"));
} else {
  console.error(
    `Error: No data source. Set GOOGLE_SHEETS_ID env var or provide a JSON file.`
  );
  process.exit(1);
}

// Filter by division if specified
const divisionFilter = process.env.DIVISION;
if (divisionFilter) {
  const beforeCount = kids.length;
  kids = kids.filter((kid) => kid.division === divisionFilter);
  console.log(`Filtered to division "${divisionFilter}": ${kids.length} of ${beforeCount} registrations`);
}

console.log(
  `\nVerifying ${kids.length} registrations against ${LEAGUE_NAME}\n`
);
console.log("=".repeat(60));

const results = { pass: [], fail: [] };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  viewport: { width: 1280, height: 720 },
  locale: "en-US",
});
const page = await context.newPage();

for (const kid of kids) {
  const name = `${kid.firstname} ${kid.lastname}`;
  const address = `${kid.address}, ${kid.city}, ${kid.state} ${kid.zip}`;

  // Debug: show what we're searching
  console.log(`\nSearching: ${name}`);
  console.log(`  Address: ${address}`);

  try {
    await page.goto(FINDER_URL, { waitUntil: "networkidle" });

    // Select sport type (radio buttons)
    if (kid.sport === "softball") {
      await page.click("#sport-type-input-softball");
    } else if (kid.sport === "challenger") {
      await page.click("#sport-type-input-challenger");
    } else {
      await page.click("#sport-type-input-baseball");
    }

    // Fill address
    await page.fill("#address-input", address);

    // Fill birthday if provided (MM/DD/YYYY format)
    if (kid.birthday && kid.birthday.includes("/")) {
      const [month, , year] = kid.birthday.split("/");
      console.log(`  Birthday: ${kid.birthday} → month=${month}, year=${year}`);
      await page.selectOption(
        "#birth-month-input",
        parseInt(month, 10).toString()
      );
      await page.selectOption("#birth-year-input", year);
    } else {
      // Birthday is required by the form - use a default if not provided
      console.log(`  No birthday provided, using default`);
      await page.selectOption("#birth-month-input", "1");
      await page.selectOption("#birth-year-input", "2015");
    }

    await page.click("#search-button");

    // Wait for results to load
    let foundLeague = "";
    try {
      // Wait for either league name to appear, error messages, or no results
      await page.waitForFunction(
        () => {
          const leagueName = document.querySelector(
            '[data-role="league-result-league-name-display"]'
          );
          const multipleList = document.querySelector(
            "#multiple-league-result-list li"
          );
          const noResults = document.getElementById("no-results-row");
          const geoError = document.getElementById(
            "geocoding-failure-message-row"
          );
          const precisionError = document.getElementById(
            "geocoding-precision-too-low-message-row"
          );

          // Check for lookup failure (API error / rate limit)
          const lookupFailure = document.getElementById(
            "league-lookup-failure-message-row"
          );

          // Check if any result element has content or is displayed
          return (
            (leagueName && leagueName.textContent?.trim()) ||
            (multipleList && multipleList.textContent?.trim()) ||
            (noResults && getComputedStyle(noResults).display !== "none") ||
            (geoError && getComputedStyle(geoError).display !== "none") ||
            (precisionError &&
              getComputedStyle(precisionError).display !== "none") ||
            (lookupFailure &&
              getComputedStyle(lookupFailure).display !== "none")
          );
        },
        { timeout: 20000 }
      );

      // Now extract the result
      foundLeague = await page.evaluate(() => {
        const leagueName = document.querySelector(
          '[data-role="league-result-league-name-display"]'
        );
        if (leagueName && leagueName.textContent?.trim()) {
          return leagueName.textContent.trim();
        }

        const multipleList = document.querySelectorAll(
          "#multiple-league-result-list li p"
        );
        if (multipleList.length > 0) {
          return Array.from(multipleList)
            .map((p) => p.textContent?.trim())
            .filter(Boolean)
            .join(", ");
        }

        const noResults = document.getElementById("no-results-row");
        if (noResults && getComputedStyle(noResults).display !== "none") {
          return "NO LEAGUE FOUND";
        }

        const geoError = document.getElementById(
          "geocoding-failure-message-row"
        );
        if (geoError && getComputedStyle(geoError).display !== "none") {
          return "ADDRESS NOT FOUND";
        }

        const precisionError = document.getElementById(
          "geocoding-precision-too-low-message-row"
        );
        if (
          precisionError &&
          getComputedStyle(precisionError).display !== "none"
        ) {
          return "ADDRESS TOO VAGUE";
        }

        const lookupFailure = document.getElementById(
          "league-lookup-failure-message-row"
        );
        if (
          lookupFailure &&
          getComputedStyle(lookupFailure).display !== "none"
        ) {
          return "API ERROR (possible rate limit)";
        }

        return "UNKNOWN";
      });
    } catch (waitError) {
      // Take screenshot and log page state for debugging
      try {
        const screenshotPath = `/tmp/debug-${kid.firstname}-${kid.lastname}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`  Screenshot saved: ${screenshotPath}`);
      } catch (ssError) {
        console.log(`  Screenshot failed: ${ssError.message}`);
      }

      // Check what's actually on the page
      const pageState = await page.evaluate(() => {
        const body = document.body.innerText.substring(0, 500);
        const title = document.title;
        return { title, body };
      });
      console.log(`  Page title: ${pageState.title}`);
      console.log(`  Page content: ${pageState.body.substring(0, 200)}...`);

      foundLeague = "TIMEOUT";
    }

    // Handle rate limiting with retry
    if (foundLeague.includes("API ERROR")) {
      let retryCount = 0;
      while (foundLeague.includes("API ERROR") && retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(
          `  Rate limited, waiting ${
            RATE_LIMIT_DELAY / 1000
          }s before retry ${retryCount}/${MAX_RETRIES}...`
        );
        await delay(RATE_LIMIT_DELAY);

        // Retry the search
        await page.goto(FINDER_URL, { waitUntil: "networkidle" });
        if (kid.sport === "softball") {
          await page.click("#sport-type-input-softball");
        } else if (kid.sport === "challenger") {
          await page.click("#sport-type-input-challenger");
        } else {
          await page.click("#sport-type-input-baseball");
        }
        await page.fill("#address-input", address);
        if (kid.birthday && kid.birthday.includes("/")) {
          const [month, , year] = kid.birthday.split("/");
          await page.selectOption(
            "#birth-month-input",
            parseInt(month, 10).toString()
          );
          await page.selectOption("#birth-year-input", year);
        } else {
          await page.selectOption("#birth-month-input", "1");
          await page.selectOption("#birth-year-input", "2015");
        }
        await page.click("#search-button");

        try {
          await page.waitForFunction(
            () => {
              const leagueName = document.querySelector(
                '[data-role="league-result-league-name-display"]'
              );
              const lookupFailure = document.getElementById(
                "league-lookup-failure-message-row"
              );
              return (
                (leagueName && leagueName.textContent?.trim()) ||
                (lookupFailure &&
                  getComputedStyle(lookupFailure).display !== "none")
              );
            },
            { timeout: 20000 }
          );

          foundLeague = await page.evaluate(() => {
            const leagueName = document.querySelector(
              '[data-role="league-result-league-name-display"]'
            );
            if (leagueName && leagueName.textContent?.trim()) {
              return leagueName.textContent.trim();
            }
            const lookupFailure = document.getElementById(
              "league-lookup-failure-message-row"
            );
            if (
              lookupFailure &&
              getComputedStyle(lookupFailure).display !== "none"
            ) {
              return "API ERROR (possible rate limit)";
            }
            return "UNKNOWN";
          });
        } catch {
          foundLeague = "TIMEOUT";
        }
      }
    }

    if (foundLeague.toUpperCase().includes(LEAGUE_NAME)) {
      console.log(`✓ PASS: ${name}`);
      results.pass.push({ name, address, sport: kid.sport });
    } else {
      console.log(`✗ FAIL: ${name} → ${foundLeague}`);
      results.fail.push({ name, address, sport: kid.sport, foundLeague });
    }
  } catch (error) {
    console.log(`✗ ERROR: ${name} → ${error.message}`);
    results.fail.push({
      name,
      address,
      sport: kid.sport,
      error: error.message,
    });
  }

  // Delay between requests to avoid rate limiting
  await delay(DELAY_BETWEEN_REQUESTS);
}

await browser.close();

// Summary
console.log("\n" + "=".repeat(60));
console.log(
  `\nRESULTS: ${results.pass.length} passed, ${results.fail.length} failed\n`
);

// Save results to JSON file
const resultsFile = "results.json";
writeFileSync(resultsFile, JSON.stringify(results, null, 2));
console.log(`Results saved to ${resultsFile}`);

// Write GitHub Actions summary if running in CI (counts only, no PII)
if (process.env.GITHUB_STEP_SUMMARY) {
  const division = process.env.DIVISION || "All";
  let summary = `## ${division}\n\n`;
  summary += `✅ **Passed:** ${results.pass.length}\n`;
  summary += `❌ **Failed:** ${results.fail.length}\n`;

  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log("GitHub Actions summary written");
}

if (results.fail.length > 0) {
  console.log("FAILED REGISTRATIONS:");
  for (const f of results.fail) {
    console.log(`  - ${f.name}: ${f.foundLeague || f.error}`);
  }
  console.log("");
  process.exit(1);
}
