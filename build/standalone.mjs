/* Bundle the WHOLE built site into ONE self-contained HTML file.
   - every page's <main> becomes a hash route (#/, #/projects, #/firm,
     #/contact, #/projects/<slug>); a tiny router shows one at a time
   - CSS / JS / GSAP inlined; images inlined (the small -sm variants);
     the hero clip inlined as a data: URI (Chromium scrubs it; Safari can't
     decode a large data: video and shows the poster there)
   - all internal links rewritten to hash routes so navigation works offline

   node build/standalone.mjs
     -> build/index.standalone.html   (full <!doctype> document)
     -> build/index.artifact.html     (head-less fragment for Artifact publish)
*/
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = p => readFileSync(join(ROOT, p));
const text = p => readFileSync(join(ROOT, p), "utf8");
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".mp4": "video/mp4" };
const dataURI = p => `data:${MIME[extname(p)] || "application/octet-stream"};base64,${read(p).toString("base64")}`;
const sub = (s, find, repl) => s.split(find).join(repl);          // literal replace, no $-substitution
const mainInner = html => (html.match(/<main[^>]*>([\s\S]*?)<\/main>/) || [, ""])[1];
const between = (html, open, close) => { const a = html.indexOf(open); const b = html.indexOf(close, a); return a < 0 ? "" : html.slice(a, b + close.length); };

const data = JSON.parse(text("data/projects.json"));

/* ---- routes: file -> hash path ---- */
const routes = [
  { file: "index.html", path: "/" },
  { file: "projects.html", path: "/projects" },
  { file: "firm.html", path: "/firm" },
  { file: "contact.html", path: "/contact" },
  ...data.projects.map(p => ({ file: `projects/${p.slug}.html`, path: `/projects/${p.slug}` })),
];

/* ---- shared chrome from the home page ---- */
const home = text("index.html");
const headBits = [
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="theme-color" content="#f6f4ef">',
  (home.match(/<link rel="preconnect"[^>]*>/g) || []).join("\n"),
  (home.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/) || [""])[0],
].join("\n");
const header = between(home, "<header", "</header>");
const footer = between(home, "<footer", "</footer>");

/* ---- assemble the route sections ---- */
const sections = routes.map(r => {
  const inner = mainInner(text(r.file));
  const hidden = r.path === "/" ? "" : " hidden";
  return `<section class="route" data-route="${r.path}"${hidden}>\n${inner}\n</section>`;
}).join("\n");

let body = `${header}\n<div id="app">\n${sections}\n</div>\n${footer}`;

/* ---- rewrite every internal link to a hash route ---- */
body = body
  .replace(/href="(?:\.\.\/)?index\.html"/g, 'href="#/"')
  .replace(/href="(?:\.\.\/)?projects\.html#([a-z0-9-]+)"/g, 'href="#/projects#$1"')
  .replace(/href="(?:\.\.\/)?projects\.html"/g, 'href="#/projects"')
  .replace(/href="(?:\.\.\/)?firm\.html"/g, 'href="#/firm"')
  .replace(/href="(?:\.\.\/)?contact\.html"/g, 'href="#/contact"')
  .replace(/href="(?:\.\.\/)?projects\/([a-z0-9-]+)\.html"/g, 'href="#/projects/$1"')
  .replace(/href="#main"/g, 'href="#/"');

