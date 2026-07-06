import { Suspense } from "react";
import NewEventPage from "@/components/NewEventPage";

export default function NewEventRoute() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      }
    >
      <NewEventPage />
    </Suspense>
  );
}
