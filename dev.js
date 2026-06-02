import { file } from "bun";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "src");
const PORT = 5173;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    const safe = normalize(path).replace(/^(\.\.[\/\\])+/, "");
    const filePath = join(ROOT, safe);
    const f = file(filePath);
    if (!(await f.exists())) return new Response("Not found", { status: 404 });
    return new Response(f);
  },
});

console.log(`Dev server: http://localhost:${PORT}`);
