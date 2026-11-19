import { useRef, useState, type FormEvent } from 'react';
import { Trash2, X } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';

const credentialErrors = { 400: 'Joriy parolni va kiritilgan ma’lumotlarni tekshiring.' };

export function DeleteSettings({ token, userId, onDeleted, privacy = false }: { token: string; userId: string; onDeleted: () => void; privacy?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const currentPassword = new FormData(event.currentTarget).get('currentPassword');
    setBusy(true);
    setError('');
    try {
      await api('/users/me', { token, method: 'DELETE', body: { currentPassword } });
      try { localStorage.removeItem('leximind.profile-banner.' + userId); } catch { /* Storage can be unavailable. */ }
      dialog.current?.close();
      onDeleted();
    } catch (failure) {
      setError(explain(failure, credentialErrors));
    } finally { setBusy(false); }
  }

  return <section className={privacy ? 'privacy-section privacy-row privacy-danger' : 'settings-form-section settings-account-danger'} aria-labelledby="settings-delete-title">
    <div>
      <h2 id="settings-delete-title">Akkauntni o‘chirish</h2>
      <p>O‘quv natijalaringiz va akkaunt ma’lumotlaringiz butunlay o‘chiriladi.</p>
    </div>
    <button type="button" className="button account-delete-button" onClick={() => dialog.current?.showModal()}>{privacy && <Trash2 size={16} aria-hidden="true" />}Akkauntni o‘chirish</button>
    <dialog ref={dialog} className="account-delete-dialog" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-note"
      onCancel={(event) => { if (busy) event.preventDefault(); }} onClose={() => { form.current?.reset(); setError(''); }}>
      <header><h2 id="delete-dialog-title">Akkauntni o‘chirish</h2>
        <button type="button" className="icon-button" aria-label="Yopish" disabled={busy} onClick={() => dialog.current?.close()}><X size={17} /></button>
      </header>
      <p id="delete-dialog-note">Tasdiqlash uchun joriy parolingizni kiriting.</p>
      <form ref={form} className="account-form" onSubmit={(event) => void remove(event)}>
        <label>Joriy parol<input type="password" name="currentPassword" autoComplete="current-password" maxLength={72} required disabled={busy} /></label>
        {error && <Notice error>{error}</Notice>}
        <div className="settings-form-actions settings-dialog-actions">
          <button type="button" className="button secondary" disabled={busy} onClick={() => dialog.current?.close()}>Bekor qilish</button>
          <button className="button account-delete-button" disabled={busy}>{busy ? 'O‘chirilmoqda…' : 'Butunlay o‘chirish'}</button>
        </div>
      </form>
    </dialog>
  </section>;
}
