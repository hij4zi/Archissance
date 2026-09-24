import { chromium } from "playwright";
const browser = await chromium.launch();

async function test(vp, label) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: vp.width < 768, hasTouch: vp.width < 768 });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:4180/index.html", { waitUntil: "load" });
  await page.waitForTimeout(100);
  const initial = await page.evaluate(() => {
    return [...document.querySelectorAll(".work-row")].map(el => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), isIn: el.classList.contains("is-in") };
    });
  });
  console.log(label, "AT LOAD (before scroll):", JSON.stringify(initial));
  // scroll to bring the work rows into view, watch for transition
  await page.evaluate(() => window.scrollTo(0, document.querySelector(".work-row")?.getBoundingClientRect().top + window.scrollY - 400));
  await page.waitForTimeout(50);
  const justAfterScroll = await page.evaluate(() => [...document.querySelectorAll(".work-row")].map(el => el.classList.contains("is-in")));
  await page.waitForTimeout(500);
  const afterSettle = await page.evaluate(() => [...document.querySelectorAll(".work-row")].map(el => el.classList.contains("is-in")));
  console.log(label, "isIn right after scroll:", justAfterScroll, " after 500ms:", afterSettle);
  await ctx.close();
}

await test({ width: 1440, height: 900 }, "DESKTOP");
await test({ width: 390, height: 844 }, "MOBILE");
await browser.close();
