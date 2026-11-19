import { useState, type FormEvent } from 'react';
import { CircleCheck, Eye, EyeOff } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import { SettingsField } from './SettingsField';

const passwordFields = [
  { name: 'currentPassword', id: 'settings-current-password', label: 'Joriy parol', placeholder: 'Joriy parolni kiriting', target: 'Joriy parolni' },
  { name: 'newPassword', id: 'settings-new-password', label: 'Yangi parol', placeholder: 'Yangi parolni kiriting', target: 'Yangi parolni' },
  { name: 'confirmPassword', id: 'settings-confirm-password', label: 'Yangi parolni takrorlang', placeholder: 'Yangi parolni qayta kiriting', target: 'Takrorlangan parolni' },
] as const;

type PasswordField = typeof passwordFields[number]['name'];

export function PasswordSettings({ token, onChanged }: { token: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState<Partial<Record<PasswordField, boolean>>>({});

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const fields = new FormData(event.currentTarget);
    const currentPassword = String(fields.get('currentPassword'));
    const newPassword = String(fields.get('newPassword'));

    if (Array.from(newPassword).length < 8 || new TextEncoder().encode(newPassword).length > 72) {
      setError('Yangi parol kamida 8 ta belgi va ko‘pi bilan 72 bayt bo‘lishi kerak.');
      return;
    }
    if (newPassword !== fields.get('confirmPassword')) {
      setError('Yangi parol va takrorlangan parol bir xil bo‘lishi kerak.');
      return;
    }

    setError('');
    setBusy(true);
    try {
      await api('/users/me/password', { token, method: 'PATCH', body: { currentPassword, newPassword } });
      onChanged();
    } catch (failure) {
      setError(explain(failure, { 400: 'Joriy parolni va kiritilgan ma’lumotlarni tekshiring.' }));
    } finally {
      setBusy(false);
    }
  }

  return <section className="settings-form-section settings-password-form" aria-labelledby="settings-password-title">
    <header className="settings-section-heading">
      <h1 id="settings-password-title" className="settings-password-heading" lang="en">Password</h1>
      <p>Parolni yangilash uchun joriy parolingizni kiriting. Yangilangach, qurilmalaringizda qayta kirishingiz kerak bo‘ladi.</p>
    </header>
    <form className="settings-row-form" onSubmit={(event) => void save(event)} onReset={() => { setError(''); setRevealed({}); }}>
      {passwordFields.map(({ name, id, label, placeholder, target }) => {
        const visible = Boolean(revealed[name]);
        const isCurrent = name === 'currentPassword';
        const showsHint = name === 'newPassword';
        const toggleLabel = `${target} ${visible ? 'yashirish' : 'ko‘rsatish'}`;
        return <SettingsField key={name} id={id} label={label} required>
          <div className="settings-password-control">
            <input id={id} name={name} type={visible ? 'text' : 'password'} placeholder={placeholder}
              autoComplete={isCurrent ? 'current-password' : 'new-password'} minLength={isCurrent ? undefined : 8} maxLength={72}
              aria-describedby={showsHint ? 'settings-password-length' : undefined} required disabled={busy}
              onChange={(event) => {
                if (!event.currentTarget.value && visible) setRevealed((previous) => ({ ...previous, [name]: false }));
              }} />
            <button type="button" className="settings-password-toggle" aria-label={toggleLabel} title={toggleLabel} aria-controls={id}
              disabled={busy} onClick={() => setRevealed((previous) => ({ ...previous, [name]: !previous[name] }))}>
              {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          {showsHint && <small id="settings-password-length" className="settings-password-hint"><CircleCheck size={15} aria-hidden="true" /> Kamida 8 ta belgi.</small>}
        </SettingsField>;
      })}
      {error && <Notice error>{error}</Notice>}
      <div className="settings-form-actions">
        <button type="reset" className="button secondary" disabled={busy}>Bekor qilish</button>
        <button type="submit" className="button primary" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Parolni yangilash'}</button>
      </div>
    </form>
  </section>;
}
