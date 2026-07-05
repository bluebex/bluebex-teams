"use client";

import { Suspense } from "react";
import { TaskListView } from "@/components/TaskListView";
import { OPEN_TASK_STATUSES } from "@/lib/taskStatus";

export default function BugsPage() {
  return (
    <Suspense>
      <TaskListView
        fixedCategory="BUG"
        defaultSelectedStatuses={OPEN_TASK_STATUSES}
        listTitle="Bug list"
        createHref="/tasks/new?category=BUG"
        createLabel="Create bug"
        itemLabel="Bug"
        emptyLabel="bugs"
        errorMessage="Failed to load bugs"
      />
    </Suspense>
  );
}
