import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import * as esbuild from "esbuild";

const SRC = "src";
const OUT = ".";
if (OUT !== ".") mkdirSync(OUT, { recursive: true });

// Bundle via esbuild's Node API (works under both `node build.js` and `bun build.js`;
// no reliance on `bunx` being on PATH).
const bundled = esbuild.buildSync({
  entryPoints: ["src/game.js"],
  bundle: true,
  format: "iife",
  target: "es2020",
  write: false,
});
const js = bundled.outputFiles[0].text;

const html = readFileSync(join(SRC, "index.html"), "utf8");
const css  = readFileSync(join(SRC, "style.css"), "utf8");

let out = html;
out = out.replace(/<link rel="stylesheet" href="style\.css"\s*\/?>/, `<style>\n${css}\n</style>`);
out = out.replace(/<script type="module" src="game\.js"><\/script>/, `<script>\n${js}\n</script>`);

writeFileSync(join(OUT, "index.html"), out, "utf8");
console.log(`Wrote ${OUT}/index.html (${Math.round(out.length / 1024)} KB)`);
