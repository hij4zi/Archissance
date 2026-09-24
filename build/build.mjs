/* =============================================================
   ARCHISSANCE static site generator
   Usage:  node build/build.mjs
   Regenerates every .html page from data/ + build/ templates.
   Hand-edit content HERE, not in the generated files.
   ============================================================= */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  SITE, head, footer, ctaPanel, PROCESS_DRAWINGS
} from "./partials.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(ROOT, "data", "projects.json"), "utf8"));
const projects = data.projects;
const bySlug = s => projects.find(p => p.slug === s);

/* pixel dimensions of every processed image, so <img> can reserve the exact
   box without forcing an aspect-ratio (renders keep their native proportions) */
const MANIFEST = JSON.parse(readFileSync(join(ROOT, "assets", "img", "proc", "manifest.json"), "utf8"));
const imgPath = (name, kind) => `assets/img/proc/${name}-${kind}`;

/* Responsive <picture>. NEVER crops: renders at their native aspect ratio,
   width fluid, height auto. The intrinsic width/height keep layout stable. */
function picture(name, alt, { sizes = "100vw", eager = false, prefix = "" } = {}) {
  const [w, h] = MANIFEST[name] || [1600, 1000];
  return `<picture>
    <source type="image/webp"
      srcset="${prefix}${imgPath(name, "sm")}.webp 1100w, ${prefix}${imgPath(name, "lg")}.webp ${w}w"
      sizes="${sizes}">
    <img src="${prefix}${imgPath(name, "lg")}.jpg"
      srcset="${prefix}${imgPath(name, "sm")}.jpg 1100w, ${prefix}${imgPath(name, "lg")}.jpg ${w}w"
      sizes="${sizes}"
      alt="${alt}" width="${w}" height="${h}"
      ${eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>
  </picture>`;
}

/* project-page video block — 16:9 source, autoplays muted+looped in view */
function videoBlock(v, title, prefix = "") {
  const poster = v.poster ? `poster="${prefix}${imgPath(v.poster, "lg")}.jpg"` : "";
  return `<figure class="figure video" data-reveal>
    <div class="video-shell" data-video>
      <video autoplay preload="auto" playsinline loop muted ${poster}
             aria-label="${title} — animation">
        <source src="${prefix}assets/video/${v.src}" type="video/mp4">
      </video>
    </div>
    ${v.caption ? `<figcaption>${v.caption}</figcaption>` : ""}
  </figure>`;
}

/* before / after — two labelled frames, each at its own natural proportions */
function beforeAfter(p, prefix = "") {
  const ba = p.beforeAfter;
  return `<figure class="figure ba" data-reveal>
    <div class="ba-grid">
      <div class="ba-item"><span class="ba-tag">Before</span>${picture(ba.before, `${p.title} — before`, { sizes: "(max-width: 620px) 100vw, 50vw", prefix })}</div>
      <div class="ba-item"><span class="ba-tag ba-tag--after">After</span>${picture(ba.after, `${p.title} — after`, { sizes: "(max-width: 620px) 100vw, 50vw", prefix })}</div>
    </div>
    <figcaption>The same place in the mall &mdash; existing storefront, and the built-out design.</figcaption>
  </figure>`;
}

/* full-width elevation — shown complete, no crop, however wide or tall it is */
function elevationStrip(p, prefix = "") {
  if (!p.elevation) return "";
  return `<figure class="figure elevation" data-reveal>
    ${picture(p.elevation, `${p.title} — street elevation`, { sizes: "100vw", prefix })}
    <figcaption>Street elevation.</figcaption>
  </figure>`;
}

/* List row: catalogue + title + meta + link on the left, framed thumbnail(s)
   on the right, hairline divider between rows.
   twoUp: the Projects index shows two images per row where a second exists;
   the home "Selected work" list uses one.  */
