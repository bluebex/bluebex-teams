"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Login failed");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bb-login-split">
      <aside className="bb-login-visual">
        <div className="bb-login-visual-inner">
          <p className="bb-login-visual-brand">bluebex teams</p>
        </div>
      </aside>

      <section className="bb-login-form-side">
        <div className="bb-login-form-wrap">
          <div className="bb-login-form-header">
            <p className="bb-admin-label">Welcome back</p>
            <h1 className="bb-login-form-title">Sign in</h1>
            <p className="bb-login-form-subtitle">Enter your credentials to continue.</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="bb-admin-label">Username</span>
              <input
                className="bb-admin-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </label>

            <label className="block text-sm">
              <span className="bb-admin-label">Password</span>
              <input
                type="password"
                className="bb-admin-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>

            {error ? <div className="bb-alert-error">{error}</div> : null}

            <button type="submit" disabled={loading} className="bb-admin-btn w-full">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="bb-login-form-hint">
            Powered by <span className="bb-admin-cell-secondary">bluebex</span>
          </p>
        </div>
      </section>
    </main>
  );
}
