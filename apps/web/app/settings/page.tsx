"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type CurrentUser = { id: string; username: string; name: string; role: "ADMIN" | "USER" };

export default function SettingsPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  const loadUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
      if (res.status === 401) return (window.location.href = "/login");
      if (res.ok) {
        const data = await res.json();
        if (data.user) setUser(data.user);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  return (
    <main className="bb-container bb-page space-y-10">
      <PageHeader
        title="Settings"
        subtitle="Manage your account and preferences."
      />

      <section className="space-y-6">
        <div className="bb-admin-label">Profile</div>
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-body" style={{ padding: "1.25rem 1.5rem" }}>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bb-settings-avatar">
                  {user?.name?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="bb-admin-label">Full name</div>
                    <div className="bb-admin-cell-primary mt-1">{user?.name ?? "—"}</div>
                  </div>
                  <div>
                    <div className="bb-admin-label">Username</div>
                    <div className="bb-admin-cell-secondary mt-1">{user?.username ?? "—"}</div>
                  </div>
                  <div>
                    <div className="bb-admin-label">Role</div>
                    <div className="mt-1">
                      <span className="bb-admin-badge">{user?.role ?? "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="bb-admin-label">Notifications</div>
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-body" style={{ padding: "1.25rem 1.5rem" }}>
            <div className="space-y-4">
              <label className="bb-settings-toggle">
                <div>
                  <div className="bb-admin-cell-primary">Email notifications</div>
                  <div className="bb-admin-cell-sub" style={{ marginTop: "0.2rem" }}>
                    Receive email when tasks are assigned to you
                  </div>
                </div>
                <input type="checkbox" className="bb-admin-checkbox" defaultChecked />
              </label>
              <label className="bb-settings-toggle">
                <div>
                  <div className="bb-admin-cell-primary">Comment mentions</div>
                  <div className="bb-admin-cell-sub" style={{ marginTop: "0.2rem" }}>
                    Get notified when someone mentions you in a comment
                  </div>
                </div>
                <input type="checkbox" className="bb-admin-checkbox" defaultChecked />
              </label>
              <label className="bb-settings-toggle">
                <div>
                  <div className="bb-admin-cell-primary">Status updates</div>
                  <div className="bb-admin-cell-sub" style={{ marginTop: "0.2rem" }}>
                    Receive notifications when task status changes
                  </div>
                </div>
                <input type="checkbox" className="bb-admin-checkbox" />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="bb-admin-label">Preferences</div>
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-body" style={{ padding: "1.25rem 1.5rem" }}>
            <div className="space-y-4">
              <div>
                <div className="bb-admin-label">Language</div>
                <select className="bb-select" defaultValue="en" style={{ maxWidth: "16rem" }}>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>
              <div>
                <div className="bb-admin-label">Timezone</div>
                <select className="bb-select" defaultValue="auto" style={{ maxWidth: "16rem" }}>
                  <option value="auto">Auto-detect</option>
                  <option value="utc">UTC</option>
                  <option value="est">Eastern (US)</option>
                  <option value="pst">Pacific (US)</option>
                  <option value="ist">India (IST)</option>
                  <option value="jst">Japan (JST)</option>
                </select>
              </div>
              <div>
                <div className="bb-admin-label">Default task view</div>
                <select className="bb-select" defaultValue="all" style={{ maxWidth: "16rem" }}>
                  <option value="all">All tasks</option>
                  <option value="assigned">Assigned to me</option>
                  <option value="created">Created by me</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6 pb-8">
        <div className="bb-admin-label">Security</div>
        <div className="bb-admin-list-box">
          <div className="bb-admin-list-box-body" style={{ padding: "1.25rem 1.5rem" }}>
            <div className="space-y-4">
              <label className="bb-settings-toggle">
                <div>
                  <div className="bb-admin-cell-primary">Change password</div>
                  <div className="bb-admin-cell-sub" style={{ marginTop: "0.2rem" }}>
                    Update your password to keep your account secure
                  </div>
                </div>
                <button type="button" className="bb-admin-btn" style={{ fontSize: "0.65rem" }}>
                  Change
                </button>
              </label>
              <label className="bb-settings-toggle">
                <div>
                  <div className="bb-admin-cell-primary">Two-factor authentication</div>
                  <div className="bb-admin-cell-sub" style={{ marginTop: "0.2rem" }}>
                    Add an extra layer of security to your account
                  </div>
                </div>
                <button type="button" className="bb-admin-btn" style={{ fontSize: "0.65rem" }}>
                  Enable
                </button>
              </label>
              <label className="bb-settings-toggle">
                <div>
                  <div className="bb-admin-cell-primary">Active sessions</div>
                  <div className="bb-admin-cell-sub" style={{ marginTop: "0.2rem" }}>
                    View and manage your active login sessions
                  </div>
                </div>
                <button type="button" className="bb-admin-btn" style={{ fontSize: "0.65rem" }}>
                  Manage
                </button>
              </label>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
