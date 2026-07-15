"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { hotlistFilterPath, type HotlistLite } from "@/lib/hotlist";
import { redirectToLogin } from "@/lib/authClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type HotlistRow = HotlistLite & { taskCount: number };

export default function HotlistsPage() {
  const router = useRouter();
  const [hotlists, setHotlists] = useState<HotlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/hotlists`, { credentials: "include" });
      if (res.status === 401) return redirectToLogin();
      if (!res.ok) throw new Error("Failed to load hotlists");
      const data = await res.json();
      setHotlists(data.hotlists || []);
    } catch {
      setError("Failed to load hotlists");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="bb-container bb-page space-y-8">
      <PageHeader
        title="Hotlists"
        subtitle="Hotlists with tasks from projects or processes you can access."
      />

      {error ? <div className="bb-alert-error">{error}</div> : null}

      {loading ? (
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-body">
            <p className="bb-admin-cell-empty">Loading…</p>
          </div>
        </div>
      ) : hotlists.length === 0 ? (
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-body">
            <p className="bb-admin-cell-empty">
              No hotlists yet with tasks you can access.
            </p>
          </div>
        </div>
      ) : (
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-header">
            <h2 className="bb-admin-list-box-title">Hotlists</h2>
            <span className="bb-admin-label">{hotlists.length} total</span>
          </div>
          <div className="bb-admin-list-box-body">
            <table className="bb-admin-table">
              <thead>
                <tr>
                  <th>Hotlist</th>
                  <th>ID</th>
                  <th>Tasks</th>
                </tr>
              </thead>
              <tbody>
                {hotlists.map((hotlist) => {
                  const href = hotlistFilterPath(hotlist.hotlistId);
                  return (
                    <tr
                      key={hotlist.id}
                      className="cursor-pointer hover:bg-[var(--bb-line)]/30 transition-colors"
                      onClick={() => router.push(href)}
                    >
                      <td className="bb-admin-cell-primary">
                        <Link
                          href={href}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hotlist.name}
                        </Link>
                      </td>
                      <td className="bb-admin-cell-secondary">{hotlist.hotlistId}</td>
                      <td className="bb-admin-cell-secondary">{hotlist.taskCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
