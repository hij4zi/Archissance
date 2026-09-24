/* One-off audit: simulate the .gallery CSS auto-placement (2-col grid, with
   .gallery-item:first-child:nth-last-child(odd) auto-spanning the first item
   full-width whenever the image count is odd, and explicit wide:true spanning
   full-width wherever it falls) to find (a) orphaned lone items left with an
   empty gap beside them, and (b) paired items whose aspect ratios differ
   enough to visibly misalign (mismatched row height). */
import projectsData from "../data/projects.json" with { type: "json" };
import manifest from "../assets/img/proc/manifest.json" with { type: "json" };

const ASPECT_MISMATCH_THRESHOLD = 0.06; // 6% relative height difference at equal column width

for (const p of projectsData.projects) {
  const images = p.images || [];
  if (images.length < 2) continue; // 0-1 images can't misalign
  const items = images.map(entry => {
    const name = typeof entry === "string" ? entry : entry.name;
    const wide = typeof entry === "object" && entry.wide === true;
    const dim = manifest[name];
    return { name, wide, aspect: dim ? dim[0] / dim[1] : null };
  });

  const N = items.length;
  let col = 1; // next free column (1 or 2)
  let pending = null; // item sitting alone in column 1, awaiting a partner
  const issues = [];
  const pairs = [];

  items.forEach((item, i) => {
    const isFull = item.wide || (i === 0 && N % 2 === 1);
    if (isFull) {
      if (col === 2 && pending) {
        issues.push(`ORPHAN: "${pending.name}" left alone (empty gap beside it) because "${item.name}" forces a new row`);
      }
      pending = null;
      col = 1;
    } else {
      if (col === 1) {
        pending = item;
        col = 2;
      } else {
        pairs.push([pending, item]);
        pending = null;
        col = 1;
      }
    }
  });
  if (col === 2 && pending) {
    issues.push(`ORPHAN: "${pending.name}" is the last item, alone with an empty gap beside it`);
  }

  for (const [a, b] of pairs) {
    if (a.aspect == null || b.aspect == null) continue;
    const diff = Math.abs(a.aspect - b.aspect) / Math.max(a.aspect, b.aspect);
    if (diff > ASPECT_MISMATCH_THRESHOLD) {
      issues.push(`ROW MISMATCH: "${a.name}" (${a.aspect.toFixed(3)}) + "${b.name}" (${b.aspect.toFixed(3)}) paired — ${(diff*100).toFixed(1)}% height difference`);
    }
  }

  if (issues.length) {
    console.log(`\n${p.slug} (${p.title}) — ${N} images:`);
    issues.forEach(msg => console.log("  " + msg));
  }
}
console.log("\ndone");