function workRow(p, { prefix = "", twoUp = false } = {}) {
  const place = p.location || p.client || "";
  const heroName = p.hero === "video" ? (p.heroVideo && p.heroVideo.poster) || "linden-vframe" : p.hero;
  const firstImg = p.images && p.images[0];
  const second = (firstImg && (typeof firstImg === "string" ? firstImg : firstImg.name))
    || (p.videos && p.videos[0] && p.videos[0].poster)
    || (p.heroVideo && p.heroVideo.poster)
    || p.elevation
    || (p.beforeAfter && p.beforeAfter.after)
    || null;
  const frame = (name, i, sizes) => `<figure class="figure">${picture(name, `${p.title} — view ${i}`, { sizes, prefix })}</figure>`;
  const media = (twoUp && second && second !== heroName)
    ? frame(heroName, 1, "(max-width: 860px) 100vw, 28vw") + frame(second, 2, "(max-width: 860px) 100vw, 28vw")
    : `<figure class="figure work-row-solo">${picture(heroName, p.title, { sizes: "(max-width: 860px) 100vw, 56vw", prefix })}</figure>`;
  return `<li class="work-row" data-reveal data-force-motion>
    <a class="work-row-link${twoUp && second && second !== heroName ? "" : " work-row-link--solo"}" href="${prefix}projects/${p.slug}.html">
      <span class="work-row-info">
        <span class="cat">${p.catalogue}</span>
        <span class="work-row-title">${p.title}</span>
        <span class="work-row-meta">${p.sector}${place ? " &nbsp;/&nbsp; " + place : ""}</span>
        <span class="link">View project <span class="arw" aria-hidden="true">&rarr;</span></span>
      </span>
      <span class="work-row-media">${media}</span>
    </a>
  </li>`;
}

/* gallery — each render at its own proportions, clean-cut, in a flowing grid */
function gallery(p, prefix = "") {
  if (!p.images || !p.images.length) return "";
  // each entry is either a plain name, or { name, wide: true } to force it
  // onto its own full-width row — for a render whose aspect ratio is too far
  // from its neighbours' to pair cleanly in the 2-up grid (never cropped, so
  // a lone very-tall or very-wide outlier otherwise leaves a visible gap
  // under its shorter row-mate). Use sparingly — only for a real outlier.
  const items = p.images.map((entry, i) => {
    const name = typeof entry === "string" ? entry : entry.name;
    const wide = typeof entry === "object" && entry.wide;
    return `<figure class="figure gallery-item${wide ? " gallery-item--wide" : ""}" data-reveal data-reveal-delay="${i % 3}">
    ${picture(name, `${p.title} — view ${i + 2}`, { sizes: wide ? "100vw" : "(max-width: 860px) 100vw, 50vw", prefix })}
  </figure>`;
  }).join("\n");
  return `<div class="gallery">${items}</div>`;
}

/* ---------------------------------------------------------------
   HOME
   --------------------------------------------------------------- */
