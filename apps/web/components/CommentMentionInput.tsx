"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  filterMentionUsers,
  getActiveMentionQuery,
  insertMention,
  type MentionUser,
} from "@/lib/mentions";

type CommentMentionInputProps = {
  value: string;
  onChange: (value: string) => void;
  users: MentionUser[];
  placeholder?: string;
  onSubmit?: () => void;
  disabled?: boolean;
};

export function CommentMentionInput({
  value,
  onChange,
  users,
  placeholder,
  onSubmit,
  disabled = false,
}: CommentMentionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const suggestions = useMemo(
    () => (mentionStart === null ? [] : filterMentionUsers(users, mentionQuery)),
    [mentionStart, mentionQuery, users],
  );

  const showSuggestions = mentionStart !== null && suggestions.length > 0;

  function syncMentionState(nextValue: string, cursor: number) {
    const active = getActiveMentionQuery(nextValue, cursor);
    if (!active) {
      setMentionStart(null);
      setMentionQuery("");
      setHighlightIndex(0);
      return;
    }
    setMentionStart(active.start);
    setMentionQuery(active.query);
    setHighlightIndex(0);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = e.target.value;
    onChange(nextValue);
    syncMentionState(nextValue, e.target.selectionStart ?? nextValue.length);
  }

  function selectUser(user: MentionUser) {
    if (mentionStart === null || !inputRef.current) return;

    const cursor = inputRef.current.selectionStart ?? value.length;
    const { value: nextValue, cursor: nextCursor } = insertMention(
      value,
      mentionStart,
      cursor,
      user.username,
    );

    onChange(nextValue);
    setMentionStart(null);
    setMentionQuery("");
    setHighlightIndex(0);

    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (disabled) return;
        const user = suggestions[highlightIndex];
        if (user) selectUser(user);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionStart(null);
        setMentionQuery("");
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (e.repeat || disabled) return;
      onSubmit?.();
    }
  }

  useEffect(() => {
    if (!showSuggestions) return;
    setHighlightIndex((i) => Math.min(i, suggestions.length - 1));
  }, [showSuggestions, suggestions.length]);

  return (
    <div className="bb-comment-input-wrap">
      <input
        ref={inputRef}
        type="text"
        className="bb-input !mt-0 w-full"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => syncMentionState(value, e.currentTarget.selectionStart ?? value.length)}
        onKeyUp={(e) => syncMentionState(value, e.currentTarget.selectionStart ?? value.length)}
      />

      {showSuggestions ? (
        <ul className="bb-mention-suggestions" role="listbox">
          {suggestions.map((user, index) => (
            <li key={user.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlightIndex}
                className={`bb-mention-suggestion${index === highlightIndex ? " bb-mention-suggestion--active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectUser(user)}
              >
                <span className="bb-mention-suggestion-name">{user.name}</span>
                <span className="bb-mention-suggestion-username">@{user.username}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
