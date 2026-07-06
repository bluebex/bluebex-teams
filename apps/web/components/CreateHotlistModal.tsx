"use client";

import { useState } from "react";
import { AdminModal } from "@/components/AdminModal";
import type { HotlistLite } from "@/lib/hotlist";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type CreateHotlistModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (hotlist: HotlistLite) => void;
};

export function CreateHotlistModal({ open, onClose, onCreated }: CreateHotlistModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    if (submitting) return;
    setName("");
    setError(null);
    onClose();
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Hotlist name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/hotlists`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to create hotlist");
        return;
      }
      onCreated(data.hotlist as HotlistLite);
      setName("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminModal
      open={open}
      title="Create hotlist"
      description="A 6-digit hotlist ID is generated automatically."
      onClose={handleClose}
      footer={
        <>
          <button
            type="button"
            className="bb-admin-btn bb-admin-btn-outline"
            disabled={submitting}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bb-admin-btn"
            disabled={submitting || !name.trim()}
            onClick={handleCreate}
          >
            {submitting ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      <label className="block text-sm">
        <span className="bb-admin-label">Hotlist name</span>
        <input
          className="bb-admin-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sprint focus"
          autoFocus
          disabled={submitting}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleCreate();
            }
          }}
        />
      </label>
      {error ? <div className="bb-alert-error mt-4">{error}</div> : null}
    </AdminModal>
  );
}
