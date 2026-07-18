import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

// The built worker imports `cloudflare:workers`, which Node can't resolve on its
// own. Redirect it to a stub so the worker is importable in this test runner.
register("./cloudflare-stub-loader.mjs", import.meta.url);

// These tests run against the built Cloudflare Worker (dist/server/index.js).
// No D1 binding is provided, so the content store falls back to the built-in
// default content — the public pages must still render the real newsletter,
// and the editor surfaces must stay locked down.

async function fetchPath(path, init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html", ...(init.headers ?? {}) },
      method: init.method ?? "GET",
      body: init.body,
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("public home page renders the newsletter default content", async () => {
  const response = await fetchPath("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /This week, at a glance/);
  assert.match(html, /CommercePoint training/);
  assert.match(html, /Cow Appreciation Day/);
  assert.match(html, /Your week, made simple\./);
});

test("public home page exposes no editor controls to visitors", async () => {
  const response = await fetchPath("/");
  const html = await response.text();
  assert.doesNotMatch(html, /Newsletter editor/);
  assert.doesNotMatch(html, /editor-root/);
});

test("public results page renders default metrics", async () => {
  const response = await fetchPath("/results");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Three-month scorecard/);
  assert.match(html, /Win back two seconds/);
});

test("editor page redirects anonymous visitors to sign in", async () => {
  const response = await fetchPath("/edit");
  assert.ok(
    [302, 303, 307, 308].includes(response.status),
    `expected a redirect, got ${response.status}`,
  );
  assert.match(
    response.headers.get("location") ?? "",
    /signin-with-chatgpt/,
  );
});

test("content write API rejects unauthenticated requests", async () => {
  const publish = await fetchPath("/api/content/publish", { method: "POST" });
  assert.equal(publish.status, 401);

  const save = await fetchPath("/api/content", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(save.status, 401);
});
