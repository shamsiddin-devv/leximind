import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, explain, observeUnauthorized } from '../../../shared/services/api';
import type { SessionToken, User } from '../../../shared/types/api';

const storageKey = 'leximind.session';

function savedSession(): SessionToken | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as SessionToken | null;
    return typeof value?.accessToken === 'string' && Date.parse(value.expiresAt) > Date.now() ? value : null;
  } catch { return null; }
}

export function useSession() {
  const [session, setSession] = useState(savedSession);
  const [identity, setIdentity] = useState<{ token: string; user: User }>();
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const token = session?.accessToken;

  const clear = useCallback(() => {
    try { sessionStorage.removeItem(storageKey); } catch { /* Session remains memory-only. */ }
    setSession(null);
    setIdentity(undefined);
    setError('');
  }, []);

  function establish(value: SessionToken) {
    try { sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* Session remains memory-only. */ }
    setIdentity(undefined);
    setError('');
    setSession(value);
  }

  useEffect(() => observeUnauthorized((rejectedToken) => {
    if (rejectedToken === token) clear();
  }), [token, clear]);

  useEffect(() => {
    if (!token) return;
    const abort = new AbortController();
    void api<User>('/users/me', { token, signal: abort.signal }).then((user) => {
      if (!abort.signal.aborted) setIdentity({ token, user });
    }).catch((failure) => {
      if (abort.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) clear();
      else setError(explain(failure));
    });
    return () => abort.abort();
  }, [token, version, clear]);

  useEffect(() => {
    if (!session) return;
    const expires = Date.parse(session.expiresAt);
    let timeout: number;
    function checkExpiry() {
      window.clearTimeout(timeout);
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
    establish,
    updateUser,
    clear,
    retry: () => { setError(''); setVersion((n) => n + 1); },
  };
}
