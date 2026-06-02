import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SRC = "src";
const OUT = ".";
if (OUT !== ".") mkdirSync(OUT, { recursive: true });

const bundled = spawnSync("bunx", ["esbuild", "src/game.js", "--bundle", "--format=iife", "--target=es2020"], {
  encoding: "utf8",
  shell: true,
});
if (bundled.status !== 0) {
  console.error(bundled.stderr);
  process.exit(1);
}
const js = bundled.stdout;

const html = readFileSync(join(SRC, "index.html"), "utf8");
const css  = readFileSync(join(SRC, "style.css"), "utf8");

let out = html;
out = out.replace(/<link rel="stylesheet" href="style\.css"\s*\/?>/, `<style>\n${css}\n</style>`);
out = out.replace(/<script type="module" src="game\.js"><\/script>/, `<script>\n${js}\n</script>`);

writeFileSync(join(OUT, "index.html"), out, "utf8");
console.log(`Wrote ${OUT}/index.html (${Math.round(out.length / 1024)} KB)`);