function home() {
  // homepage Selected-work order (one image per row)
  const selectedOrder = [
    "fullerton-mixed-use", "west-valley-water-treatment-plant", "linden-point", "sharif-jewelers"
  ];
  const selectedRows = selectedOrder.map(bySlug).map(p => workRow(p, {})).join("\n");

  // category -> stable anchor id shared by "What we do" and the Projects page
  //   Mixed-Use -> mixed-use   Infrastructure & Industrial -> infrastructure-industrial
  const catId = name => name.replace(/&amp;|&/g, "").replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").toLowerCase();

  const sectors = [
    ["MU", "Mixed-Use", "Housing over retail, structured parking and fuel — whole downtown blocks planned as one."],
    ["C", "Commercial", "Retail flagships, jewellery and fuel — brand-driven work held to a higher architectural standard."],
    ["II", "Infrastructure &amp; Industrial", "Water treatment and municipal infrastructure that takes a utilitarian program seriously rather than disguising it."],
    ["R", "Residential", "Custom estates and homes, multi-family infill, and for-sale communities — feasibility through construction administration."]
  ];

  const steps = [
    ["01", "Feasibility &amp; entitlements", "Zoning analysis, massing studies and a realistic read on what a site will actually support — before you're committed."],
    ["02", "Design", "Plans, sections and materials resolved together. We design to a budget, not toward one."],
    ["03", "Documentation", "Coordinated construction documents that a contractor can price and build."],
    ["04", "Construction administration", "We stay on the project through completion — submittals and site visits."]
  ];

  return head({
    title: "Archissance — Architecture & Interiors · Costa Mesa, California",
    description: "Archissance Design Group is a multi-discipline architecture and interior architecture studio in Costa Mesa, California. Mixed-use, commercial, infrastructure and residential work since 2002.",
    path: "index.html"
  }) + `
<main id="main">

  <section class="hero-reel" data-hero-reel>
    <div class="hero-reel-media">
      <video class="hero-reel-video" autoplay loop muted playsinline preload="auto"
             poster="assets/img/proc/linden-hero-vframe-lg.jpg"
             aria-label="Linden Point — render fly-through">
        <source src="assets/video/linden-hero.mp4" type="video/mp4">
      </video>
      <span class="hero-reel-scrim" aria-hidden="true"></span>
      <span class="hero-reel-grain" aria-hidden="true"></span>
    </div>
  </section>
  <div class="hero-seam">
    <h1 class="hero-seam-word"><span>${SITE.wordmark}</span></h1>
  </div>

  <section class="section statement">
    <div class="wrap grid">
      <blockquote class="big col-7 start-6" data-reveal>
        &ldquo;We take pride in our long-term relationships with our clients which many of whom
        have been with us since the beginning of our professional journey. Our clients&rsquo;
        vision and objectives drive our design solutions and teaming composition through
        professional excellence. Our clients depend on our design ability and professional
        judgment to <span class="accent-word">produce great project results</span>.&rdquo;
        <span class="statement-by">&mdash; Samir Hijazi</span>
      </blockquote>
    </div>
  </section>

  <section class="section" id="work">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <h2 class="h3">Selected work</h2>
        <a class="link" href="projects.html">All ${projects.length} projects <span class="arw" aria-hidden="true">&rarr;</span></a>
      </div>
      <ul class="work-list">
        ${selectedRows}
      </ul>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap grid">
      <h2 class="h2 col-4" data-reveal>What we<br>do</h2>
      <div class="col-8">
        <ul class="sector-list">
          ${sectors.map(([n, name, desc]) => `<li data-reveal>
            <a class="row" href="projects.html#${catId(name)}">
              <span class="n">${n}</span>
              <span class="name">${name} <span class="arw" aria-hidden="true">&rarr;</span></span>
              <span class="desc">${desc}</span>
            </a>
          </li>`).join("\n")}
        </ul>
      </div>
    </div>
  </section>

  <section class="section process-section">
    <div class="wrap">
      <div class="process-head" data-reveal>
        <p class="eyebrow">From concept to completion</p>
        <h2 class="h2">One team &mdash; from the first site sketch to the final walk-through.</h2>
      </div>
      <ol class="process">
        ${steps.map(([n, t, d], i) => `<li class="process-stage" data-reveal data-reveal-delay="${Math.min(i, 3)}">
          <div class="process-stage-top">
            <span class="process-n">${n}</span>
            <span class="process-rule" aria-hidden="true"></span>
          </div>
          <div class="process-draw">${PROCESS_DRAWINGS[i]}</div>
          <h3>${t}</h3>
          <p>${d}</p>
        </li>`).join("\n")}
      </ol>
    </div>
  </section>

  ${ctaPanel()}
</main>
` + footer();
}

/* ---------------------------------------------------------------
   FIRM
   --------------------------------------------------------------- */
