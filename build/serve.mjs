/* Minimal static server WITH HTTP Range support — needed to test the
   scroll-scrubbed hero video locally (Python's http.server ignores Range,
   which makes <video> report seekable=[0,0]). Real static hosts
   (Netlify / Vercel / S3 / nginx / Cloudflare) all support Range.

   node build/serve.mjs [port]            ->  http://127.0.0.1:4180
*/
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PORT = Number(process.argv[2]) || 4180;
const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".mp4": "video/mp4", ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ""));
  let st;
  try { st = statSync(file); if (st.isDirectory()) throw 0; }
  catch { res.writeHead(404, { "content-type": "text/plain" }); return res.end("404"); }

  const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
    let start = m[1] ? parseInt(m[1], 10) : 0;
    let end = m[2] ? parseInt(m[2], 10) : st.size - 1;
    if (isNaN(start) || start < 0) start = 0;
    if (isNaN(end) || end >= st.size) end = st.size - 1;
    if (start > end) { res.writeHead(416, { "content-range": `bytes */${st.size}` }); return res.end(); }
    res.writeHead(206, {
      "content-type": type,
      "content-range": `bytes ${start}-${end}/${st.size}`,
      "accept-ranges": "bytes",
      "content-length": end - start + 1,
      "cache-control": "no-cache"
    });
    createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "content-type": type,
      "content-length": st.size,
      "accept-ranges": "bytes",
      "cache-control": "no-cache"
    });
    createReadStream(file).pipe(res);
  }
}).listen(PORT, "127.0.0.1", () => console.log(`serving ${ROOT}\n-> http://127.0.0.1:${PORT}  (Range-enabled)`));
