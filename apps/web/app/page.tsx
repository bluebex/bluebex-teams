"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TaskListView } from "@/components/TaskListView";

function HomeTaskList() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "all";
  const projectId = searchParams.get("projectId") ?? "all";
  const hotlistId = searchParams.get("hotlistId") ?? "all";
  return <TaskListView key={`${view}:${projectId}:${hotlistId}`} />;
}

export default function Home() {
  return (
    <Suspense>
      <HomeTaskList />
    </Suspense>
  );
}
