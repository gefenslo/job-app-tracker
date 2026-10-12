// Injected into the current tab by the popup. The value of the last expression
// in this file is what chrome.scripting.executeScript hands back to the popup.
// Hardcoded for now to check the injection plumbing before real detection.
({
  company: "Detected Co",
  jobTitle: "Detected Title",
  postingUrl: location.href,
  source: location.hostname,
});
