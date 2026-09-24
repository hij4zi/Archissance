/* One-off: reorder the Mixed-Use-sector project blocks in data/projects.json
   per user request (Fullerton, then Linden Point, then 1012 J Street), and
   renumber their catalogue codes A-01..A-03 to match. Same brace-depth
   text-extraction approach as build/reorder_commercial.mjs, to preserve the
   file's exact hand-formatted style. */
import { readFileSync, writeFileSync } from "fs";

const path = "data/projects.json";
const text = readFileSync(path, "utf8");

const arrStart = text.indexOf("\"projects\": [") + "\"projects\": [".length;
const arrEnd = text.lastIndexOf("]");
const body = text.slice(arrStart, arrEnd);

const blocks = [];
let depth = 0, start = -1;
for (let i = 0; i < body.length; i++) {
  const c = body[i];
  if (c === "{") { if (depth === 0) start = i; depth++; }
  else if (c === "}") { depth--; if (depth === 0) blocks.push(body.slice(start, i + 1)); }
}

const slugOf = b => (b.match(/"slug":\s*"([^"]+)"/) || [])[1];
const bySlug = Object.fromEntries(blocks.map(b => [slugOf(b), b]));

const NEW_MIXEDUSE_ORDER = [
  "fullerton-mixed-use",
  "linden-point",
  "1012-j-street",
];

for (const slug of NEW_MIXEDUSE_ORDER) {
  if (!bySlug[slug]) throw new Error(`missing expected mixed-use slug: ${slug}`);
}

const renumbered = NEW_MIXEDUSE_ORDER.map((slug, i) => {
  const code = "A-" + String(i + 1).padStart(2, "0");
  return bySlug[slug].replace(/"catalogue":\s*"A-\d+"/, `"catalogue": "${code}"`);
});

const firstIndex = blocks.findIndex(b => NEW_MIXEDUSE_ORDER.includes(slugOf(b)));
const nonMixedUse = blocks.filter(b => !NEW_MIXEDUSE_ORDER.includes(slugOf(b)));
const finalBlocks = [
  ...nonMixedUse.slice(0, firstIndex),
  ...renumbered,
  ...nonMixedUse.slice(firstIndex),
];

const newBody = "\n    " + finalBlocks.join(",\n    ") + "\n  ";
const newText = text.slice(0, arrStart) + newBody + text.slice(arrEnd);

writeFileSync(path, newText, "utf8");
console.log(`Reordered ${NEW_MIXEDUSE_ORDER.length} mixed-use projects, ${finalBlocks.length} total blocks written.`);
