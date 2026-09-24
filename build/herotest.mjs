/* Home hero — verify the ONE clip autoplays + loops, full-bleed (object-fit:
   cover, fills the viewport), every layer pointer-events:none, holds a still
   frame under reduced-motion, and never covers content once scrolled past.
   Runs in Chromium AND WebKit.   node build/herotest.mjs [baseURL] */
import { chromium, webkit } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:4180";
let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? "PASS" : "FAIL"}  ${m}`); if (!c) fails++; };

for (const [engName, launcher] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await launcher.launch();
  for (const motion of ["no-preference", "reduce"]) {
    for (const [label, vp] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
      console.log(`\n== ${engName}  motion:${motion}  ${label} ${vp.width}x${vp.height} ==`);
      const ctx = await browser.newContext({ viewport: vp, reducedMotion: motion, hasTouch: label === "mobile", isMobile: label === "mobile" && engName === "chromium" });
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", e => errs.push(String(e)));
      page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
      await page.goto(`${base}/index.html`, { waitUntil: "load" });
      await page.waitForTimeout(2200);

      const meta = await page.evaluate(() => {
        const v = document.querySelector(".hero-reel-video");
        const sec = document.querySelector(".hero-reel");
        const r = v.getBoundingClientRect();
        return {
          videos: document.querySelectorAll(".hero-reel-video").length,
          scrubLeftovers: document.querySelectorAll(".hero-scrub,.hero-scrub-pin,.hero-scrub-canvas,[data-hero-scrub]").length,
          chapters: document.querySelectorAll("[data-cine-chapter],.hero-cine-chapter,[data-cine-media]").length,
          h1: document.querySelectorAll("h1").length,
          fit: getComputedStyle(v).objectFit,
          pe: getComputedStyle(v).pointerEvents,
          fills: r.width >= innerWidth - 2 && r.height >= innerHeight - 2,
          secH: sec.offsetHeight,
          loop: v.loop,
        };
      });
      ok(meta.videos === 1 && meta.chapters === 0 && meta.scrubLeftovers === 0, `exactly ONE hero clip, no scrub / chapter markup (v${meta.videos} scrub${meta.scrubLeftovers} ch${meta.chapters})`);
      ok(meta.h1 === 1, `one <h1>`);
      ok(meta.fit === "cover" && meta.fills, `hero video full-bleed (fit ${meta.fit}, fills ${meta.fills})`);
      ok(meta.pe === "none", `hero video is pointer-events:none`);

      const s0 = await page.evaluate(() => { const v = document.querySelector(".hero-reel-video"); return { t: v.currentTime, paused: v.paused, rs: v.readyState }; });
      await page.waitForTimeout(1600);
      const s1 = await page.evaluate(() => {
        const v = document.querySelector(".hero-reel-video");
        return { t: v.currentTime, paused: v.paused, anim: getComputedStyle(v).animationName };
      });
      // the owner wants it playing regardless of reduced-motion — only the
      // CSS "drift" animation is suppressed there.
      ok(!s1.paused && s1.t > s0.t + 0.4, `hero autoplays + advances (t ${s0.t.toFixed(2)}→${s1.t.toFixed(2)}, rs${s0.rs})`);
      ok(meta.loop === true, `hero loops`);
      if (motion === "reduce") ok(s1.anim === "none", `reduced-motion: CSS drift animation off (${s1.anim})`);
      else ok(s1.anim === "hero-drift", `drift animation active (${s1.anim})`);

      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const after = await page.evaluate(() => {
        const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        const r = document.querySelector(".hero-reel").getBoundingClientRect();
        return { hit: el ? (el.className && el.className.split ? el.className.split(" ")[0] : el.tagName) : "null", off: r.bottom <= 2 || r.top >= innerHeight };
      });
      ok(after.off && !/hero-reel/.test(after.hit), `hero not covering content after its section (center hit: ${after.hit})`);
      ok(errs.length === 0, `no console / page errors ${errs.length ? JSON.stringify(errs.slice(0, 2)) : ""}`);

      if (motion === "no-preference") {
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(500);
        await page.screenshot({ path: `build/shots/hero-${engName}-${label}.png` });
      }
      await ctx.close();
    }
  }
  await browser.close();
}
console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}`);
process.exit(fails ? 1 : 0);
