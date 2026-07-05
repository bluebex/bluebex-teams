"use client";

import { Suspense } from "react";
import { TaskListView } from "@/components/TaskListView";

export default function BugsPage() {
  return (
    <Suspense>
      <TaskListView
        fixedCategory="BUG"
        defaultSelectedStatuses={["TODO", "IN_PROGRESS"]}
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
