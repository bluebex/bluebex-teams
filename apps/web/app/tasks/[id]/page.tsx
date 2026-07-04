"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LegacyTaskRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  useEffect(() => {
    if (!id) {
      router.replace("/");
      return;
    }

    (async () => {
      const res = await fetch(`${API_URL}/tasks/${id}`, { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        router.replace("/");
        return;
      }
      const data = await res.json();
      router.replace(`/${data.task.publicId}`);
    })();
  }, [id, router]);

  return (
    <main className="bb-container bb-page">
      <div className="bb-admin-list-box">
        <div className="bb-admin-list-box-body">
          <p className="bb-admin-cell-empty">Redirecting…</p>
        </div>
      </div>
    </main>
  );
}
