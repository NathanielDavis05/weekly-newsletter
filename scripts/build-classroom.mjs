import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
export async function buildClassroom(outDir = 'dist-site') {
  const directory = resolve(outDir, 'classroom-test');
  await mkdir(directory, { recursive: true });
  const result = await build({ entryPoints: ['scripts/classroom-entry.tsx'], outdir: directory, bundle: true, minify: true, format: 'esm', jsx: 'automatic', target: 'es2022', entryNames: 'app-[hash]', assetNames: '[name]-[hash]', metafile: true, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning' });
  const outputs = Object.keys(result.metafile.outputs);
  const js = outputs.find(p => p.endsWith('.js')).split('/').pop();
  const css = outputs.find(p => p.endsWith('.css')).split('/').pop();
  await writeFile(resolve(directory, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="A private teacher workspace for student points and classroom rewards."><title>CSHS Classroom · Points & rewards</title><link rel="stylesheet" href="/classroom-test/${css}"><style>body{margin:0;background:#f8f6fb}</style></head><body><div id="classroom-mount"></div><script type="module" src="/classroom-test/${js}"></script></body></html>`);
  console.log('Built classroom-test teacher workspace');
}
if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) await buildClassroom(process.argv[2]);
