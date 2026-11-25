import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, explain, observeUnauthorized } from '../../../shared/services/api';
import type { SessionToken, User } from '../../../shared/types/api';
import { forgetSession, readSession, rememberedSessionKey, renewSession, savedAccountSession, sessionMetadata, storeSession, usable } from '../sessionStorage';

const accountsKey = 'leximind.accounts';
export type SessionAccount = Pick<User, 'id' | 'fullName' | 'email' | 'avatarUrl'>;
type StoredAccount = { account: SessionAccount; session: SessionToken };

function savedAccounts(): StoredAccount[] {
  try {
    const entries: unknown = JSON.parse(sessionStorage.getItem(accountsKey) ?? '[]');
    return Array.isArray(entries) ? entries.filter((entry): entry is StoredAccount =>
      typeof entry?.account?.id === 'string' && typeof entry.account.email === 'string' &&
      typeof entry.account.fullName === 'string' && entry.session && Boolean(savedAccountSession(entry.session))) : [];
  } catch { return []; }
}

export function useSession() {
  const [session, setSession] = useState(readSession);
  const active = useRef(session);
  const previousAccess = useRef<string | undefined>(undefined);
  const checkedToken = useRef<string | undefined>(undefined);
  const [accounts, setAccounts] = useState(savedAccounts);
  const [identity, setIdentity] = useState<{ token: string; user: User }>();
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const token = session?.accessToken;

  const clear = useCallback((expectedToken?: string) => {
    const current = active.current;
    if (expectedToken && current?.accessToken !== expectedToken && previousAccess.current !== expectedToken) return false;
    active.current = null;
    previousAccess.current = undefined;
    checkedToken.current = undefined;
    forgetSession(current);
    setAccounts((accounts) => accounts.filter(({ session }) => current?.sessionId
      ? session.sessionId !== current.sessionId
      : session.accessToken !== current?.accessToken));
    setSession(null);
    setIdentity(undefined);
    setError('');
    return true;
  }, []);

  function establish(value: SessionToken, user?: User) {
    active.current = value;
    previousAccess.current = undefined;
    checkedToken.current = user ? value.accessToken : undefined;
    storeSession(value, true);
    setIdentity(user ? { token: value.accessToken, user } : undefined);
    setError('');
    setSession(value);
  }

  const refresh = useCallback(async (current: SessionToken, force = false) => {
    const next = await renewSession(current, force);
    if (active.current !== current) {
      return active.current?.sessionId === current.sessionId && current.sessionId ? active.current : null;
    }
    if (!next) {
      clear(current.accessToken);
      return null;
    }
    if (next.accessToken !== current.accessToken) {
      active.current = next;
      previousAccess.current = current.accessToken;
      storeSession(next, false);
      if (checkedToken.current === current.accessToken) checkedToken.current = next.accessToken;
      setIdentity((value) => value?.token === current.accessToken ? { ...value, token: next.accessToken } : value);
      setSession(next);
      setError('');
    }
    return next;
  }, [clear]);

  useEffect(() => observeUnauthorized(async (rejectedToken) => {
    const current = active.current;
    if (!current) return;
    if (previousAccess.current === rejectedToken && usable(current)) return current.accessToken;
    if (current.accessToken === rejectedToken) return (await refresh(current, true))?.accessToken;
  }), [refresh]);

  useEffect(() => {
    if (!session || identity?.token !== session.accessToken) return;
    const { id, fullName, email, avatarUrl } = identity.user;
    setAccounts((current) => [{ account: { id, fullName, email, avatarUrl }, session: sessionMetadata(session) },
      ...current.filter((entry) => entry.account.id !== id && savedAccountSession(entry.session))]);
  }, [identity, session]);

  useEffect(() => {
    try { sessionStorage.setItem(accountsKey, JSON.stringify(accounts)); } catch { /* Sessions remain memory-only. */ }
  }, [accounts]);

  async function activate(target: SessionToken, previous = active.current) {
    const current = await renewSession(target);
    if (!current) throw new ApiError(401);
    const user = await api<User>('/users/me', { token: current.accessToken });
    if (active.current === previous) establish(current, user);
  }

  async function switchAccount(id: string) {
    const entry = accounts.find(({ account }) => account.id === id);
    try {
      const saved = entry && savedAccountSession(entry.session);
      if (saved) {
        await activate(saved);
        return;
      }
    } catch (failure) {
      if (!(failure instanceof ApiError) || failure.status !== 401) throw failure;
    }
    setAccounts((current) => current.filter(({ account }) => account.id !== id));
    throw new ApiError(401);
  }

  async function addAccount(email: string, password: string) {
    const previous = active.current;
    const newSession = await api<SessionToken>('/auth/login', { method: 'POST', body: { email, password, rememberSession: true } });
    if (previous && previous === active.current) await activate(newSession, previous);
  }

  useEffect(() => {
    if (!session || checkedToken.current === session.accessToken) return;
    const abort = new AbortController();
    const timeout = window.setTimeout(() => {
      abort.abort();
      setError('Sessiyani tekshirish cho‘zildi. Qayta urinib ko‘ring.');
    }, 75_000);
    async function restore(current: SessionToken) {
      if (!usable(current)) {
        await refresh(current);
        return;
      }
      const user = await api<User>('/users/me', { token: current.accessToken, signal: abort.signal });
      if (!abort.signal.aborted && active.current === current) {
        checkedToken.current = current.accessToken;
        setIdentity({ token: current.accessToken, user });
      }
    }
    void restore(session).catch((failure) => {
      if (!abort.signal.aborted && active.current === session) setError(explain(failure));
    }).finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      abort.abort();
    };
  }, [session, version, refresh]);

  useEffect(() => {
    if (!session || !identity) return;
    const expires = Date.parse(session.expiresAt);
    let timeout: number;
    function checkExpiry() {
      window.clearTimeout(timeout);
      if (!session || active.current !== session) return;
      const remaining = expires - Date.now();
      if (remaining <= 0) {
        void refresh(session).catch((failure) => {
          if (active.current !== session) return;
          checkedToken.current = undefined;
          setIdentity(undefined);
          setError(explain(failure));
        });
      }
      else timeout = window.setTimeout(checkExpiry, Math.min(2_147_483_647, remaining));
    }
    checkExpiry();
    window.addEventListener('focus', checkExpiry);
    return () => { window.clearTimeout(timeout); window.removeEventListener('focus', checkExpiry); };
  }, [session, identity, refresh]);

  useEffect(() => {
    function forgotInAnotherTab(event: StorageEvent) {
      const current = active.current;
      if (current?.sessionId && event.key === rememberedSessionKey(current.sessionId) && event.newValue === null) {
        clear(current.accessToken);
      }
    }
    window.addEventListener('storage', forgotInAnotherTab);
    return () => window.removeEventListener('storage', forgotInAnotherTab);
  }, [clear]);

  function updateUser(user: User) {
    setIdentity((current) => current && current.token === token ? { ...current, user } : current);
  }

  return {
    token,
    key: session?.sessionId ?? token,
    user: identity && identity.token === token ? identity.user : undefined,
    error,
    accounts: accounts.filter(({ session }) => savedAccountSession(session)).map(({ account }) => account),
    switchAccount,
    addAccount,
    establish,
    updateUser,
    clear,
    retry: () => { checkedToken.current = undefined; setError(''); setVersion((n) => n + 1); },
  };
}
