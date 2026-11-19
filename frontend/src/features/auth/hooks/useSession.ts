import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, explain, observeUnauthorized } from '../../../shared/services/api';
import type { SessionToken, User } from '../../../shared/types/api';

const storageKey = 'leximind.session';
const accountsKey = 'leximind.accounts';
export type SessionAccount = Pick<User, 'id' | 'fullName' | 'email' | 'avatarUrl'>;
type StoredAccount = { account: SessionAccount; session: SessionToken };

function usable(value?: SessionToken | null): value is SessionToken {
  return typeof value?.accessToken === 'string' && Date.parse(value.expiresAt) > Date.now();
}

function savedAccounts(): StoredAccount[] {
  try {
    const entries: unknown = JSON.parse(sessionStorage.getItem(accountsKey) ?? '[]');
    return Array.isArray(entries) ? entries.filter((entry): entry is StoredAccount =>
      typeof entry?.account?.id === 'string' && typeof entry.account.email === 'string' &&
      typeof entry.account.fullName === 'string' && usable(entry.session)) : [];
  } catch { return []; }
}

function savedSession(): SessionToken | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as SessionToken | null;
    return usable(value) ? value : null;
  } catch { return null; }
}

export function useSession() {
  const [session, setSession] = useState(savedSession);
  const activeToken = useRef(session?.accessToken);
  const checkedToken = useRef<string | undefined>(undefined);
  const [accounts, setAccounts] = useState(savedAccounts);
  const [identity, setIdentity] = useState<{ token: string; user: User }>();
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const token = session?.accessToken;

  const clear = useCallback((expectedToken?: string) => {
    const previous = activeToken.current;
    if (expectedToken && previous !== expectedToken) return false;
    activeToken.current = undefined;
    checkedToken.current = undefined;
    try { sessionStorage.removeItem(storageKey); } catch { /* Session remains memory-only. */ }
    setAccounts((current) => current.filter((entry) => entry.session.accessToken !== previous));
    setSession(null);
    setIdentity(undefined);
    setError('');
    return true;
  }, []);

  function establish(value: SessionToken, user?: User) {
    activeToken.current = value.accessToken;
    checkedToken.current = user ? value.accessToken : undefined;
    try { sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* Session remains memory-only. */ }
    setIdentity(user ? { token: value.accessToken, user } : undefined);
    setError('');
    setSession(value);
  }

  useEffect(() => observeUnauthorized((rejectedToken) => {
    if (rejectedToken && rejectedToken === activeToken.current) clear();
  }), [clear]);

  useEffect(() => {
    if (!session || identity?.token !== session.accessToken) return;
    const { id, fullName, email, avatarUrl } = identity.user;
    setAccounts((current) => [{ account: { id, fullName, email, avatarUrl }, session },
      ...current.filter((entry) => entry.account.id !== id && usable(entry.session))]);
  }, [identity, session]);

  useEffect(() => {
    try { sessionStorage.setItem(accountsKey, JSON.stringify(accounts)); } catch { /* Sessions remain memory-only. */ }
  }, [accounts]);

  async function activate(target: SessionToken, previous = activeToken.current) {
    const user = await api<User>('/users/me', { token: target.accessToken });
    if (activeToken.current === previous) establish(target, user);
  }

  async function switchAccount(id: string) {
    const entry = accounts.find(({ account }) => account.id === id);
    try {
      if (usable(entry?.session)) {
        await activate(entry.session);
        return;
      }
    } catch (failure) {
      if (!(failure instanceof ApiError) || failure.status !== 401) throw failure;
    }
    setAccounts((current) => current.filter(({ account }) => account.id !== id));
    throw new ApiError(401);
  }

  async function addAccount(email: string, password: string) {
    const previous = activeToken.current;
    const newSession = await api<SessionToken>('/auth/login', { method: 'POST', body: { email, password } });
    if (previous && previous === activeToken.current) await activate(newSession, previous);
  }

  useEffect(() => {
    if (!token || checkedToken.current === token) return;
    const abort = new AbortController();
    const timeout = window.setTimeout(() => {
      abort.abort();
      setError('Sessiyani tekshirish cho‘zildi. Qayta urinib ko‘ring.');
    }, 15_000);
    void api<User>('/users/me', { token, signal: abort.signal }).then((user) => {
      if (!abort.signal.aborted && activeToken.current === token) {
        checkedToken.current = token;
        setIdentity({ token, user });
      }
    }).catch((failure) => {
      if (abort.signal.aborted || activeToken.current !== token) return;
      if (failure instanceof ApiError && failure.status === 401) clear();
      else setError(explain(failure));
    }).finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      abort.abort();
    };
  }, [token, version, clear]);

  useEffect(() => {
    if (!session) return;
    const expires = Date.parse(session.expiresAt);
    let timeout: number;
    function checkExpiry() {
      window.clearTimeout(timeout);
      if (activeToken.current !== session?.accessToken) return;
      const remaining = expires - Date.now();
      if (remaining <= 0) clear();
      else timeout = window.setTimeout(checkExpiry, Math.min(2_147_483_647, remaining));
    }
    checkExpiry();
    window.addEventListener('focus', checkExpiry);
    return () => { window.clearTimeout(timeout); window.removeEventListener('focus', checkExpiry); };
  }, [session, clear]);

  function updateUser(user: User) {
    setIdentity((current) => current && current.token === token ? { ...current, user } : current);
  }

  return {
    token,
    user: identity && identity.token === token ? identity.user : undefined,
    error,
    accounts: accounts.filter(({ session }) => usable(session)).map(({ account }) => account),
    switchAccount,
    addAccount,
    establish,
    updateUser,
    clear,
    retry: () => { checkedToken.current = undefined; setError(''); setVersion((n) => n + 1); },
  };
}
