"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminModal } from "./AdminModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type CurrentUser = { id: string; username: string; name: string; role: "ADMIN" | "USER" };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "";

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  /** Next.js may skip client nav between `/` and `/?view=…` (same pathname). */
  const navigateHomeList = useCallback(
    (href: string, event: MouseEvent<HTMLAnchorElement>) => {
      if (pathname !== "/") return;

      const target = new URL(href, window.location.origin);
      const current = new URL(window.location.href);
      if (target.pathname === current.pathname && target.search === current.search) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      router.push(href);
    },
    [pathname, router],
  );

  const loadUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.user) setUser(data.user);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser, pathname]);

  if (pathname.startsWith("/login")) return null;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <aside className="bb-sidebar">
        <div className="bb-sidebar-brand">
          <Link href="/" className="bb-sidebar-logo" onClick={(e) => navigateHomeList("/", e)}>
            <span className="bb-sidebar-logo-mark">B</span>
            <span>Bluebex Teams</span>
          </Link>
        </div>

        {user?.role === "ADMIN" ? (
          <div className="bb-sidebar-section bb-sidebar-section--first">
            <div className="bb-sidebar-section-title">Admin</div>
            <nav className="bb-sidebar-section-nav">
              <Link
                href="/admin"
                className={`bb-sidebar-link${pathname === "/admin" ? " bb-sidebar-link--active" : ""}`}
              >
                <UsersIcon />
                <span>Users</span>
              </Link>
              <Link
                href="/admin/projects"
                className={`bb-sidebar-link${pathname === "/admin/projects" ? " bb-sidebar-link--active" : ""}`}
              >
                <FolderIcon />
                <span>Projects</span>
              </Link>
              <Link
                href="/admin/hotlists"
                className={`bb-sidebar-link${pathname === "/admin/hotlists" ? " bb-sidebar-link--active" : ""}`}
              >
                <TagIcon />
                <span>Hotlists</span>
              </Link>
            </nav>
          </div>
        ) : null}

        <nav className="bb-sidebar-nav">
          <Link
            href="/"
            className={`bb-sidebar-link${pathname === "/" && !view ? " bb-sidebar-link--active" : ""}`}
            onClick={(e) => navigateHomeList("/", e)}
          >
            <HomeIcon />
            <span>Home</span>
          </Link>
          <Link
            href="/?view=assigned"
            className={`bb-sidebar-link${view === "assigned" ? " bb-sidebar-link--active" : ""}`}
            onClick={(e) => navigateHomeList("/?view=assigned", e)}
          >
            <UserIcon />
            <span>Assigned to me</span>
          </Link>
          <Link
            href="/?view=created"
            className={`bb-sidebar-link${view === "created" ? " bb-sidebar-link--active" : ""}`}
            onClick={(e) => navigateHomeList("/?view=created", e)}
          >
            <PenIcon />
            <span>Created by me</span>
          </Link>
          <Link
            href="/bugs"
            className={`bb-sidebar-link${pathname === "/bugs" ? " bb-sidebar-link--active" : ""}`}
          >
            <BugIcon />
            <span>Bugs</span>
          </Link>
          <Link
            href="/projects"
            className={`bb-sidebar-link${pathname === "/projects" ? " bb-sidebar-link--active" : ""}`}
          >
            <FolderIcon />
            <span>Projects</span>
          </Link>
          <Link
            href="/settings"
            className={`bb-sidebar-link${pathname === "/settings" ? " bb-sidebar-link--active" : ""}`}
          >
            <GearIcon />
            <span>Settings</span>
          </Link>
        </nav>

        <div className="bb-sidebar-footer">
          {user ? (
            <div className="bb-sidebar-user">
              <div className="bb-sidebar-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <div className="bb-sidebar-user-info">
                <span className="bb-sidebar-user-name">{user.name}</span>
                <span className="bb-sidebar-user-role">{user.role === "ADMIN" ? "Admin" : "Member"}</span>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            className="bb-sidebar-link bb-sidebar-link--logout"
            onClick={() => setShowLogout(true)}
          >
            <LogoutIcon />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <AdminModal
        open={showLogout}
        title="Log out?"
        description="Are you sure you want to log out?"
        onClose={() => setShowLogout(false)}
        footer={
          <>
            <button
              type="button"
              className="bb-admin-btn bb-admin-btn-outline"
              disabled={loggingOut}
              onClick={() => setShowLogout(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bb-admin-btn"
              disabled={loggingOut}
              onClick={handleLogout}
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </>
        }
      >
        <p className="text-sm opacity-70">You will need to sign in again to continue.</p>
      </AdminModal>
    </>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function BugIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v2" />
      <path d="M16 2v2" />
      <path d="M12 6v2" />
      <path d="M4 10h2" />
      <path d="M18 10h2" />
      <path d="M6 16l2-2" />
      <path d="M16 16l-2-2" />
      <path d="M12 22v-2" />
      <ellipse cx="12" cy="14" rx="4" ry="5" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41 12 22 2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
