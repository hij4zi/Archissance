/* One-off: reorder the Commercial-sector project blocks in data/projects.json
   so same-scope projects sit consecutively (all jewelry retail together, gas
   stations stay together), and renumber their catalogue codes A-04..A-12 to
   match the new order. Operates on the raw file TEXT (extracting each
   top-level project object as a verbatim block by brace-depth, not via
   JSON.stringify) so the file's existing hand-formatted style (compact inline
   arrays, etc.) is preserved exactly — only the moved blocks and their
   catalogue numbers change. */
import { readFileSync, writeFileSync } from "fs";

const path = "data/projects.json";
const text = readFileSync(path, "utf8");

// find each top-level project object's [start,end) span by brace-depth,
// scanning between the "projects": [ ... ] array bounds.
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

const NEW_COMMERCIAL_ORDER = [
  "sharif-jewelers",
  "sharif-jewelers-elk-grove",
  "the-diamond-ring-company",
  "j-huss-custom-jewelry",
  "huntington-beach-medical-offices",
  "powermarket-gas-station",
  "union-city-power-market",
  "montclair-chevron-gas-station",
  "metro-fusion",
];

for (const slug of NEW_COMMERCIAL_ORDER) {
  if (!bySlug[slug]) throw new Error(`missing expected commercial slug: ${slug}`);
}

// renumber catalogue codes in the moved blocks to A-04..A-12, in new order
const renumbered = NEW_COMMERCIAL_ORDER.map((slug, i) => {
  const code = "A-" + String(i + 4).padStart(2, "0");
  return bySlug[slug].replace(/"catalogue":\s*"A-\d+"/, `"catalogue": "${code}"`);
});

// rebuild the full block list: keep every non-commercial block in its
// original position, but splice the reordered commercial set in starting at
// the position of the FIRST commercial block currently in the array.
const firstCommercialIndex = blocks.findIndex(b => NEW_COMMERCIAL_ORDER.includes(slugOf(b)));
const nonCommercial = blocks.filter(b => !NEW_COMMERCIAL_ORDER.includes(slugOf(b)));
const finalBlocks = [
  ...nonCommercial.slice(0, firstCommercialIndex),
  ...renumbered,
  ...nonCommercial.slice(firstCommercialIndex),
];

// reassemble: preserve original inter-block whitespace/comma style by just
// joining with ",\n    " to match the file's existing 4-space-indented,
// comma-separated block layout.
const newBody = "\n    " + finalBlocks.join(",\n    ") + "\n  ";
const newText = text.slice(0, arrStart) + newBody + text.slice(arrEnd);

writeFileSync(path, newText, "utf8");
console.log(`Reordered ${NEW_COMMERCIAL_ORDER.length} commercial projects, ${finalBlocks.length} total blocks written.`);
