"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import {
  formatTaskEta,
  formatTaskEtaApi,
  getTaskEtaMinDate,
  isTaskEtaBeforeToday,
  parseTaskEtaDate,
} from "@/lib/taskEta";

type DatePickerProps = {
  value: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  inline?: boolean;
  disabled?: boolean;
  id?: string;
};

type PopoverCoords = {
  top: number;
  left: number;
  placement: "above" | "below";
};

const POPOVER_WIDTH = 304;
const POPOVER_GAP = 6;
const POPOVER_ESTIMATED_HEIGHT = 380;
const VIEWPORT_PADDING = 8;

function computeCoords(
  trigger: HTMLElement,
  popoverHeight: number,
  inline: boolean,
): PopoverCoords {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP;
  const spaceAbove = rect.top - POPOVER_GAP;
  const showAbove = spaceBelow < popoverHeight && spaceAbove >= spaceBelow;

  let top = showAbove
    ? rect.top - popoverHeight - POPOVER_GAP
    : rect.bottom + POPOVER_GAP;

  top = Math.max(
    VIEWPORT_PADDING,
    Math.min(top, window.innerHeight - popoverHeight - VIEWPORT_PADDING),
  );

  const left = inline
    ? Math.max(VIEWPORT_PADDING, rect.right - POPOVER_WIDTH)
    : Math.max(
        VIEWPORT_PADDING,
        Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING),
      );

  return { top, left, placement: showAbove ? "above" : "below" };
}

function CalendarIcon() {
  return (
    <svg
      className="bb-date-picker-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="1" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  inline = false,
  disabled = false,
  id,
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selected = parseTaskEtaDate(value);
  const minDate = getTaskEtaMinDate();
  const defaultMonth =
    selected && selected >= minDate ? selected : minDate;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setCoords(null);
      return;
    }

    function updatePosition() {
      if (!triggerRef.current) return;
      const popoverHeight = popoverRef.current?.offsetHeight ?? POPOVER_ESTIMATED_HEIGHT;
      setCoords(computeCoords(triggerRef.current, popoverHeight, inline));
    }

    updatePosition();
    const frame = requestAnimationFrame(updatePosition);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, inline, value]);

  useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    const next = formatTaskEtaApi(date);
    if (isTaskEtaBeforeToday(next)) return;
    onChange(next);
    setOpen(false);
  }

  const popover =
    open && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              className="bb-date-picker-backdrop"
              aria-label="Close calendar"
              onClick={() => setOpen(false)}
            />
            <div
              ref={popoverRef}
              className={`bb-date-picker-popover bb-date-picker-popover--fixed${
                coords?.placement === "above" ? " bb-date-picker-popover--above" : ""
              }`}
              style={{
                top: coords?.top ?? -9999,
                left: coords?.left ?? VIEWPORT_PADDING,
                visibility: coords ? "visible" : "hidden",
              }}
              role="dialog"
              aria-label="Choose date"
            >
              <DayPicker
                mode="single"
                selected={selected}
                defaultMonth={defaultMonth}
                onSelect={handleSelect}
                disabled={{ before: minDate }}
                showOutsideDays
              />
              {value ? (
                <div className="bb-date-picker-footer">
                  <button
                    type="button"
                    className="bb-date-picker-clear"
                    onClick={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                  >
                    Clear date
                  </button>
                </div>
              ) : null}
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <div className={`bb-date-picker${inline ? " bb-date-picker--inline" : ""}`}>
        <button
          ref={triggerRef}
          type="button"
          id={inputId}
          className={`bb-date-picker-trigger${inline ? " bb-date-picker-trigger--inline" : ""}`}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <CalendarIcon />
          <span className={value ? undefined : "bb-date-picker-placeholder"}>
            {value ? formatTaskEta(value) : placeholder}
          </span>
        </button>
      </div>
      {popover}
    </>
  );
}
