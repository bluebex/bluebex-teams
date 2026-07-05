"use client";

import { Suspense } from "react";
import { TaskListView } from "@/components/TaskListView";

export default function Home() {
  return (
    <Suspense>
      <TaskListView />
    </Suspense>
  );
}
