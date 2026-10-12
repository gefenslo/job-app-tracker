// Injected into the current tab by the popup. The value of the last expression
// in this file is what chrome.scripting.executeScript hands back to the popup.
// Every field is best-effort: anything not found stays "" and I fill it in by hand.
(() => {
  const clean = (text) => (typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "");
  const meta = (name) =>
    clean(document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content);

  // Many job pages embed machine-readable data as <script type="application/ld+json">.
  // Return the first JobPosting object found, or null.
  function findJobPosting() {
    const queue = [];
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        queue.push(JSON.parse(script.textContent));
      } catch {
        // malformed JSON on the page; skip it
      }
    }
    while (queue.length) {
      const node = queue.shift();
      if (Array.isArray(node)) {
        queue.push(...node);
      } else if (node && typeof node === "object") {
        const types = [].concat(node["@type"] || []);
        if (types.includes("JobPosting")) return node;
        if (node["@graph"]) queue.push(node["@graph"]);
      }
    }
    return null;
  }

  const ld = findJobPosting();

  function detectLocation() {
    if (!ld) return "";
    const places = [].concat(ld.jobLocation || []);
    const names = places
      .map((place) => {
        const a = place.address || {};
        const country = typeof a.addressCountry === "object" ? a.addressCountry?.name : a.addressCountry;
        return [a.addressLocality, a.addressRegion, country].map(clean).filter(Boolean).join(", ");
      })
      .filter(Boolean);
    if (ld.jobLocationType === "TELECOMMUTE") names.push("Remote");
    return names.join(" / ");
  }

  function detectJobNumber() {
    const id = ld?.identifier;
    const fromLd = clean(typeof id === "object" ? String(id?.value ?? "") : String(id ?? ""));
    if (fromLd) return fromLd;
    const params = new URL(location.href).searchParams;
    for (const key of ["gh_jid", "currentJobId", "jobId", "job_id", "reqId", "req_id"]) {
      if (params.get(key)) return params.get(key);
    }
    return "";
  }

  function detectSalary() {
    const value = ld?.baseSalary?.value;
    if (!value || typeof value !== "object") return "";
    const { minValue, maxValue, unitText } = value;
    const currency = ld.baseSalary.currency || "";
    const range = minValue && maxValue ? `${minValue}-${maxValue}` : minValue || maxValue || value.value || "";
    return range ? clean(`${currency} ${range} ${unitText ? "per " + unitText.toLowerCase() : ""}`) : "";
  }

  function cleanUrl() {
    const url = new URL(location.href);
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|trk|trackingId|refId|ref$|src$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  }

  // Job boards are named; anything else (Workday, Greenhouse, an employer's own site...)
  // is the employer's application system, so it counts as the company website.
  function detectSource() {
    const host = location.hostname.replace(/^www\./, "");
    const boards = {
      "linkedin.com": "LinkedIn",
      "indeed.com": "Indeed",
      "glassdoor.com": "Glassdoor",
    };
    for (const [domain, name] of Object.entries(boards)) {
      if (host === domain || host.endsWith("." + domain)) return name;
    }
    return "Company website";
  }

  // Workday puts the employer in the subdomain (nvidia.wd5.myworkdayjobs.com), which is
  // more recognizable than the legal entity in the page data ("IL00 Mellanox Technologies, Ltd.").
  const COMPANY_NAMES = { nvidia: "NVIDIA" }; // fix capitalization the subdomain can't carry
  function companyFromHost() {
    if (!location.hostname.endsWith(".myworkdayjobs.com")) return "";
    const slug = location.hostname.split(".")[0];
    return COMPANY_NAMES[slug.toLowerCase()] || slug.charAt(0).toUpperCase() + slug.slice(1);
  }

  // Look for the resume file name the application page is showing: a chosen <input type=file>,
  // else a short piece of text that looks like a document file name (e.g. "My_CV.pdf").
  function detectResumeFile() {
    for (const input of document.querySelectorAll('input[type="file"]')) {
      if (input.files?.[0]) return input.files[0].name;
    }
    const fileName = /^[^\n/\\]{1,100}\.(pdf|docx?|rtf|odt)$/i;
    for (const el of document.querySelectorAll("body *")) {
      if (el.children.length === 0 && fileName.test(clean(el.textContent))) {
        return clean(el.textContent);
      }
    }
    return "";
  }

  return {
    company: companyFromHost() || clean(ld?.hiringOrganization?.name) || meta("og:site_name"),
    jobTitle: clean(ld?.title) || meta("og:title") || clean(document.querySelector("h1")?.textContent) || clean(document.title),
    jobNumber: detectJobNumber(),
    postingUrl: cleanUrl(),
    source: detectSource(),
    location: detectLocation(),
    salaryRange: detectSalary(),
    resumeVersion: detectResumeFile(),
  };
})();
