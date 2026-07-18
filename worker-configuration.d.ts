// Ambient declarations for the Cloudflare Workers runtime surface used by this
// project (the `cloudflare:workers` virtual module and the D1/Fetcher globals).
// The Cloudflare Vite plugin provides the real implementations at build and run
// time; these declarations only let a bare `tsc --noEmit` resolve the types.

interface Fetcher {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

interface D1Database {
  prepare(query: string): unknown;
  batch(statements: unknown[]): Promise<unknown[]>;
  exec(query: string): Promise<unknown>;
}

declare module "cloudflare:workers" {
  export const env: Record<string, unknown> & { DB?: D1Database };
}
