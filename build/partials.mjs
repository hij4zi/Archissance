/* Shared chrome + reusable SVG fragments. Single source of truth for
   <head>, header and footer across every generated page. */

export const SITE = {
  name: "Archissance",
  wordmark: "archissance",            // lower-case logotype only — header brand,
                                       // footer wordmark, hero seam word. Prose
                                       // references to the firm's name (page
                                       // titles, meta text, body copy, "Archissance
                                       // Design Group") keep normal capitalization.
  legal: "Archissance Design Group",
  founded: "2002",
  city: "Costa Mesa, California",
  address1: "3185 Airway Avenue, Suite F1",
  address2: "Costa Mesa, CA 92626",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=3185+Airway+Avenue+Suite+F1+Costa+Mesa+CA+92626",
  email: "samir@archissance.com",
  phoneDisplay: "(949) 544-5505 ext 100",
  phoneHref: "+19495445505,100",
  domain: "archissance.com"
};

export const NAV = [
  { href: "index.html", label: "Home", key: "home" },
  { href: "projects.html", label: "Projects", key: "projects" },
  { href: "firm.html", label: "Firm", key: "firm" },
  { href: "contact.html", label: "Contact", key: "contact" }
];

/* Primary logo — the client-supplied file LOGO-A, used as-is (no re-drawing).
   598×562 native; shown at its own proportions, never cropped or stretched. */
export const MARK = (prefix = "") => `<picture class="mark">
  <source type="image/webp" srcset="${prefix}assets/img/proc/logo-a-sm.webp">
  <img src="${prefix}assets/img/proc/logo-a-sm.jpg" width="598" height="562" alt="" aria-hidden="true">
</picture>`;

export function head({ title, description, path, prefix = "" }) {
  const url = `https://${SITE.domain}/${path}`;
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta name="theme-color" content="#f6f4ef">
<link rel="icon" href="${prefix}assets/img/proc/logo-a-sm.jpg" type="image/jpeg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="${prefix}assets/css/main.css">
<script>document.documentElement.className=document.documentElement.className.replace('no-js','js');try{if('scrollRestoration' in history)history.scrollRestoration='manual';}catch(e){}</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${header(path.startsWith("projects/") ? "projects" : keyFromPath(path), prefix)}
`;
}

function keyFromPath(path) {
  if (path === "" || path === "index.html") return "home";
  return path.replace(".html", "");
}

function header(activeKey, prefix) {
  const links = NAV.map(n =>
    `<a href="${prefix}${n.href}"${n.key === activeKey ? ' aria-current="page"' : ""}>${n.label}</a>`
  ).join("\n      ");
  return `<header class="site-header"${activeKey === "home" ? " data-over-hero" : ""}>
  <div class="wrap header-inner">
    <a class="brand" href="${prefix}index.html" aria-label="${SITE.wordmark} — home">
      ${MARK(prefix)}
      <span>${SITE.wordmark}</span>
    </a>
    <a class="back-link" data-back href="${prefix}index.html" aria-label="Go back">
      <span class="arw" aria-hidden="true">&rarr;</span><span>Back</span>
    </a>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="site-nav"><span></span><span></span></button>
    <nav class="nav" id="site-nav" aria-label="Primary">
      ${links}
    </nav>
  </div>
</header>`;
}

export function ctaPanel(prefix = "") {
  return `<section class="cta-panel">
  <div class="wrap section">
    <div class="grid">
      <p class="eyebrow" style="grid-column:span 12;margin-bottom:1.5rem">Start a project</p>
      <p class="display display--caps col-9" style="margin-bottom:2.5rem">Tell us about the project.</p>
      <div class="col-7">
        <p class="lead" style="max-width:44ch;margin-bottom:2rem">
          Whether it's a custom home, an infill parcel or a tenant build-out, the first
          conversation is free and useful. Bring drawings, a pro-forma, or just an address.
        </p>
        <a class="btn" href="${prefix}contact.html">Get in touch <span class="arw" aria-hidden="true">&rarr;</span></a>
      </div>
    </div>
  </div>
</section>`;
}

export function footer(prefix = "") {
  const links = NAV.map(n => `<li><a href="${prefix}${n.href}">${n.label}</a></li>`).join("\n        ");
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-col" style="grid-column:span 4">
        <p class="footer-h">Studio</p>
        <p>${SITE.legal}<br>Architecture &amp; interior architecture<br>Established ${SITE.founded}</p>
      </div>
      <div class="footer-col" style="grid-column:span 3">
        <p class="footer-h">Office</p>
        <p><a href="${SITE.mapsUrl}" target="_blank" rel="noopener">${SITE.address1}<br>${SITE.address2}</a></p>
      </div>
      <div class="footer-col" style="grid-column:span 3">
        <p class="footer-h">Contact</p>
        <p><a href="mailto:${SITE.email}">${SITE.email}</a><br><a href="tel:${SITE.phoneHref}">${SITE.phoneDisplay}</a></p>
      </div>
      <div class="footer-col" style="grid-column:span 2">
        <p class="footer-h">Index</p>
        <ul>
        ${links}
        </ul>
      </div>
    </div>
    <div class="footer-wordmark" aria-hidden="true">${SITE.wordmark}</div>
    <div class="footer-base">
      <span>&copy; <span data-year>2026</span> ${SITE.legal}. All rights reserved.</span>
      <span>${SITE.city}</span>
    </div>
  </div>
</footer>
<script src="${prefix}assets/vendor/gsap.min.js" defer></script>
<script src="${prefix}assets/vendor/ScrollTrigger.min.js" defer></script>
<script src="${prefix}assets/js/main.js" defer></script>
</body>
</html>`;
}

