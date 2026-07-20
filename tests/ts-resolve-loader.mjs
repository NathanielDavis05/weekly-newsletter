// The app's TypeScript sources use extensionless relative imports (the bundler
// resolves them). Node's ESM resolver does not, so this loader appends the
// missing `.ts` / `.tsx` extension when a bare relative specifier fails.
//
// Paired with `node --experimental-strip-types`, this lets the unit tests import
// the real source modules instead of a rebuilt copy of them.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CANDIDATES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!specifier.startsWith(".") || !context.parentURL) throw error;
    for (const suffix of CANDIDATES) {
      const candidate = new URL(specifier + suffix, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) {
        // "module-typescript" keeps Node's type stripping in play; plain
        // "module" would hand the raw TypeScript to the JS parser.
        return { url: candidate.href, format: "module-typescript", shortCircuit: true };
      }
    }
    throw error;
  }
}
