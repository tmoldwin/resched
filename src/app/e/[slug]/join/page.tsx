import { Suspense } from "react";
import EventJoinPage from "@/components/EventJoinPage";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EventJoinRoute({ params }: PageProps) {
  const { slug } = await params;
  return (
    <Suspense
      fallback={
        <div className="page-shell flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      }
    >
      <EventJoinPage slug={slug} />
    </Suspense>
  );
}
