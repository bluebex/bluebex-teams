"use client";

import { useEffect, useId, useRef, useState } from "react";

export type MultiSelectOption<T extends string = string> = {
  value: T;
  label: string;
};

type MultiSelectProps<T extends string> = {
  label: string;
  options: MultiSelectOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  allLabel?: string;
};

export function MultiSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  allLabel = "All",
}: MultiSelectProps<T>) {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const isAllSelected = value.length === 0 || value.length === options.length;
  const displayText = isAllSelected
    ? allLabel
    : options
        .filter((opt) => value.includes(opt.value))
        .map((opt) => opt.label)
        .join(", ");

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggleOption = (optionValue: T) => {
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue],
    );
  };

  return (
    <div className="bb-task-filter-field">
      <span className="bb-admin-label" id={id}>
        {label}
      </span>
      <div className="bb-multi-select-wrap" ref={wrapRef}>
        <button
          type="button"
          className="bb-multi-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={id}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="bb-multi-select-trigger-text">{displayText}</span>
        </button>
        {open ? (
          <div className="bb-multi-select-menu" role="listbox" aria-multiselectable="true">
            {options.map((opt) => (
              <label key={opt.value} className="bb-multi-select-option">
                <input
                  type="checkbox"
                  className="bb-admin-checkbox"
                  checked={value.includes(opt.value)}
                  onChange={() => toggleOption(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
