// ESM resolve hook: redirect the Workers-only `cloudflare:workers` specifier to
// a Node-loadable stub so the built worker can run under `node --test`.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") {
    return {
      url: new URL("./cloudflare-workers-stub.mjs", import.meta.url).href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
