import { useEffect, useState } from 'react';
import { api, explain } from '../../shared/services/api';

export type DeliveryCapabilities = { pushPublicKey: string | null; emailAvailable: boolean; deviceIds: string[] };
type Device = { id: string; userId: string };
const storedDevice = 'leximind.web-push-device';
const worker = import.meta.env.BASE_URL + 'leximind-push.js';

function readDevice(): Device | undefined {
  try {
    const device = JSON.parse(localStorage.getItem(storedDevice) ?? 'null');
    if (typeof device?.id === 'string' && typeof device.userId === 'string') return device;
  } catch { /* The browser may disallow local storage. */ }
}

function publicKeyBytes(key: string) {
  return Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(key.length / 4) * 4, '=')), (value) => value.charCodeAt(0));
}

export function PushDeviceControl({ token, userId, delivery, enabled }: { token: string; userId: string; delivery?: DeliveryCapabilities; enabled: boolean }) {
  const [device, setDevice] = useState<Device>();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const publicKey = delivery?.pushPublicKey;
  const supported = window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  useEffect(() => {
    if (!supported || !delivery) return;
    let closed = false;
    async function detect() {
      const existing = readDevice();
      try {
        const registration = await navigator.serviceWorker.getRegistration(worker);
        const subscription = await registration?.pushManager.getSubscription();
        if (!closed) setDevice((current) => subscription && existing?.userId === userId
          && (delivery?.deviceIds.includes(existing.id) || current?.id === existing.id) ? existing : undefined);
      } catch { if (!closed) setDevice(undefined); }
    }
    void detect();
    window.addEventListener('storage', detect);
    return () => { closed = true; window.removeEventListener('storage', detect); };
  }, [supported, userId, delivery]);

  async function toggle() {
    if (!supported || pending) return;
    setPending(true);
    setMessage('');
    try {
      if (device) {
        await api(`/notifications/push-subscriptions/${device.id}`, { token, method: 'DELETE' });
        const latest = readDevice();
        if (!latest || latest.id === device.id) {
          try { localStorage.removeItem(storedDevice); } catch { /* The in-memory state is cleared below. */ }
          const registration = await navigator.serviceWorker.getRegistration(worker);
          await (await registration?.pushManager.getSubscription())?.unsubscribe();
        }
        setDevice(undefined);
        return;
      }
      if (!publicKey || !enabled) return;
      if (await Notification.requestPermission() !== 'granted') {
        setMessage('Brauzer bildirishnoma ruxsatini bermadi. Ruxsatni sayt sozlamalaridan boshqarishingiz mumkin.');
        return;
      }
      await navigator.serviceWorker.register(worker);
      const registration = await navigator.serviceWorker.ready;
      const key = publicKeyBytes(publicKey);
      let subscription = await registration.pushManager.getSubscription();
      const previousKey = subscription?.options.applicationServerKey;
      if (subscription && previousKey && new Uint8Array(previousKey).some((value, index) => value !== key[index])) {
        await subscription.unsubscribe();
        subscription = null;
      }
      const created = !subscription;
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      try {
        const data = subscription.toJSON();
        const { id } = await api<{ id: string }>('/notifications/push-subscriptions', {
          token, method: 'POST', body: { endpoint: data.endpoint, keys: { p256dh: data.keys?.p256dh, auth: data.keys?.auth } },
        });
        const next = { id, userId };
        try { localStorage.setItem(storedDevice, JSON.stringify(next)); } catch { /* In-memory state remains available. */ }
        setDevice(next);
      } catch (error) {
        if (created) await subscription.unsubscribe().catch(() => false);
        throw error;
      }
    } catch (error) {
      setMessage(explain(error));
    } finally {
      setPending(false);
    }
  }

  if (!supported || (!publicKey && !device)) return null;
  return <div className="notification-device">
    <button type="button" className="button secondary" disabled={pending || (!enabled && !device)} onClick={() => void toggle()}>
      {pending ? 'So‘rov bajarilmoqda…' : device ? 'Bu qurilmada o‘chirish' : 'Bu qurilmada yoqish'}
    </button>
    {message && <small role="status">{message}</small>}
  </div>;
}
