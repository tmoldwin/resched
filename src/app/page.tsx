import CreateEventForm from "@/components/CreateEventForm";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-8 max-w-lg">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Find a time that works for everyone
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-600">
          Create an event, share the link, and let people drag to mark when
          they&apos;re free.
        </p>
      </header>

      <CreateEventForm />
    </div>
  );
}
