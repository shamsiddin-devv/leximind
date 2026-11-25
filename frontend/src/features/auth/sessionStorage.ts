import { api, ApiError } from '../../shared/services/api';
import type { SessionToken } from '../../shared/types/api';

const storageKey = 'leximind.session';
const activeKey = 'leximind.active-session';
export const rememberedSessionKey = (id: string) => 'leximind.remembered-session.' + id;
const pending = new Map<string, Promise<SessionToken | null>>();

type RememberedSession = SessionToken & Required<Pick<SessionToken, 'sessionId' | 'refreshToken' | 'refreshExpiresAt'>>;

export function usable(value?: SessionToken | null): value is SessionToken {
  return typeof value?.accessToken === 'string' && Date.parse(value.expiresAt) > Date.now();
}

function remembered(value?: SessionToken | null): value is RememberedSession {
  return typeof value?.sessionId === 'string' && typeof value.refreshToken === 'string'
    && typeof value.refreshExpiresAt === 'string' && Date.parse(value.refreshExpiresAt) > Date.now();
}

function readRemembered(id: string): RememberedSession | null {
  try {
    const stored = JSON.parse(localStorage.getItem(rememberedSessionKey(id)) ?? 'null') as SessionToken | null;
    if (remembered(stored) && stored.sessionId === id) return stored;
    localStorage.removeItem(rememberedSessionKey(id));
  } catch { /* Keep authentication usable when storage is unavailable. */ }
  return null;
}

export function sessionMetadata({ accessToken, expiresAt, sessionId }: SessionToken): SessionToken {
  return { accessToken, expiresAt, sessionId };
}

export function readSession(): SessionToken | null {
  try {
    const tab = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as SessionToken | null;
    if (tab?.sessionId) {
      const saved = readRemembered(tab.sessionId);
      if (saved) return saved;
    } else if (usable(tab)) return tab;
  } catch { /* A new tab can still use the active remembered session. */ }
  try {
    const id = localStorage.getItem(activeKey);
    return id ? readRemembered(id) : null;
  } catch { return null; }
}

function writeRemembered(session: RememberedSession) {
  try { localStorage.setItem(rememberedSessionKey(session.sessionId), JSON.stringify(session)); }
  catch { /* The current tab can continue using its in-memory session. */ }
}

export function storeSession(session: SessionToken, activate: boolean) {
  try { sessionStorage.setItem(storageKey, JSON.stringify(sessionMetadata(session))); } catch { /* Memory-only. */ }
  if (remembered(session)) {
    writeRemembered(session);
    if (activate) {
      try { localStorage.setItem(activeKey, session.sessionId); } catch { /* Memory-only. */ }
    }
  }
}

export function forgetSession(session: SessionToken | null) {
  try { sessionStorage.removeItem(storageKey); } catch { /* Memory-only. */ }
  if (!session?.sessionId) return;
  try {
    localStorage.removeItem(rememberedSessionKey(session.sessionId));
    if (localStorage.getItem(activeKey) === session.sessionId) localStorage.removeItem(activeKey);
  } catch { /* Memory-only. */ }
}

export function savedAccountSession(session: SessionToken) {
  return session.sessionId ? readRemembered(session.sessionId) : usable(session) ? session : null;
}

export function renewSession(session: SessionToken, force = false): Promise<SessionToken | null> {
  if (!remembered(session)) return Promise.resolve(!force && usable(session) ? session : null);
  const id = session.sessionId;
  const existing = pending.get(id);
  if (existing) return existing;

  async function renew(): Promise<SessionToken | null> {
    const saved = readRemembered(id);
    const current = saved ?? session;
    if ((!force || current.accessToken !== session.accessToken) && usable(current)) return current;
    if (!remembered(current)) return null;
    try {
      const next = await api<SessionToken>('/auth/refresh', {
        method: 'POST', body: { refreshToken: current.refreshToken }, signal: AbortSignal.timeout(70_000),
      });
      if (!remembered(next) || next.sessionId !== id) throw new Error('Invalid session response');
      if (saved && !readRemembered(id)) return null;
      writeRemembered(next);
      return next;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  }

  async function lockedRenewal() {
    return navigator.locks ? await navigator.locks.request('leximind.refresh.' + id, renew) : renew();
  }
  const attempt = lockedRenewal().finally(() => pending.delete(id));
  pending.set(id, attempt);
  return attempt;
}
