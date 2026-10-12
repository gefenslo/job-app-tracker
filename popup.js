// "YYYY-MM-DD HH:mm:ss" in Israel time (the sv-SE locale happens to use that layout).
function israelTimestamp() {
  return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jerusalem" });
}

// Runs content.js inside the active tab and returns what it detected.
// Fails (returns {}) on pages Chrome won't let extensions touch, like chrome:// pages.
async function detectFromPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    return injection.result || {};
  } catch (err) {
    console.warn("Could not read the page:", err);
    return {};
  }
}

async function prefillForm() {
  const detected = await detectFromPage();
  detected.timestamp = israelTimestamp();
  for (const [key, value] of Object.entries(detected)) {
    document.getElementById(key).value = value;
  }
}

prefillForm();

// Keys in Sheet column order; doPost reads each one by name.
const FIELDS = [
  "company", "jobTitle", "jobNumber", "timestamp", "status", "responseDate",
  "postingUrl", "source", "location", "salaryRange", "resumeVersion", "notes",
];

const form = document.getElementById("job-form");
const saveButton = document.getElementById("save");
const message = document.getElementById("message");

function showMessage(text, kind) {
  message.textContent = text;
  message.className = kind;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the browser from reloading the popup

  const payload = {};
  for (const key of FIELDS) {
    payload[key] = document.getElementById(key).value.trim();
  }
  console.log("Saving", payload);

  saveButton.disabled = true; // avoid duplicate rows from double clicks
  showMessage("Saving...", "");
  try {
    // text/plain avoids a CORS preflight that Apps Script can't answer.
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (result.success) {
      showMessage("Saved to your sheet.", "success");
    } else {
      showMessage(`Error: ${result.error || "unknown error"}`, "error");
    }
  } catch (err) {
    showMessage(`Could not reach the sheet: ${err.message}`, "error");
  } finally {
    saveButton.disabled = false;
  }
});
