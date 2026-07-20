// Ambient declarations for the Cloudflare Workers runtime surface used by this
// project (the `cloudflare:workers` virtual module and the D1/R2/Fetcher
// globals). The Cloudflare Vite plugin provides the real implementations at
// build and run time; these declarations only let a bare `tsc --noEmit` resolve
// the types.
//
// They cover the subset of each API this codebase actually calls. Typing these
// properly rather than as `unknown` is what lets the query chains in
// app/content/store.ts and the media routes type-check.

interface Fetcher {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

interface D1Meta {
  changes?: number;
  last_row_id?: number;
  duration?: number;
  rows_read?: number;
  rows_written?: number;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: D1Meta;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<unknown>;
}

interface R2HTTPMetadata {
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
}

interface R2Object {
  key: string;
  size: number;
  etag: string;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null,
    options?: { httpMetadata?: R2HTTPMetadata; customMetadata?: Record<string, string> },
  ): Promise<R2Object>;
  delete(key: string | string[]): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    objects: R2Object[];
    truncated: boolean;
    cursor?: string;
  }>;
}

declare module "cloudflare:workers" {
  export const env: Record<string, unknown> & { DB?: D1Database; MEDIA?: R2Bucket };
}

// `import.meta.env.DEV` is a Vite build-time constant. Declaring it here keeps
// a bare `tsc --noEmit` happy without pulling in vite/client, which would drag
// in DOM asset-module declarations this project does not use.
interface ImportMeta {
  readonly env: { readonly DEV: boolean; readonly PROD: boolean; readonly MODE: string };
}
