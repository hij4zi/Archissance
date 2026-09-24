/* Headless QA sweep. node build/qa.mjs [baseURL] */
import { chromium } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:4180";
const pages = [
  "index.html", "firm.html", "projects.html", "contact.html",
  "projects/fullerton-mixed-use.html", "projects/1012-j-street.html",
  "projects/chino-hills-residence.html", "projects/bellflower-residences.html",
  "projects/linden-point.html", "projects/irvine-residence-interior.html",
  "projects/sharif-jewelers.html", "projects/metro-fusion.html",
  "projects/powermarket-gas-station.html", "projects/huntington-beach-medical-offices.html",
  "projects/union-city-power-market.html", "projects/montclair-chevron-gas-station.html",
  "projects/the-diamond-ring-company.html", "projects/sharif-jewelers-elk-grove.html",
  "projects/j-huss-custom-jewelry.html", "projects/gold-diamond-center.html",
  "projects/solano-water-treatment.html",
  "projects/ontario-water-treatment-plant-925.html",
  "projects/ontario-water-treatment-plant-well-37-39.html",
  "projects/west-valley-water-treatment-plant.html",
];
const vps = [["desktop", 1440, 900], ["mobile", 390, 844]];
const browser = await chromium.launch();
let problems = 0;
for (const [vp, w, h] of vps) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  for (const p of pages) {
    errs.length = 0;
    const resp = await page.goto(`${base}/${p}`, { waitUntil: "load" });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) {
        scrollTo(0, y); await new Promise(r => setTimeout(r, 90));
      }
      scrollTo(0, 0); await new Promise(r => setTimeout(r, 200));
    });
    const r = await page.evaluate(() => {
      const out = { brokenImg: [], cover: [], collapsed: [], overflowX: false, h1: 0, stale: false };
      // cover is intentional on the full-bleed hero + the list/other-card thumbnails
      // (fixed-aspect crops by design — everything else stays uncropped) and on
      // .video-shell (every source clip is a native 16:9 render matching that
      // shell's own 16:9 box exactly, so cover never actually crops anything —
      // it's there only to close a fractional-pixel rounding gap that `contain`
      // left as a stray black line at one edge).
      const coverOK = ".hero-reel-video, .hero-reel-media, .work-row-media, .other-card, .video-shell";
      document.querySelectorAll("img,video,canvas").forEach(i => {
        if (i.tagName === "IMG" && i.complete && i.naturalWidth === 0) out.brokenImg.push(i.currentSrc || i.src);
        const cs = getComputedStyle(i);
        if (cs.objectFit === "cover" && !i.closest(coverOK)) out.cover.push(i.tagName + " " + (i.className || i.src));
      });
      // regression guard: a big hero/gallery image whose box collapses to ~0
      // height (e.g. aspect-ratio + an absolutely-positioned <picture>, which
      // silently fails on iOS Safari) renders nothing even though the <img>
      // itself loaded fine, so brokenImg above wouldn't catch it.
      document.querySelectorAll(".project-hero, .gallery-item, .figure.elevation").forEach(f => {
        const r = f.getBoundingClientRect();
        if (r.width > 40 && r.height < 8) out.collapsed.push(f.className);
      });
      out.overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;
      out.h1 = document.querySelectorAll("h1").length;
      out.stale = /adenmoor|Zaituna|Zaytuna|PowerMarket|Powermarket|POWERMARKET|Civic &amp; Industrial|Civic & Industrial|Not Selected|Competition Entry/.test(document.documentElement.innerHTML);
      return out;
    });
    const bad = [];
    if (resp.status() >= 400) bad.push(`HTTP ${resp.status()}`);
    if (r.brokenImg.length) bad.push(`broken img: ${r.brokenImg.join(", ")}`);
    if (r.cover.length) bad.push(`object-fit:cover on img: ${r.cover.join(", ")}`);
    if (r.collapsed.length) bad.push(`collapsed media box (image invisible): ${r.collapsed.join(", ")}`);
    if (r.overflowX) bad.push("horizontal overflow");
    if (r.h1 !== 1) bad.push(`${r.h1} h1`);
    if (r.stale) bad.push("stale term (adenmoor / Zaituna title / PowerMarket / old category / competition language) in DOM");
    if (errs.length) bad.push(`JS/console errors: ${errs.slice(0, 3).join(" | ")}`);
    if (bad.length) { problems++; console.log(`✗ [${vp}] ${p}\n    ${bad.join("\n    ")}`); }
  }
  await ctx.close();
}
await browser.close();
console.log(problems ? `\n${problems} page(s) with problems` : `\nALL CLEAN — ${pages.length} pages x ${vps.length} breakpoints`);
