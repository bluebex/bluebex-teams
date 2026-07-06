"use client";

import { useState } from "react";
import { CreateHotlistModal } from "@/components/CreateHotlistModal";
import { formatHotlistLabel, type HotlistLite } from "@/lib/hotlist";

export const CREATE_HOTLIST_VALUE = "__create_hotlist__";

type HotlistFilterSelectProps = {
  hotlists: HotlistLite[];
  value: string;
  onChange: (hotlistId: string) => void;
  onHotlistCreated: (hotlist: HotlistLite) => void;
};

export function HotlistFilterSelect({
  hotlists,
  value,
  onChange,
  onHotlistCreated,
}: HotlistFilterSelectProps) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <label className="bb-task-filter-field">
        <span className="bb-admin-label">Hotlist</span>
        <select
          className="bb-select"
          value={value}
          onChange={(e) => {
            if (e.target.value === CREATE_HOTLIST_VALUE) {
              setShowCreate(true);
              return;
            }
            onChange(e.target.value);
          }}
        >
          <option value="">All</option>
          {hotlists.map((hotlist) => (
            <option key={hotlist.hotlistId} value={hotlist.hotlistId}>
              {formatHotlistLabel(hotlist)}
            </option>
          ))}
          <option value={CREATE_HOTLIST_VALUE}>+ Create hotlist</option>
        </select>
      </label>

      <CreateHotlistModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(hotlist) => {
          onHotlistCreated(hotlist);
          onChange(hotlist.hotlistId);
        }}
      />
    </>
  );
}
