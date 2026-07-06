export function storageKey(slug: string) {
  return `resched:${slug}:session`;
}

export function unlockKey(slug: string) {
  return `resched:${slug}:unlocked`;
}

export function passwordKey(slug: string) {
  return `resched:${slug}:password`;
}

export type StoredSession = {
  name: string;
  editToken?: string;
  participantId?: string;
};

export function getStoredSession(slug: string): StoredSession | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(storageKey(slug));
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as StoredSession;
    return session.name?.trim() ? session : null;
  } catch {
    localStorage.removeItem(storageKey(slug));
    return null;
  }
}

export function setStoredSession(slug: string, session: StoredSession) {
  localStorage.setItem(storageKey(slug), JSON.stringify(session));
}

export function clearStoredSession(slug: string) {
  localStorage.removeItem(storageKey(slug));
}

/**
 * The event password must be sent to the server on every save, so it is the
 * single source of truth for "unlocked". Stored in localStorage so it survives
 * new tabs and browser restarts (the legacy flag + sessionStorage split left
 * users "unlocked" without a password, making every save fail).
 */
export function getStoredUnlockPassword(slug: string): string | null {
  if (typeof window === "undefined") return null;

  const password = localStorage.getItem(passwordKey(slug));
  if (password) return password;

  // Migrate away from the legacy sessionStorage location when possible.
  const legacy = sessionStorage.getItem(passwordKey(slug));
  if (legacy) {
    setStoredUnlockPassword(slug, legacy);
    return legacy;
  }

  return null;
}

export function setStoredUnlockPassword(slug: string, password: string) {
  localStorage.setItem(unlockKey(slug), "1");
  localStorage.setItem(passwordKey(slug), password);
}

export function clearStoredUnlock(slug: string) {
  localStorage.removeItem(unlockKey(slug));
  localStorage.removeItem(passwordKey(slug));
  sessionStorage.removeItem(passwordKey(slug));
}

export function hasEventIdentity(options: {
  storedSession: StoredSession | null;
  myParticipant: boolean;
  googleName?: string | null;
}) {
  if (options.myParticipant) return true;
  if (options.googleName?.trim()) return true;
  return Boolean(options.storedSession?.name.trim());
}
