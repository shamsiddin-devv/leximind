import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { minimumPasswordLength, WelcomePasswordField } from '../../auth/components/WelcomePasswordField';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';

const passwordFields = [
  { name: 'currentPassword', id: 'settings-current-password', label: 'Joriy parol', placeholder: 'Joriy parolni kiriting' },
  { name: 'newPassword', id: 'settings-new-password', label: 'Yangi parol', placeholder: 'Yangi parolni kiriting' },
  { name: 'confirmPassword', id: 'settings-confirm-password', label: 'Yangi parol tasdig‘i', placeholder: 'Yangi parolni qayta kiriting' },
] as const;

export function PasswordSettings({ token, onChanged }: { token: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [formVersion, setFormVersion] = useState(0);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const fields = new FormData(event.currentTarget);
    const currentPassword = String(fields.get('currentPassword'));
    const newPassword = String(fields.get('newPassword'));

    if (Array.from(newPassword).length < minimumPasswordLength || new TextEncoder().encode(newPassword).length > 72) {
      setError(`Yangi parol kamida ${minimumPasswordLength} ta belgi va ko‘pi bilan 72 bayt bo‘lishi kerak.`);
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

  return <section className="welcome-skin welcome-password-settings" aria-labelledby="settings-password-title">
    <header className="welcome-register-heading">
      <h1 id="settings-password-title">Parolni o‘zgartirish</h1>
      <p>Parolni yangilash uchun joriy parolingizni kiriting. Yangilangach, qurilmalaringizda qayta kirishingiz kerak bo‘ladi.</p>
    </header>
    <form aria-labelledby="settings-password-title" onSubmit={(event) => void save(event)} onReset={() => { setError(''); setFormVersion(previous => previous + 1); }}>
      <div className="welcome-register-fields" key={formVersion}>
        {passwordFields.map(({ name, id, label, placeholder }) => <WelcomePasswordField key={name} id={id} name={name}
          label={label} placeholder={placeholder} newPassword={name !== 'currentPassword'} hint={name === 'newPassword'}
          icon disabled={busy} revealAfterInput />)}
      </div>
      {error && <Notice error>{error}</Notice>}
      <div className="welcome-register-actions">
        <button type="reset" className="welcome-button" disabled={busy}>Bekor qilish</button>
        <button type="submit" className="welcome-button welcome-primary" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Parolni yangilash'} <ArrowRight size={16} /></button>
      </div>
    </form>
  </section>;
}