/* ---- normalise asset paths, drop responsive plumbing, use the -sm images ---- */
body = body
  .replace(/\.\.\/assets\//g, "assets/")
  .replace(/\s*<source type="image\/webp"[^>]*>/g, "")
  .replace(/\s+(?:srcset|sizes)="[^"]*"/g, "")
  .replace(/assets\/img\/proc\/([a-z0-9-]+)-lg\.(jpg|webp)/g, "assets/img/proc/$1-sm.$2");

/* Videos: every clip is inlined as a data: URI on a real <video autoplay loop
   muted playsinline>, using the small re-encodes in build/bundle-video/ (960 px,
   ~300-800 KB each) so the whole set fits under the 16 MB artifact cap.
   Chromium plays them; WebKit/iOS won't decode a data: video and falls back to
   the (also inlined) first-frame poster — an acceptable degrade for a preview.
   A <video> with no <source> still becomes a plain <img class="bundle-still">. */
const bundleVid = f => {
  const small = join("build", "bundle-video", f);
  return dataURI(existsSync(join(ROOT, small)) ? small : join("assets", "video", f));
};
const posterURI = smPath => existsSync(join(ROOT, smPath)) ? dataURI(smPath) : "";
body = body
  .replace(/<video class="hero-reel-video"[\s\S]*?<\/video>/,
    `<video class="hero-reel-video" autoplay loop muted playsinline ` +
    `poster="${posterURI("assets/img/proc/linden-hero-vframe-sm.jpg")}" src="${bundleVid("linden-hero.mp4")}" ` +
    `aria-label="Linden Point — render fly-through"></video>`)
  .replace(/<video\b(?![^>]*\bhero-reel-video\b)[^>]*?poster="(assets\/img\/proc\/[a-z0-9-]+-sm\.jpg)"[^>]*>([\s\S]*?)<\/video>/g,
    (m, poster, inner) => {
      const src = (inner.match(/src="assets\/video\/([^"]+)"/) || [])[1];
      if (!src) return `<img class="bundle-still" src="${posterURI(poster)}" alt="" loading="lazy">`;
      return `<video class="bundle-vid" autoplay loop muted playsinline ` +
        `poster="${posterURI(poster)}" src="${bundleVid(src)}"></video>`;
    });

/* ---- inline every unique image ONCE into a shared map (string-replacing each
   data: URI in place would duplicate the base64 for images used on many pages) ----
   Same idea as bundleVid above: a handful of dense, busy renders (or, per this
   round, a couple of technical drawings) can each cost 150-300KB even at -sm,
   enough on their own to push the whole bundle over its 16MB cap. Rather than
   degrading assets/img/proc/*-sm.jpg itself — which the real multi-page site
   also serves, on narrower/2x-DPR viewports, so that quietly shipped blurry
   images to real visitors too — an extra-compressed copy for JUST the bundle
   lives in build/bundle-img/<key>.jpg (see build/bundle_images.py) and is
   preferred here when present; the real site's own -sm.jpg is never touched. */
const used = [...new Set([...body.matchAll(/assets\/img\/proc\/[a-z0-9-]+-sm\.jpg/g)].map(x => x[0]))]
  .filter(p => existsSync(join(ROOT, p)));
const key = p => p.replace("assets/img/proc/", "").replace("-sm.jpg", "");
const bundleImg = p => {
  const small = join("build", "bundle-img", key(p) + ".jpg");
  return dataURI(existsSync(join(ROOT, small)) ? small : p);
};
used.forEach(p => { body = sub(body, 'src="' + p + '"', 'data-img="' + key(p) + '"'); });
const imgMap = "{" + used.map(p => JSON.stringify(key(p)) + ':"' + bundleImg(p) + '"').join(",") + "}";
const hydrate = `<script>(function(){var M=${imgMap};` +
  `document.querySelectorAll("[data-img]").forEach(function(e){e.src=M[e.getAttribute("data-img")]||e.src;});` +
  `})();</script>`;

/* ---- inline styles + scripts ---- */
const css = text("assets/css/main.css") + `
/* ---- bundle-only: hash-router pages + solid header on inner routes ---- */
.route[hidden] { display: none !important; }
.site-header.route-inner::before { opacity: 1; }
.site-header.route-inner { border-color: var(--line); background: transparent; }
.site-header.route-inner .brand,
.site-header.route-inner .nav a { color: var(--ink); }
.site-header.route-inner .nav a[aria-current="page"] { color: var(--red-ink); }
.site-header.route-inner .nav-toggle span { background: var(--ink); }
.video-shell .bundle-vid,
.video-shell .bundle-still,
.figure .bundle-still { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: block; }
`;
const scripts =
  `<script>\n${text("assets/vendor/gsap.min.js")}\n</script>\n` +
  `<script>\n${text("assets/vendor/ScrollTrigger.min.js")}\n</script>\n` +
  `<script>\n${text("assets/js/main.js")}\n</script>\n` +
  `<script>\n${text("build/router.js")}\n</script>`;

/* ---- outputs ---- */
const fragment = `<style>\n${css}\n</style>\n${headBits}\n${body}\n${hydrate}\n${scripts}`;
const doc =
`<!doctype html>
<html lang="en" class="js">
<head>
<title>Archissance</title>
<meta name="description" content="Archissance Design Group — a multi-discipline architecture and interior architecture studio in Costa Mesa, California.">
${headBits}
<style>
${css}
</style>
</head>
<body>
${body}
${hydrate}
${scripts}
</body>
</html>`;

writeFileSync(join(ROOT, "build", "index.standalone.html"), doc, "utf8");
writeFileSync(join(ROOT, "build", "index.artifact.html"), fragment, "utf8");

const mb = n => (Buffer.byteLength(n) / 1048576).toFixed(2);
const styleTags = (fragment.match(/<\/style>/g) || []).length;
if (styleTags !== 1) console.warn(`!! fragment has ${styleTags} </style> tags — expected 1 (a stray one breaks parsing)`);
console.log(`routes:        ${routes.length}`);
console.log(`build/index.standalone.html  ${mb(doc)} MB`);
console.log(`build/index.artifact.html   ${mb(fragment)} MB   (${styleTags === 1 ? "one" : styleTags + " (!)"} <style>)`);
