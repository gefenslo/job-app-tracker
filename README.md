# Job Tracker

A personal Chrome extension (Manifest V3) that logs job applications to a Google Sheet. Click the icon on a job page, review a pre-filled form, and press Save to append a row.

Plain HTML/CSS/JS, no framework and no build step. It runs only on desktop Chrome and is loaded unpacked, not published to the Chrome Web Store.

## What it does

When you open the popup on a job page, it tries to pre-fill:

| Field | Where it comes from |
|---|---|
| Company | Workday subdomain, else the page's job data, else `og:site_name` |
| Job title | Page's job data, else `og:title`, first `<h1>`, or page title |
| Job number / req ID | Page's job data, or URL parameters like `gh_jid` |
| Timestamp | Now, in Israel time (`Asia/Jerusalem`) |
| Status | Defaults to Applied (Applied / Interview / Offer / Rejected) |
| Posting URL | Current URL with tracking parameters removed |
| Source | LinkedIn, Indeed or Glassdoor by name; anything else is "Company website" |
| Location, Salary range | Page's job data, when the site publishes it |
| Resume version | File name found on the page, else the last one you saved |

Response date and notes are always left for you. Detection is best-effort, since every job site is built differently. Anything it can't find is left blank, and every field is editable before saving.

## Setup

### 1. Google Sheet and Apps Script

1. Create a Google Sheet with this header row, in this exact order: Company, Job title, Job number, Timestamp, Status, Response date, Posting URL, Source, Location, Salary range, Resume version, Notes.
2. In the Sheet, open **Extensions > Apps Script** and paste in:

   ```js
   function doPost(e) {
     try {
       const data = JSON.parse(e.postData.contents);
       const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

       sheet.appendRow([
         data.company || "",
         data.jobTitle || "",
         data.jobNumber || "",
         data.timestamp || new Date().toISOString(),
         data.status || "Applied",
         data.responseDate || "",
         data.postingUrl || "",
         data.source || "",
         data.location || "",
         data.salaryRange || "",
         data.resumeVersion || "",
         data.notes || "",
       ]);

       return ContentService
         .createTextOutput(JSON.stringify({ success: true }))
         .setMimeType(ContentService.MimeType.JSON);
     } catch (err) {
       return ContentService
         .createTextOutput(JSON.stringify({ success: false, error: err.message }))
         .setMimeType(ContentService.MimeType.JSON);
     }
   }

   function doGet(e) {
     return ContentService.createTextOutput("Apps Script is running");
   }
   ```

3. **Deploy > New deployment > Web app**, with *Execute as* **Me** and *Who has access* **Anyone**. Copy the Web App URL.

### 2. The extension

1. Copy `config.example.js` to `config.js` and paste your Web App URL into it.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select this folder.
3. Open a job posting and click the extension icon.

After changing any file, click the reload icon on the extension's card in `chrome://extensions`.

## Keep your URL private

The Web App is open to "Anyone", so its URL works like a write key to your Sheet. `config.js` is gitignored for that reason. Don't commit it or paste the URL into a public place.

## How it works

```
click icon -> popup.html opens -> popup.js injects content.js into the tab
content.js reads the page and returns an object -> popup pre-fills the form
Save -> POST (text/plain, JSON body) -> Apps Script doPost -> new Sheet row
```

| File | Role |
|---|---|
| `manifest.json` | Declares the popup and permissions (`activeTab`, `scripting`, `storage`, Google script hosts) |
| `popup.html` / `popup.css` | The 12-field form, in Sheet column order |
| `popup.js` | Pre-fills the form, sends the POST, shows success or error |
| `content.js` | Runs inside the job page and returns whatever it can detect |
| `config.js` | Your Web App URL (gitignored; see `config.example.js`) |

The POST uses `Content-Type: text/plain;charset=utf-8` on purpose. `application/json` triggers a CORS preflight request that Apps Script can't answer, so the request would fail silently.

## Adding or renaming a field

Update all three places together so they don't drift apart: the Sheet header, the popup form (`popup.html` ids and `FIELDS` in `popup.js`), and the field mapping in `doPost`.

## Limitations

- Desktop Chrome only; it can't run on mobile. Use the Google Sheets app to view or add rows on a phone.
- It can't read restricted pages such as `chrome://` tabs; the form still opens, just empty.
- Detection quality varies by site. LinkedIn and Workday are the least predictable.
