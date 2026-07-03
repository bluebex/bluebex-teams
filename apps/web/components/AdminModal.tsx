"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type AdminModalProps = {
  open: boolean;
  title: string;
  description?: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AdminModal({
  open,
  title,
  description,
  wide,
  onClose,
  children,
  footer,
}: AdminModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="bb-admin-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`bb-admin bb-admin-modal${wide ? " bb-admin-modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="admin-modal-title" className="bb-admin-modal-title">
          {title}
        </h3>
        {description ? <p className="text-sm opacity-60 mt-1">{description}</p> : null}
        <div className="mt-6">{children}</div>
        {footer ? <div className="bb-admin-modal-actions">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
