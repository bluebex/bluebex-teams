"use client";

import { useToast } from "@/components/ToastProvider";
import { taskAbsoluteUrl } from "@/lib/taskPublicId";

type TaskPublicIdProps = {
  publicId: string;
  inline?: boolean;
};

export function TaskPublicId({ publicId, inline = false }: TaskPublicIdProps) {
  const { showToast } = useToast();
  const normalized = publicId.toUpperCase();

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(taskAbsoluteUrl(normalized));
      showToast("Copied task link");
    } catch {
      // ignore clipboard errors
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      void copyUrl();
    }
  }

  return (
    <span
      className={`bb-task-id-copy${inline ? " bb-admin-cell-secondary" : " bb-task-number"}`}
      onClick={() => void copyUrl()}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
      title="Copy task link"
    >
      #{normalized}
    </span>
  );
}
