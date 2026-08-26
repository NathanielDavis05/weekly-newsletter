// Renders the team landing page to a static site.
//
// The page lives at app/team as a React server component, but it is not served
// from this app — the newsletter runs on OpenAI Sites, while the landing page
// is a static deploy on the apex domain. This script is what bridges the two,
// so app/team/page.tsx stays the single source of truth and a push can publish.
//
// Deliberately browser-free: an earlier version of this bundle was produced by
// screenshotting a running dev server, which cannot work on a CI builder.
//
//   node scripts/build-landing.mjs [outDir]     (default: dist-site)

import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdir, copyFile, readFile, writeFile, rm, readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, process.argv[2] ?? "dist-site");
const tmp = join(outDir, ".page.mjs");

/** Assets the page references, copied verbatim into the export. */
const IMAGES = [
  "cfa-logo.png",
  "food-pattern-red.png",
  "team-meeting.png",
  "smores-milkshake.jpeg",
  "pos-training.png",
  "west-bryan-badge.jpg",
];
const FONTS = ["apercu-regular.woff2", "apercu-medium.woff2", "apercu-bold.woff2"];

await rm(outDir, { recursive: true, force: true });
await mkdir(join(outDir, "images"), { recursive: true });
await mkdir(join(outDir, "fonts"), { recursive: true });

// `next/link` is aliased to a plain anchor and the CSS import is dropped — the
// stylesheet is inlined into <head> below rather than bundled through JS.
await build({
  entryPoints: [join(root, "app/team/page.tsx")],
  outfile: tmp,
  bundle: true,
  format: "esm",
  platform: "node",
  jsx: "automatic",
  target: "node22",
  external: ["react", "react-dom", "react/jsx-runtime"],
  alias: { "next/link": join(root, "scripts/shims/next-link.jsx") },
  loader: { ".css": "empty" },
  logLevel: "warning",
});

const { default: TeamLanding } = await import(pathToFileURL(tmp).href);
const markup = renderToStaticMarkup(createElement(TeamLanding));
await rm(tmp, { force: true });

const css = await readFile(join(root, "app/team/landing.css"), "utf8");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Chick-fil-A West Bryan | Team</title>
<meta name="description" content="Everything the Chick-fil-A West Bryan team needs in one place — training, uniform orders, promotions, and the store scorecard." />
<meta name="robots" content="noindex" />
<link rel="icon" href="/images/cfa-logo.png" />
<style>
@font-face{font-family:"Apercu";src:url("/fonts/apercu-regular.woff2") format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Apercu";src:url("/fonts/apercu-medium.woff2") format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:"Apercu";src:url("/fonts/apercu-bold.woff2") format("woff2");font-weight:700;font-display:swap}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#fff}
${css}
</style>
</head>
<body>
${markup}
</body>
</html>
`;

await writeFile(join(outDir, "index.html"), html);

for (const name of IMAGES) {
  await copyFile(join(root, "public/images", name), join(outDir, "images", name));
}
for (const name of FONTS) {
  await copyFile(join(root, "public/fonts", name), join(outDir, "fonts", name));
}

// Every asset the markup asks for must exist, or the deploy ships a broken
// image that nobody notices until it is on the live domain.
const referenced = [...markup.matchAll(/(?:src|href)="\/(images|fonts)\/([^"]+)"/g)];
const present = new Set([
  ...(await readdir(join(outDir, "images"))).map((f) => `images/${f}`),
  ...(await readdir(join(outDir, "fonts"))).map((f) => `fonts/${f}`),
]);
const missing = referenced
  .map(([, dir, file]) => `${dir}/${file}`)
  .filter((path) => !present.has(path));

if (missing.length) {
  console.error(`Missing asset(s) referenced by the page:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}

console.log(
  `Built ${outDir}\n  index.html  ${(html.length / 1024).toFixed(1)} KB\n  ${IMAGES.length} images, ${FONTS.length} fonts\n  ${referenced.length} asset references, all resolved`,
);