function firm() {
  const people = [
    ["S. Samir Hijazi, Assoc. AIA", "Managing Principal", "Founding partner. Leads design and entitlements, and the client relationships the studio is built on."],
    ["Associates &amp; Consultants", "Licensed architects · Interior architects · CAD designers", "Teams assembled per project around its specific technical criteria and challenges."]
  ];

  return head({
    title: "Firm — Archissance Design Group",
    description: "Archissance Design Group: a multi-discipline architecture firm founded in 2002 in Costa Mesa, California, serving private individuals, corporate entities and public agencies.",
    path: "firm.html"
  }) + `
<main id="main">
  <section class="hero hero--short">
    <div class="wrap">
      <p class="eyebrow" data-reveal>The firm</p>
      <h1 class="display display--caps hero-title">
        <span class="line-mask"><span>Multi-discipline,</span></span>
        <span class="line-mask"><span>single team.</span></span>
      </h1>
    </div>
  </section>

  <section class="section--tight">
    <div class="wrap grid">
      <div class="col-7" data-reveal>
        <p class="lead">
          Established in 2002 as Archissance Design Group (ADG) was founded by S. Samir Hijazi,
          Managing Principal and the late Wayne T. Fukuda, Architect. Archissance is a multi-discipline
          design firm offering design services in commercial, industrial and residential
          sectors. Our clients include private individuals, corporate entities, and public agencies.
        </p>
        <p style="margin-top:2rem">
          Archissance harvests its experience through its principals' and associates' excellent
          design abilities, competent technical experience, and vast project portfolio. Our
          approach to projects is enhanced by fostering exciting design, synergy within the
          team, and strong professional ethics.
        </p>
        <p>
          Our staff and associates includes licensed architects, interior architects, and
          computer-aided designers. Our associates are some of the most experienced in the
          industry with decades of experience in their respective professional disciplines.
          Our demonstrated ability to assemble project teams with highly relevant technical
          competencies based on projects unique criteria and set of challenges will yield
          successful projects to our clients. Our clients will benefit from our solid
          relationship with our associates to handle complex projects.
        </p>
      </div>
      <div class="firm-mark col-4 start-9" data-reveal data-reveal-delay="1" aria-hidden="true">
        <img src="assets/img/proc/logo-a-lg.jpg" width="598" height="562" alt="">
      </div>
    </div>
  </section>

  <section class="section" style="background:var(--paper-2)">
    <div class="wrap grid">
      <h2 class="h2 col-4" data-reveal>People</h2>
      <div class="col-8">
        <ul class="people">
          ${people.map(([name, role, note], i) => `<li data-reveal>
            <div class="row2">
              <span class="n">0${i + 1}</span>
              <div>
                <span class="name">${name}</span>
                <span class="role">${role}</span>
                <span class="note">${note}</span>
              </div>
            </div>
          </li>`).join("\n")}
        </ul>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap grid">
      <h2 class="h2 col-4" data-reveal>Who we<br>work for</h2>
      <div class="col-7 start-6" data-reveal data-reveal-delay="1">
        <p class="lead">Private individuals. Corporate entities. Public agencies.</p>
        <p style="margin-top:1.5rem">
          Many of our clients have been with us since the beginning of our professional
          journey. That continuity is the point: it lets us take on complex, long-running
          projects and hold a consistent standard from the first sketch to the final walk-through.
        </p>
      </div>
    </div>
  </section>

  ${ctaPanel()}
</main>
` + footer();
}

/* ---------------------------------------------------------------
   PROJECTS INDEX
   --------------------------------------------------------------- */
