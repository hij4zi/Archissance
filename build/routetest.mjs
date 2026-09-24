/* Full routing + hero + overlay audit.  node build/routetest.mjs [baseURL] */
import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:4180";
const browser = await chromium.launch();
let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? "PASS" : "FAIL"}  ${m}`); if (!c) fails++; };

for (const [label, vp, motion] of [
  ["mobile", { width: 390, height: 844 }, "no-preference"],
  ["mobile-reduce", { width: 390, height: 844 }, "reduce"],
  ["desktop", { width: 1440, height: 900 }, "no-preference"],
]) {
  console.log(`\n===== ${label} (${vp.width}x${vp.height}, motion:${motion}) =====`);
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: motion, hasTouch: label.startsWith("mobile"), isMobile: label.startsWith("mobile") });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  const go = async (p) => { await page.goto(`${base}/${p}`, { waitUntil: "load" }); await page.waitForTimeout(1400); };

  // ---- HERO (autoplay + loop video) ----
  await go("index.html");
  await page.waitForTimeout(1600);
  let h = await page.evaluate(() => {
    const v = document.querySelector(".hero-reel-video");
    return {
      videos: document.querySelectorAll(".hero-reel-video").length,
      scrubLeftovers: document.querySelectorAll(".hero-scrub, .hero-scrub-pin, .hero-scrub-canvas").length,
      h1: document.querySelectorAll("h1").length,
      hasChapters: document.querySelectorAll("[data-cine-chapter],.hero-cine-chapter").length,
      fit: v && getComputedStyle(v).objectFit,
      pe: v && getComputedStyle(v).pointerEvents,
      loop: v && v.loop,
      sectionH: document.querySelector(".hero-reel").offsetHeight,
    };
  });
  ok(h.videos === 1, `hero has exactly ONE video (${h.videos})`);
  ok(h.scrubLeftovers === 0, `no scroll-scrub markup left (${h.scrubLeftovers})`);
  ok(h.hasChapters === 0, `no multi-chapter / slideshow markup left (${h.hasChapters})`);
  ok(h.h1 === 1, `one <h1> (${h.h1})`);
  ok(h.fit === "cover", `hero video is object-fit:cover (${h.fit})`);
  ok(h.pe === "none", `hero video is pointer-events:none (${h.pe})`);

  // it should be playing on its own and advancing, in both motion modes
  const t0 = await page.evaluate(() => { const v = document.querySelector(".hero-reel-video"); return { t: v.currentTime, paused: v.paused }; });
  await page.waitForTimeout(1400);
  const t1 = await page.evaluate(() => { const v = document.querySelector(".hero-reel-video"); return { t: v.currentTime, paused: v.paused }; });
  ok(!t1.paused && t1.t > t0.t + 0.3, `hero autoplays and advances (t ${t0.t.toFixed(2)}→${t1.t.toFixed(2)}, paused ${t1.paused})`);
  ok(h.loop === true, `hero loops`);

  // scroll past the hero: it must not cover content
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const afterHero = await page.evaluate(() => {
    const sec = document.querySelector(".hero-reel");
    const r = sec.getBoundingClientRect();
    const probe = (x, y) => { const el = document.elementFromPoint(x, y); return el ? el.tagName + "." + (typeof el.className === "string" ? el.className.split(" ")[0] : "") : "null"; };
    return { bottom: Math.round(r.bottom), top: Math.round(r.top),
      atCenter: probe(Math.round(innerWidth / 2), Math.round(innerHeight / 2)),
      atFooterArea: probe(Math.round(innerWidth / 2), Math.round(innerHeight - 60)) };
  });
  ok(afterHero.bottom <= 5 || afterHero.top > vp.height, `hero section scrolled away (bottom ${afterHero.bottom}, top ${afterHero.top})`);
  ok(!/hero-reel/.test(afterHero.atCenter + afterHero.atFooterArea), `no hero layer at page-center / lower probes (${afterHero.atCenter}, ${afterHero.atFooterArea})`);

  // ---- TOP NAV ----
  await go("index.html");
  if (label.startsWith("mobile")) {
    await page.tap(".nav-toggle"); await page.waitForTimeout(400);
    ok(await page.evaluate(() => document.body.classList.contains("nav-open")), "mobile menu opens");
    // regression guard: a transform/will-change on .site-header can make it the
    // containing block for the fixed .nav, squashing the open menu into the
    // header's box (all links pushed off-screen except a couple near the top)
    const navFit = await page.evaluate(() => {
      const n = document.querySelector(".nav"), r = n.getBoundingClientRect();
      const links = [...n.querySelectorAll("a")].map(a => a.getBoundingClientRect());
      return { fillsViewport: r.height >= innerHeight - 2, allLinksVisible: links.every(lr => lr.top >= 0 && lr.bottom <= innerHeight) };
    });
    ok(navFit.fillsViewport && navFit.allLinksVisible, `open mobile menu fills the viewport, every link visible (${JSON.stringify(navFit)})`);
  }
  for (const [href, name] of [["projects.html", "Projects"], ["firm.html", "Firm"], ["contact.html", "Contact"]]) {
    await go("index.html");
    if (label.startsWith("mobile")) { await page.tap(".nav-toggle"); await page.waitForTimeout(350); }
    await page.click(`.nav a[href="${href}"]`);
    await page.waitForTimeout(900);
    const landed = page.url().endsWith("/" + href);
    const closed = !(await page.evaluate(() => document.body.classList.contains("nav-open")));
    ok(landed, `nav "${name}" -> ${href} (got ${page.url().split("/").pop()})`);
    ok(closed, `menu closed after "${name}"`);
  }

  // ---- PROJECT LIST ROWS (Foster-style) ----
  await go("index.html");
  const homeRows = await page.$$eval("#work .work-row-link", els => els.map(e => e.getAttribute("href")));
  ok(homeRows.length === 4 && homeRows.every(h => /^projects\/[a-z0-9-]+\.html$/.test(h)), `home Selected work: 4 rows, valid slugs`);
  for (const rh of homeRows.slice(0, 2)) {
    await go("index.html");
    const el = await page.$(`#work .work-row-link[href="${rh}"] .work-row-title`);
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await el.click();
    await page.waitForTimeout(900);
    ok(page.url().endsWith(rh), `home row title-click -> ${rh} (got ${page.url().split("/").pop()})`);
  }
  // projects index rows
  await go("projects.html");
  const rows = await page.$$eval(".work-row-link", els => els.map(e => e.getAttribute("href")));
  ok(rows.length === 20 && rows.every(h => /^projects\/[a-z0-9-]+\.html$/.test(h)), `20 project rows, all valid slugs`);
  for (const rh of rows.slice(0, 3).concat(rows.slice(-1))) {
    await go("projects.html");
    await page.click(`.work-row-link[href="${rh}"]`);
    await page.waitForTimeout(800);
    ok(page.url().endsWith(rh), `projects row -> ${rh} (got ${page.url().split("/").pop()})`);
  }

  // ---- WHAT WE DO ----
  await go("index.html");
  const wwd = await page.$$eval(".sector-list a", els => els.map(e => ({ href: e.getAttribute("href"), name: e.querySelector(".name").textContent.trim() })));
  ok(wwd.length === 4, `4 "What we do" links`);
  for (const item of wwd) {
    await go("index.html");
    await page.click(`.sector-list a[href="${item.href}"]`);
    await page.waitForTimeout(900);
    const st = await page.evaluate((hash) => {
      const id = hash.replace(/^.*#/, "");
      const sec = document.getElementById(id);
      if (!sec) return { found: false };
      const r = sec.getBoundingClientRect();
      return { found: true, id, top: Math.round(r.top), belowHeader: r.top >= 0 && r.top < 220, headingText: (sec.querySelector("h2") || {}).textContent };
    }, item.href);
    ok(page.url().includes("projects.html#"), `"${item.name}" -> ${item.href} (url ${page.url().split("/").pop()})`);
    ok(st.found && st.belowHeader, `"${item.name}" scrolled category "${st.headingText}" into view, clear of header (top ${st.top})`);
  }

  // ---- LINDEN POINT category ----
  await go("projects.html");
  const linden = await page.evaluate(() => {
    const row = [...document.querySelectorAll(".work-row-link")].find(a => /linden-point/.test(a.getAttribute("href")));
    const group = row && row.closest(".index-group");
    return { inGroup: group && group.id, groupHeading: group && group.querySelector("h2").textContent, count: document.querySelectorAll('.work-row-link[href*="linden-point"]').length };
  });
  ok(linden.inGroup === "mixed-use" && linden.groupHeading === "Mixed-Use", `Linden Point is under Mixed-Use (group "${linden.groupHeading}")`);
  ok(linden.count === 1, `Linden Point appears once on Projects page (${linden.count})`);
  await go("projects/linden-point.html");
  const lp = await page.evaluate(() => document.body.innerText);
  ok(/Mixed-Use/.test(lp) && !/Residential/.test(lp.split("Linden Point")[1] || ""), `Linden Point detail page shows Mixed-Use, not Residential`);

  // ---- BACK / FORWARD ----
  await go("index.html");
  if (label.startsWith("mobile")) { await page.tap(".nav-toggle"); await page.waitForTimeout(300); }
  await page.click('.nav a[href="projects.html"]'); await page.waitForTimeout(700);
  await page.click('.work-row-link'); await page.waitForTimeout(700);
  const atProject = page.url().split("/").pop();
  await page.goBack(); await page.waitForTimeout(700);
  const back1 = page.url().split("/").pop();
  await page.goBack(); await page.waitForTimeout(700);
  const back2 = page.url().split("/").pop();
  await page.goForward(); await page.waitForTimeout(700);
  const fwd = page.url().split("/").pop();
  ok(back1 === "projects.html" && back2 === "index.html" && fwd === "projects.html", `back/forward: ${atProject} <- ${back1} <- ${back2} -> ${fwd}`);

  ok(errs.length === 0, `no console / page errors  ${errs.length ? JSON.stringify(errs.slice(0, 3)) : ""}`);
  await ctx.close();
}
await browser.close();
console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}`);
process.exit(fails ? 1 : 0);
