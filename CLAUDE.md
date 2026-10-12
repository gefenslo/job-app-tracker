# Job Application Tracker — Chrome Extension

A personal Chrome extension  that helps log job applications
as I submit them. Popup shows pre-filled data detected from the current
page, I confirm/edit it, and it saves a row to a Google Sheet via a Google
Apps Script Web App.

## Stack — do not suggest alternatives

- Manifest V3 Chrome extension: a content script (reads what it can from
  the current page), a popup (plain HTML/CSS/JS, pre-filled + editable
  form), and a background service worker only if actually needed.
- No framework, no build step, no bundler.
- Data store: a Google Sheet, written to via a Google Apps Script Web App
  (`doPost`). Not the full Google Sheets API — Apps Script is the chosen
  approach, keep it that way.
- Personal use only. No Chrome Web Store publishing, no review process —
  loaded unpacked via chrome://extensions in Developer mode. Don't add
  anything (store listing assets, privacy policy, etc.) that only matters
  for a published extension.

## Git workflow

- After any working chunk of progress — a feature that runs, a fixed bug,
  a schema/field change — stage and commit with a clear one-line message
  explaining *why*, not just *what changed*.
- Tell me explicitly when a commit is made and what's in it. Don't batch
  unrelated changes into one commit.
- Remind me to push to GitHub if local commits have been piling up
  unpushed for a while — this project doesn't depend on GitHub for
  anything to *run* (no auto-deploy here, unlike the crane project), but
  unpushed commits aren't backed up anywhere, so don't let that slide.
- If `git` isn't initialized yet in this folder, flag it and offer to run
  `git init` before writing any other files.

## Data model

Columns, in this exact order (must match both the Sheet's header row and
the `doPost` function's `appendRow` array):

1. Company name
2. Job title
3. Job number / req ID
4. Submission timestamp
5. Application status (Applied / Interview / Offer / Rejected)
6. Response received date
7. Job posting URL
8. Source/platform
9. Location
10. Salary/pay range
11. Resume version used
12. Free-text notes

If a field is renamed or added, update it in three places together: the
Sheet header, the popup form, and the `doPost` field mapping — don't let
these drift out of sync.

## Apps Script integration — known gotchas

- The popup's `fetch()` call to the Apps Script Web App URL must use
  `Content-Type: text/plain;charset=utf-8`, not `application/json` — the
  latter triggers a CORS preflight that Apps Script can't answer, and the
  request silently fails. The body is still a JSON string either way;
  only the header changes.
- The Apps Script project must be deployed as: Execute as **Me**, Who has
  access **Anyone**. "Only myself" blocks the extension's request
  entirely.
- Don't try to call the Google Sheets API directly with OAuth for this
  project — that's deliberately avoided in favor of the simpler Apps
  Script approach.

## Platform limits — don't try to work around these

- This extension only runs on desktop Chrome. There's no way to make it
  work on iPhone/mobile Chrome — don't suggest attempting it. Viewing and
  manually adding rows on the phone happens through the Google Sheets
  app instead, which needs no extra building.
- Auto-detecting every field from every job site isn't realistic (every
  ATS — LinkedIn, Greenhouse, Workday, etc. — is structured differently).
  The content script should grab what's reasonably gettable (page title,
  URL, date) and leave the rest for me to fill in the popup before saving.

## Working with me

- I'm a CS student learning this stack as I go (strong in C/C++, new to
  web dev and browser extension APIs specifically). Briefly explain any
  extension-specific API or pattern you use that isn't plain JS.
- Use plan mode for anything beyond a small fix — propose before editing.