/* ---- Axonometric massing drawing (line art) ---- */
export const AXON_MASSING = `<svg class="axon" viewBox="0 0 520 420" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">
  <path data-draw d="M110 250 260 165 410 250 260 335Z"/>
  <path data-draw d="M110 250 110 150 260 65 260 165 M410 250 410 150 260 65 M260 335 260 165"/>
  <path data-draw d="M175 213 175 130 M260 165 260 90 M345 213 345 130"/>
  <path data-draw d="M150 120 260 56 370 120 260 184Z"/>
  <path data-draw d="M205 96 205 60 M315 96 315 60"/>
  <path data-draw d="M60 278 110 250 M410 250 460 278 M260 335 260 372"/>
</svg>`;

export const AXON_PLAN = `<svg class="axon" viewBox="0 0 520 360" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">
  <path data-draw d="M70 300 250 196 450 311 270 415Z" transform="translate(0,-40)"/>
  <path data-draw d="M70 260 250 156 250 96 70 200Z"/>
  <path data-draw d="M250 156 450 271 450 211 250 96Z"/>
  <path data-draw d="M140 220 140 160 M320 232 320 300 M250 156 250 250"/>
  <path data-draw d="M110 240 200 188 M300 205 380 250"/>
</svg>`;

/* ---- "Concept to completion" — four front-elevation drawings that
   progress from bare site to finished building. Common viewBox 220×150,
   ground line at y=126. Elements marked [data-red] pick up the accent. ---- */
const S = (inner) => `<svg viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const PROCESS_DRAWINGS = [
  // 01 — Feasibility & entitlements: the parcel, setbacks, buildable envelope
  S(`
    <path data-draw d="M8 126 H212"/>
    <path data-draw stroke-dasharray="5 5" d="M26 126 V40 H194 V126"/>
    <path data-draw data-red stroke-dasharray="4 6" d="M52 126 V70 H96 V54 H168 V126"/>
    <path data-draw d="M26 28 H194 M26 24 V32 M194 24 V32"/>
    <circle data-draw cx="188" cy="16" r="7"/><path data-draw d="M188 10 V22"/>
  `),
  // 02 — Design: massing resolved, entry axis found
  S(`
    <path data-draw d="M8 126 H212"/>
    <path data-draw d="M44 126 V78 H88 V58 H150 V74 H176 V126"/>
    <path data-draw d="M44 78 H88 M150 74 H176"/>
    <path data-draw data-red stroke-dasharray="4 6" d="M119 126 V52"/>
    <path data-draw data-red d="M114 52 L119 44 L124 52"/>
  `),
  // 03 — Documentation: the same building, dimensioned and detailed
  S(`
    <path data-draw d="M8 126 H212"/>
    <path data-draw d="M44 126 V78 H88 V58 H150 V74 H176 V126"/>
    <path data-draw d="M58 92 H74 M58 104 H74 M58 116 H74 M100 74 H116 M100 90 H116 M100 106 H116 M128 74 H144 M128 90 H144"/>
    <path data-draw d="M30 58 V126 M26 58 H34 M26 126 H34"/>
    <path data-draw d="M44 44 H150 M44 40 V48 M150 40 V48"/>
    <path data-draw data-red stroke-dasharray="3 5" d="M164 36 V134"/>
    <path data-draw data-red d="M164 36 L159 44 H169 Z"/>
  `),
  // 04 — Construction administration: built, occupied, on the ground
  S(`
    <path data-draw d="M8 126 H212"/>
    <path data-draw d="M14 126 L8 134 M32 126 L26 134 M50 126 L44 134 M188 126 L182 134 M206 126 L200 134"/>
    <path data-draw d="M44 126 V78 H88 V58 H150 V74 H176 V126"/>
    <path data-draw d="M56 92 H74 V108 H56 Z M100 74 H120 V92 H100 Z M128 74 H144 V92 H128 Z"/>
    <path data-draw d="M104 126 V106 H120 V126"/>
    <path data-draw data-red d="M98 106 H126 L132 96 H92 Z"/>
    <circle data-draw cx="192" cy="104" r="11"/><path data-draw d="M192 115 V126"/>
    <circle data-draw cx="28" cy="112" r="3.4"/><path data-draw d="M28 116 V126"/>
  `)
];
