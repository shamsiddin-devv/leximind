import { useEffect, useState } from 'react';
import { LogOut, Monitor, Smartphone } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { AccountSession } from '../../../shared/types/api';

function deviceName(agent: string | null) {
  if (!agent) return 'Qurilma ma’lumoti mavjud emas';
  const browser = agent.includes('Edg') ? 'Edge' : agent.includes('Firefox') || agent.includes('FxiOS') ? 'Firefox'
    : agent.includes('Chrome') || agent.includes('CriOS') ? 'Chrome' : agent.includes('Safari') ? 'Safari' : 'Brauzer';
  const platform = agent.includes('Android') ? 'Android' : agent.includes('iPhone') || agent.includes('iPad') ? 'iOS'
    : agent.includes('Windows') ? 'Windows' : agent.includes('Macintosh') ? 'macOS' : agent.includes('Linux') ? 'Linux' : '';
  return platform ? browser + ' · ' + platform : browser;
}

const deviceTime = new Intl.DateTimeFormat('uz-Latn-UZ', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});

export function DeviceSessions({ token, privacy = false }: { token: string; privacy?: boolean }) {
  const [sessions, setSessions] = useState<AccountSession[]>();
  const [retryCount, setRetryCount] = useState(0);
  const [revoking, setRevoking] = useState<string>();
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void api<AccountSession[]>('/auth/sessions', { token, signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setSessions([...result].sort((a, b) => Number(b.current) - Number(a.current)));
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(explain(failure));
    });
    return () => controller.abort();
  }, [token, retryCount]);

  async function revoke(id: string) {
    if (revoking) return;
    setRevoking(id);
    setError('');
    try {
      await api('/auth/sessions/' + id, { token, method: 'DELETE' });
      setSessions((current) => current?.filter((session) => id === 'others' ? session.current : session.id !== id));
    } catch (failure) {
      setError(explain(failure));
    } finally { setRevoking(undefined); }
  }

  return <section className={privacy ? 'privacy-section privacy-devices' : 'settings-form-section settings-devices'} aria-labelledby="settings-devices-title">
    <header className={privacy ? 'privacy-row privacy-heading' : 'settings-section-heading'}>
      <div>
        <h2 id="settings-devices-title">{privacy ? 'Faol seanslar' : 'Qurilmalar'}</h2>
        <p>{privacy ? 'Hisobingizga kirilgan qurilmalar.' : 'Akkauntingizga kirilgan qurilmalarni ko‘ring va kerak bo‘lsa boshqa seanslarni yakunlang.'}</p>
      </div>
      {privacy && <button type="button" className="button secondary" onClick={() => void revoke('others')}
        disabled={Boolean(revoking) || !sessions?.some((session) => !session.current)}>
        <LogOut size={16} aria-hidden="true" />{revoking === 'others' ? 'Yakunlanmoqda…' : 'Boshqalardan chiqish'}
      </button>}
    </header>
    {error && <Notice error>{error}</Notice>}
    {!sessions ? error
      ? <div><button type="button" className="button secondary" onClick={() => { setError(''); setRetryCount((count) => count + 1); }}>Qayta urinish</button></div>
      : <p role="status">Qurilmalar yuklanmoqda…</p>
      : sessions.length === 0 ? <p>Faol seanslar yo‘q.</p>
      : <ul className="account-device-list">
        {sessions.map((session) => {
          const DeviceIcon = /Android|iPhone|iPad/i.test(session.userAgent ?? '') ? Smartphone : Monitor;
          const title = session.current && !session.userAgent ? 'Joriy qurilma' : deviceName(session.userAgent);
          return <li key={session.id}>
            <DeviceIcon size={20} className="account-device-icon" aria-hidden="true" />
            <div className="account-device-details">
              <div className="account-device-title">
                <strong>{title}</strong>
                {session.current && !privacy && <span className="account-device-current">Joriy seans</span>}
              </div>
              {privacy && session.current ? <span>Hozir faol</span>
                : <time dateTime={session.createdAt}>{deviceTime.format(new Date(session.createdAt))}</time>}
            </div>
            {session.current && privacy && <span className="account-device-current">Shu qurilma</span>}
            {!session.current && <button type="button" className="button quiet" aria-label={'Seansni yakunlash · ' + title}
              disabled={Boolean(revoking)} onClick={() => void revoke(session.id)}>
              {revoking === session.id ? 'Yakunlanmoqda…' : 'Seansni yakunlash'}
            </button>}
          </li>;
        })}
      </ul>}
  </section>;
}
