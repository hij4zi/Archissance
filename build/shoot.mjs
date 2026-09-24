/* Headless screenshots for visual QA. node build/shoot.mjs [baseURL]
   Requires: npm i -D playwright  &&  npx playwright install chromium */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] || "http://127.0.0.1:4181";
const OUT = "build/shots";
mkdirSync(OUT, { recursive: true });

const shots = [
  ["index.html", "home"],
  ["projects.html", "projects"],
  ["firm.html", "firm"],
  ["contact.html", "contact"],
  ["projects/fullerton-mixed-use.html", "project-fullerton"],
  ["projects/1012-j-street.html", "project-1012-j-street"],
  ["projects/chino-hills-residence.html", "project-chino-hills"],
  ["projects/bellflower-residences.html", "project-bellflower"],
  ["projects/linden-point.html", "project-linden"],
  ["projects/irvine-residence-interior.html", "project-irvine"],
  ["projects/sharif-jewelers.html", "project-sharif"],
  ["projects/metro-fusion.html", "project-metrofusion"],
  ["projects/powermarket-gas-station.html", "project-powermarket"],
  ["projects/solano-water-treatment.html", "project-solano"],
  ["projects/ontario-water-treatment-plant-925.html", "project-ontario925"],
  ["projects/ontario-water-treatment-plant-well-37-39.html", "project-ontario3739"],
  ["projects/west-valley-water-treatment-plant.html", "project-westvalley"]
];

const viewports = [
  ["desktop", 1440, 900],
  ["mobile", 390, 844]
];

const browser = await chromium.launch();
for (const [vp, w, h] of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2,
    reducedMotion: "no-preference"
  });
  const page = await ctx.newPage();
  for (const [path, name] of shots) {
    await page.goto(`${base}/${path}`, { waitUntil: "load" });
    // slow scroll pass to trigger lazy-load + reveal + line-draw
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.6;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 220));
      }
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 500));
    });
    await page.waitForLoadState("load");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${name}-${vp}.png`, fullPage: true });
    console.log("  ✓", `${name}-${vp}.png`);
  }
  await ctx.close();
}
await browser.close();
console.log("shots in", OUT);
