const CREATED_SLUGS_KEY = "resched:created-slugs";

export function getLocallyCreatedSlugs(): string[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(CREATED_SLUGS_KEY);
  if (!raw) return [];

  try {
    const slugs = JSON.parse(raw) as string[];
    return slugs.filter((slug) => typeof slug === "string" && slug.trim());
  } catch {
    localStorage.removeItem(CREATED_SLUGS_KEY);
    return [];
  }
}

export function markLocallyCreated(slug: string) {
  const trimmed = slug.trim();
  if (!trimmed) return;

  const slugs = getLocallyCreatedSlugs();
  if (!slugs.includes(trimmed)) {
    localStorage.setItem(CREATED_SLUGS_KEY, JSON.stringify([...slugs, trimmed]));
  }
}

export function unmarkLocallyCreated(slug: string) {
  const trimmed = slug.trim();
  if (!trimmed) return;

  const slugs = getLocallyCreatedSlugs().filter((item) => item !== trimmed);
  if (slugs.length === 0) {
    localStorage.removeItem(CREATED_SLUGS_KEY);
  } else {
    localStorage.setItem(CREATED_SLUGS_KEY, JSON.stringify(slugs));
  }
}

export async function claimLocallyCreatedEvents() {
  const slugs = getLocallyCreatedSlugs();
  if (slugs.length === 0) return;

  await Promise.all(
    slugs.map(async (slug) => {
      try {
        const response = await fetch(`/api/events/${slug}/claim`, {
          method: "POST",
        });
        if (response.ok) return;
        if (response.status === 404) {
          unmarkLocallyCreated(slug);
        }
      } catch {
        // Keep slug for a later retry.
      }
    }),
  );
}
