// Temporary hardcoded data so the form can be checked before detection exists.
const SAMPLE = {
  company: "Acme Corp",
  jobTitle: "Software Engineer Intern",
  jobNumber: "REQ-1234",
  timestamp: new Date().toISOString(),
  postingUrl: "https://example.com/jobs/1234",
  source: "Example",
  location: "Remote",
};

for (const [key, value] of Object.entries(SAMPLE)) {
  document.getElementById(key).value = value;
}
