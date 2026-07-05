"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TaskListView } from "@/components/TaskListView";

function HomeTaskList() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "all";
  return <TaskListView key={view} />;
}

export default function Home() {
  return (
    <Suspense>
      <HomeTaskList />
    </Suspense>
  );
}
