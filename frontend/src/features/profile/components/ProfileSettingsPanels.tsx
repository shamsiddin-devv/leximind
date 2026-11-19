import { useState, type FormEvent } from 'react';
import { BadgeCheck, CircleAlert, Mail, Pencil, Save, Settings2, UserRound } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { Profile, User } from '../../../shared/types/api';

type Feedback = { message: string; error?: true };

export function AccountDetails({ user, token, onUserChange }: {
  user: User; token: string; onUserChange: (user: User) => void;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [busy, setBusy] = useState<'save' | 'verify'>();
  const [feedback, setFeedback] = useState<Feedback>();
  const name = fullName.trim();
  const address = email.trim().toLowerCase();
  const changed = name !== user.fullName || address !== user.email;

  async function run(action: 'save' | 'verify', currentPassword?: FormDataEntryValue | null) {
    if (busy) return;
    if (action === 'save' && !name) { setFeedback({ message: 'Ism va familiyangizni kiriting.', error: true }); return; }
    setBusy(action);
    setFeedback(undefined);
    try {
      if (action === 'save') {
        const body = { fullName: name, ...(address === user.email ? {} : { email: address, currentPassword }) };
        const saved = await api<User>('/users/me', { token, method: 'PATCH', body });
        onUserChange(saved);
        setFullName(saved.fullName);
        setEmail(saved.email);
        setFeedback({ message: 'Shaxsiy ma’lumotlar saqlandi.' });
      } else {
        await api('/auth/email-verification/request', { method: 'POST', body: { email: user.email } });
        setFeedback({ message: 'Tasdiqlash havolasi email manzilingizga yuboriladi.' });
      }
    } catch (failure) {
      setFeedback({ message: explain(failure, action === 'save' ? { 400: 'Joriy parolni va kiritilgan ma’lumotlarni tekshiring.', 409: 'Bu email manzili boshqa akkauntda ishlatilmoqda.' } : {}), error: true });
    } finally { setBusy(undefined); }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (changed) void run('save', new FormData(event.currentTarget).get('currentPassword'));
  }

  const verification = <div className="profile-verification">
    <span className={user.emailVerifiedAt ? 'email-verified' : 'email-unverified'}>
      {user.emailVerifiedAt ? <BadgeCheck size={17} aria-hidden="true" /> : <CircleAlert size={17} aria-hidden="true" />}
      {user.emailVerifiedAt ? 'Email tasdiqlangan' : 'Email tasdiqlanmagan'}
    </span>
    {!user.emailVerifiedAt && <button type="button" className="button secondary"
      disabled={!!busy || address !== user.email} onClick={() => void run('verify')}>
      <Mail size={16} aria-hidden="true" /> {busy === 'verify' ? 'Yuborilmoqda…' : 'Tasdiqlash havolasini yuborish'}
    </button>}
  </div>;

  return <section className="panel profile-panel" aria-labelledby="account-title">
    <div className="profile-account-heading">
      <div className="panel-label"><span className="mini-icon profile-panel-icon"><UserRound size={17} aria-hidden="true" /></span><h2 id="account-title">Shaxsiy ma’lumotlar</h2></div>
      <button type="button" className="button secondary profile-edit" lang="en"
        onClick={() => document.getElementById('profile-full-name')?.focus()}>
        <Pencil size={15} aria-hidden="true" /> Edit profile
      </button>
    </div>
    <form className="account-form" onSubmit={save}>
      <label>Ism va familiya<input id="profile-full-name" name="fullName" autoComplete="name" required maxLength={255} value={fullName} disabled={!!busy}
        onChange={(event) => setFullName(event.target.value)} /></label>
      <label>Email manzili<input name="email" type="email" autoComplete="email" required maxLength={255} value={email} disabled={!!busy}
        onChange={(event) => setEmail(event.target.value)} /></label>
      {address !== user.email && <label>Joriy parol
        <input name="currentPassword" type="password" autoComplete="current-password" maxLength={72} required disabled={!!busy} />
      </label>}
      {changed && <div className="profile-form-actions">
        <button type="submit" className="button primary" disabled={!!busy}>
          <Save size={15} aria-hidden="true" /> {busy === 'save' ? 'Saqlanmoqda…' : 'Ma’lumotlarni saqlash'}
        </button>
      </div>}
    </form>
    {verification}
    {feedback && <Notice error={feedback.error}>{feedback.message}</Notice>}
  </section>;
}

export function LearningPreferences({ profile, token, onProfileChange }: {
  profile: Profile; token: string; onProfileChange: (value: Profile) => void;
}) {
  const [target, setTarget] = useState<string>();
  const [sound, setSound] = useState<boolean>();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();
  const dailyWords = target ?? String(profile.dailyNewWords);
  const audioEnabled = sound ?? profile.feedbackAudioEnabled;
  const changed = Number(dailyWords) !== profile.dailyNewWords || audioEnabled !== profile.feedbackAudioEnabled;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !changed) return;
    const body = {
      ...(Number(dailyWords) !== profile.dailyNewWords ? { dailyNewWords: Number(dailyWords) } : {}),
      ...(audioEnabled !== profile.feedbackAudioEnabled ? { feedbackAudioEnabled: audioEnabled } : {}),
    };
    setBusy(true);
    setFeedback(undefined);
    try {
      onProfileChange(await api<Profile>('/profile', { token, method: 'PATCH', body }));
      setTarget(undefined);
      setSound(undefined);
      setFeedback({ message: 'Sozlamalar saqlandi.' });
    } catch (failure) {
      setFeedback({ message: explain(failure), error: true });
    } finally { setBusy(false); }
  }

  return <section className="panel profile-panel" aria-labelledby="preferences-title">
    <div className="panel-label"><span className="mini-icon profile-panel-icon"><Settings2 size={17} aria-hidden="true" /></span><h2 id="preferences-title">O‘quv sozlamalari</h2></div>
    <form className="account-form" onSubmit={(event) => void save(event)}>
      <label>Kunlik yangi so‘zlar<input type="number" name="dailyNewWords" min={1} max={100} required value={dailyWords}
        aria-describedby="profile-daily-words-hint" disabled={busy} onChange={(event) => setTarget(event.target.value)} /></label>
      <small id="profile-daily-words-hint" className="profile-sr-only">Kuniga 1 dan 100 tagacha yangi so‘z.</small>
      <label className="profile-sound">
        <span>O‘yinlardagi meme ovozlari</span>
        <span className="profile-sound-control">
          <input type="checkbox" role="switch" checked={audioEnabled} disabled={busy}
            onChange={(event) => setSound(event.target.checked)} />
          <span className="profile-sound-track" aria-hidden="true" />
        </span>
      </label>
      {feedback && <Notice error={feedback.error}>{feedback.message}</Notice>}
      <div className="profile-form-actions"><button type="submit" className="button primary" disabled={busy || !changed}>
        <Save size={15} aria-hidden="true" /> {busy ? 'Saqlanmoqda…' : 'Sozlamalarni saqlash'}
      </button></div>
    </form>
  </section>;
}
