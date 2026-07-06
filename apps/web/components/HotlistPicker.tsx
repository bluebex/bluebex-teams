"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminModal } from "@/components/AdminModal";
import { CreateHotlistModal } from "@/components/CreateHotlistModal";
import { MultiSelect } from "@/components/MultiSelect";
import { formatHotlistLabel, hotlistFilterPath, type HotlistLite } from "@/lib/hotlist";

type HotlistPickerProps = {
  hotlists: HotlistLite[];
  value: string[];
  onChange: (hotlistIds: string[]) => void;
  onHotlistCreated: (hotlist: HotlistLite) => void;
  label?: string;
};

export function HotlistPicker({
  hotlists,
  value,
  onChange,
  onHotlistCreated,
  label = "Hotlist",
}: HotlistPickerProps) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const selectedHotlists = useMemo(() => {
    const byId = new Map(hotlists.map((hotlist) => [hotlist.hotlistId, hotlist]));
    return value
      .map((hotlistId) => byId.get(hotlistId))
      .filter((hotlist): hotlist is HotlistLite => hotlist != null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [hotlists, value]);

  const options = useMemo(
    () =>
      hotlists.map((hotlist) => ({
        value: hotlist.hotlistId,
        label: formatHotlistLabel(hotlist),
      })),
    [hotlists],
  );

  return (
    <div className="bb-hotlist-picker">
      <span className="bb-admin-label">{label}</span>
      {selectedHotlists.length > 0 ? (
        <div className="bb-hotlist-badge-row">
          {selectedHotlists.map((hotlist) => (
            <Link
              key={hotlist.hotlistId}
              href={hotlistFilterPath(hotlist.hotlistId)}
              className="bb-hotlist-badge"
            >
              <span className="bb-hotlist-badge-text">
                <span className="bb-hotlist-badge-name">
                  {hotlist.name} <span className="bb-hotlist-badge-id">({hotlist.hotlistId})</span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="bb-hotlist-create-link"
        onClick={() => setOpen(true)}
      >
        + Add Hotlist
      </button>

      <AdminModal
        open={open}
        title="Add Hotlist"
        description="Select one or more hotlists for this task."
        onClose={() => setOpen(false)}
        footer={
          <button
            type="button"
            className="bb-admin-btn"
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        }
      >
        {hotlists.length === 0 ? (
          <p className="bb-hotlist-select-empty">No hotlists yet. Create one below.</p>
        ) : (
          <MultiSelect
            label="Hotlist"
            options={options}
            value={value}
            onChange={onChange}
            allLabel="None"
          />
        )}
        <button
          type="button"
          className="bb-hotlist-select-create bb-hotlist-select-create--modal"
          onClick={() => {
            setOpen(false);
            setShowCreate(true);
          }}
        >
          + Create hotlist
        </button>
      </AdminModal>

      <CreateHotlistModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(hotlist) => {
          onHotlistCreated(hotlist);
          if (!value.includes(hotlist.hotlistId)) {
            onChange([...value, hotlist.hotlistId]);
          }
        }}
      />
    </div>
  );
}
