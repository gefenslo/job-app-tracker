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

  function detectSource() {
    const host = location.hostname.replace(/^www\./, "");
    const known = {
      "linkedin.com": "LinkedIn",
      "greenhouse.io": "Greenhouse",
      "lever.co": "Lever",
      "myworkdayjobs.com": "Workday",
      "indeed.com": "Indeed",
      "glassdoor.com": "Glassdoor",
      "ashbyhq.com": "Ashby",
      "smartrecruiters.com": "SmartRecruiters",
    };
    for (const [domain, name] of Object.entries(known)) {
      if (host === domain || host.endsWith("." + domain)) return name;
    }
    return host;
  }

  return {
    company: clean(ld?.hiringOrganization?.name) || meta("og:site_name"),
    jobTitle: clean(ld?.title) || meta("og:title") || clean(document.querySelector("h1")?.textContent) || clean(document.title),
    jobNumber: detectJobNumber(),
    postingUrl: cleanUrl(),
    source: detectSource(),
    location: detectLocation(),
    salaryRange: detectSalary(),
  };
})();
