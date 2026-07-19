"use client";

import { useState } from "react";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/edit-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Sign in failed.");
        setBusy(false);
        return;
      }
      globalThis.location.href = returnTo;
    } catch {
      setError("Sign in failed. Try again.");
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#e9e5dc", padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <form onSubmit={submit} style={{ width: "min(100%, 360px)", background: "#fffdf9", border: "1px solid #d8d3ca", borderRadius: "16px", padding: "28px 24px", boxShadow: "0 20px 60px rgba(13,34,56,.14)", display: "grid", gap: "14px" }}>
        <div style={{ display: "grid", gap: "4px" }}>
          <strong style={{ fontSize: "20px", color: "#0d2238" }}>Newsletter editor</strong>
          <span style={{ fontSize: "13px", color: "#687687" }}>Enter the editor password to continue.</span>
        </div>
        <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#5c6978" }}>
          Password
          <input
            type="password"
            value={password}
            autoFocus
            onChange={(event) => setPassword(event.target.value)}
            style={{ minHeight: "44px", border: "1px solid #ccd3db", borderRadius: "10px", background: "#fff", padding: "8px 12px", color: "#0d2238", font: "inherit" }}
          />
        </label>
        {error ? <p style={{ margin: 0, color: "#b10c2f", fontSize: "13px" }}>{error}</p> : null}
        <button type="submit" disabled={busy || !password} style={{ minHeight: "44px", border: "0", borderRadius: "10px", background: "#c90e35", color: "#fff", fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy || !password ? 0.6 : 1 }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
