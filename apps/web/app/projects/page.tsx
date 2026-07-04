"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Process = { id: string; name: string };
type Project = { id: string; name: string; processes: Process[] };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/tasks/meta`, { credentials: "include" });
      if (res.status === 401) return (window.location.href = "/login");
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="bb-container bb-page space-y-8">
      <PageHeader
        title="Projects"
        subtitle="Projects and processes you have access to."
      />

      {error ? <div className="bb-alert-error">{error}</div> : null}

      {loading ? (
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-body">
            <p className="bb-admin-cell-empty">Loading…</p>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-body">
            <p className="bb-admin-cell-empty">
              You don&apos;t have access to any projects yet. Contact an admin to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-header">
            <h2 className="bb-admin-list-box-title">Projects</h2>
            <span className="bb-admin-label">{projects.length} total</span>
          </div>
          <div className="bb-admin-list-box-body">
            <table className="bb-admin-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Processes</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    className="cursor-pointer hover:bg-[var(--bb-line)]/30 transition-colors"
                    onClick={() => (window.location.href = `/?projectId=${project.id}`)}
                  >
                    <td className="bb-admin-cell-primary">
                      <Link
                        href={`/?projectId=${project.id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="bb-admin-cell-secondary">
                      {project.processes.length === 0
                        ? "No processes"
                        : project.processes.map((p) => p.name).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
