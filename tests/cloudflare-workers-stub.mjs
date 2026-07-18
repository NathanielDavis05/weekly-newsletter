// Stand-in for the Workers-only `cloudflare:workers` module so the built worker
// can be imported by Node during tests. `env` is empty here, which makes the
// D1 helper throw and the content store fall back to the default content —
// exactly the "no database bound" path the public tests exercise.
export const env = {};
