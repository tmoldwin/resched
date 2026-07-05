import EventPage from "@/components/EventPage";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EventRoute({ params }: PageProps) {
  const { slug } = await params;
  return <EventPage slug={slug} />;
}
