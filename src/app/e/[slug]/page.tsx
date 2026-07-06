import EventPage from "@/components/EventPage";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
};

export default async function EventRoute({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { view } = await searchParams;
  return (
    <EventPage
      slug={slug}
      initialView={view === "responses" ? "group" : "edit"}
    />
  );
}