function projectsIndex() {
  const order = ["Mixed-Use", "Commercial", "Infrastructure & Industrial", "Residential"];
  const groups = order.map(sec => [sec, projects.filter(p => p.sector === sec)]);
  const catId = name => name.replace(/&amp;|&/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();

  const groupsHtml = groups.map(([sec, list]) => `<div class="index-group" id="${catId(sec)}" data-reveal>
    <div class="index-group-head">
      <h2>${sec}</h2>
      <span class="count">${String(list.length).padStart(2, "0")}</span>
    </div>
    <ul class="work-list">
      ${list.map(p => workRow(p, { twoUp: true })).join("\n")}
    </ul>
  </div>`).join("\n");

  return head({
    title: "Projects — Archissance",
    description: "Projects by Archissance Design Group across California — mixed-use, commercial, infrastructure and industrial, and residential architecture and interiors.",
    path: "projects.html"
  }) + `
<main id="main">
  <section class="hero hero--short">
    <div class="wrap">
      <p class="eyebrow" data-reveal>${projects.length} projects &middot; ${SITE.founded}&ndash;present</p>
      <h1 class="display display--caps hero-title">
        <span class="line-mask"><span>Projects</span></span>
      </h1>
      <p class="measure-wide" data-reveal style="margin-top:2rem;font-size:var(--fs-lead);color:var(--ink-70);line-height:1.42">
        A working catalogue &mdash; mixed-use blocks, retail, water-treatment and
        municipal infrastructure, and homes across California. Built work and current design.
      </p>
    </div>
  </section>

  <section class="section--tight">
    <div class="wrap">
      ${groupsHtml}
    </div>
  </section>

  ${ctaPanel()}
</main>
` + footer();
}

/* ---------------------------------------------------------------
   PROJECT DETAIL
   --------------------------------------------------------------- */
function projectPage(p, others) {
  const P = "../";
  const facts = [
    ["Catalogue", p.catalogue],
    ["Sector", p.sector],
    ["Type", p.type],
    ["Location", p.location],
    ["Client", p.client],
    ["Scope", p.scope],
    ["Status", p.status]
  ].filter(([, v]) => v);
  const bodyHtml = (p.body || []).map(t => `<p>${t}</p>`).join("\n");

  // MAD-style: the first sentence of the summary is a large statement; the rest
  // (never rewritten — just split at the period) reads as prose in the column.
  const sentences = (p.summary || "").split(/(?<=\.)\s+(?=[A-Z0-9])/).filter(Boolean);
  const statement = sentences[0] || "";
  const summaryRest = sentences.slice(1).join(" ");

  // one large image at the top, its own proportions (renders everywhere)
  const heroMedia = p.hero === "video"
    ? `<div class="project-hero" data-reveal>${videoBlock({ ...p.heroVideo, caption: "" }, p.title, P)}</div>`
    : `<figure class="figure project-hero" data-reveal>${picture(p.hero, `${p.title} — ${p.type || p.sector}`, { sizes: "100vw", eager: true, prefix: P })}</figure>`;

  const media = [
    p.beforeAfter ? beforeAfter(p, P) : "",
    elevationStrip(p, P),
    ...(p.videos || []).map(v => videoBlock(v, p.title, P)),
    gallery(p, P),
    // videosEnd: video clips that belong AFTER the photo gallery rather than
    // before it (Sharif Jewelers: cars/pedestrians clip first, then the
    // updated stills, then the storefront walk-through last).
    ...(p.videosEnd || []).map(v => videoBlock(v, p.title, P))
  ].filter(Boolean).join("\n");

  const otherStrip = others.map(o => {
    const t = o.hero === "video" ? (o.heroVideo && o.heroVideo.poster) : o.hero;
    return `<a class="other-card" href="${P}projects/${o.slug}.html">
      <figure class="figure">${picture(t, `${o.title}`, { sizes: "34vw", prefix: P })}</figure>
      <span class="other-name"><span class="cat">${o.catalogue}</span> ${o.title}</span>
    </a>`;
  }).join("\n");

  return head({
    title: `${p.title} — Archissance`,
    description: p.summary || `${p.title} — ${p.type || p.sector} by Archissance Design Group.${p.location ? " " + p.location + "." : p.client ? " " + p.client + "." : ""} ${p.status}.`,
    path: `projects/${p.slug}.html`,
    prefix: P
  }) + `
<main id="main">
  <section class="hero hero--short">
    <div class="wrap">
      <a class="link" href="${P}projects.html" data-reveal><span class="arw" aria-hidden="true" style="transform:rotate(180deg)">&rarr;</span> All projects</a>
      <h1 class="display hero-title" style="max-width:18ch">
        <span class="line-mask"><span>${p.title}</span></span>
      </h1>
    </div>
  </section>

  <section class="project-lede">
    <div class="wrap">
      ${heroMedia}
      ${statement ? `<p class="project-statement" data-reveal>${statement}</p>` : ""}
    </div>
  </section>

  <section class="section--tight">
    <div class="wrap grid">
      <div class="col-6 start-7" data-reveal>
        <p class="project-meta">${p.catalogue}${p.type ? " &nbsp;&middot;&nbsp; " + p.type : ""}${p.location ? " &nbsp;&middot;&nbsp; " + p.location : p.client ? " &nbsp;&middot;&nbsp; " + p.client : ""}</p>
        ${summaryRest ? `<p class="lead">${summaryRest}</p>` : ""}
        ${bodyHtml}
        <dl class="facts">
          ${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("\n")}
        </dl>
      </div>
    </div>
  </section>

  ${media ? `<section class="section--tight"><div class="wrap media-stack">${media}</div></section>` : ""}

  <section class="section other-projects" style="border-top:1px solid var(--line)">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <h2 class="h3">Other projects</h2>
        <a class="link" href="${P}projects.html">All projects <span class="arw" aria-hidden="true">&rarr;</span></a>
      </div>
      <div class="other-strip">
        ${otherStrip}
      </div>
    </div>
  </section>

  ${ctaPanel(P)}
</main>
` + footer(P);
}

/* ---------------------------------------------------------------
   CONTACT
   --------------------------------------------------------------- */
function contact() {
  return head({
    title: "Contact — Archissance",
    description: `Contact Archissance Design Group. Studio at ${SITE.address1}, ${SITE.address2}.`,
    path: "contact.html"
  }) + `
<main id="main">
  <section class="hero hero--short">
    <div class="wrap">
      <p class="eyebrow" data-reveal>Contact</p>
      <h1 class="display display--caps hero-title">
        <span class="line-mask"><span>Start a</span></span>
        <span class="line-mask"><span>project.</span></span>
      </h1>
    </div>
  </section>

  <section class="section--tight">
    <div class="wrap grid">
      <div class="col-4" data-reveal>
        <p class="eyebrow eyebrow--plain muted">Studio</p>
        <p style="margin:0.6rem 0 2rem">
          <a href="${SITE.mapsUrl}" target="_blank" rel="noopener">${SITE.address1}<br>${SITE.address2}</a>
        </p>
        <p class="eyebrow eyebrow--plain muted">Email</p>
        <p style="margin:0.6rem 0 2rem"><a class="link" href="mailto:${SITE.email}">${SITE.email}</a></p>
        <p class="eyebrow eyebrow--plain muted">Phone</p>
        <p style="margin:0.6rem 0 2rem"><a href="tel:${SITE.phoneHref}">${SITE.phoneDisplay}</a></p>
        <p class="eyebrow eyebrow--plain muted">Hours</p>
        <p style="margin:0.6rem 0">Monday&ndash;Friday, 9&ndash;5 PT</p>
      </div>

      <div class="col-7 start-6" data-reveal data-reveal-delay="1">
        <form class="form" method="POST" action="/api/contact" data-contact-form>
          <div class="field">
            <label for="name">Name</label>
            <input id="name" name="name" type="text" autocomplete="name" required>
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" autocomplete="email" required>
          </div>
          <div class="field">
            <label for="type">Project type</label>
            <select id="type" name="project_type">
              <option>Residential &mdash; custom home or estate</option>
              <option>Residential &mdash; multi-family / community</option>
              <option>Mixed-use</option>
              <option>Commercial / retail</option>
              <option>Infrastructure / industrial</option>
              <option>Interior architecture</option>
              <option>Other / not sure yet</option>
            </select>
          </div>
          <div class="field">
            <label for="message">About the project</label>
            <textarea id="message" name="message" rows="5" placeholder="Address, size, timeline, and anything already drawn." required></textarea>
          </div>
          <button class="btn" type="submit">Send enquiry <span class="arw" aria-hidden="true">&rarr;</span></button>
          <p class="form-note" data-contact-status role="status" aria-live="polite">
            Prefer email? Write to <a href="mailto:${SITE.email}">${SITE.email}</a> directly.
          </p>
        </form>
      </div>
    </div>
  </section>
</main>
` + footer();
}

/* ---------------------------------------------------------------
   WRITE
   --------------------------------------------------------------- */
function write(rel, html) {
  const out = join(ROOT, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html.trimStart() + "\n", "utf8");
  console.log("  ✓", rel);
}

console.log("Building Archissance …");
write("index.html", home());
write("firm.html", firm());
write("projects.html", projectsIndex());
write("contact.html", contact());

projects.forEach((p, i) => {
  const others = [];
  for (let k = 1; k <= 6; k++) others.push(projects[(i + k) % projects.length]);
  write(`projects/${p.slug}.html`, projectPage(p, others));
});

console.log(`Done — ${4 + projects.length} pages.`);
