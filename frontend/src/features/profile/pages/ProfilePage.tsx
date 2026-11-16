import { useState, type FormEvent } from 'react';
import { BadgeCheck, BookOpen, CircleAlert, Flame, LogOut, Mail, Save, Settings2, UserRound } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { Profile, Statistics, User } from '../../../shared/types/api';

type Feedback = { message: string; error?: true };

type ProfileProps = {
  user: User;
  profile?: Profile;
  statistics?: Statistics;
  token: string;
  onUserChange: (user: User) => void;
  onProfileChange: (profile: Profile) => void;
  onLogout: () => void;
};

export function ProfilePage({ user, profile, statistics, token, onUserChange, onProfileChange, onLogout }: ProfileProps) {
  return <div className="container screen inner-screen profile-page">
    <div className="page-intro"><h1>Profil</h1><p>Shaxsiy ma’lumotlaringiz va o‘quv sozlamalaringiz.</p></div>
    <section className="panel profile-overview" aria-label="Profil xulosasi">
      <span className="profile-avatar" aria-hidden="true">{Array.from(user.fullName.trim())[0]?.toLocaleUpperCase()}</span>
      <div className="profile-identity"><h2>{user.fullName}</h2><p>{user.email}</p></div>
      {profile && <dl className="profile-metrics">
        <div><dt><BookOpen size={15} /> Daraja</dt><dd>{profile.level}</dd></div>
        <div><dt><Flame size={15} /> Faollik</dt><dd>{profile.streakDay} kun</dd></div>
        {statistics && <div><dt>So‘z kartalari</dt><dd>{statistics.cards}</dd></div>}
      </dl>}
    </section>
    <div className="profile-panels">
      <AccountDetails user={user} token={token} onUserChange={onUserChange} onLogout={onLogout} />
      {profile
        ? <LearningPreferences profile={profile} token={token} onProfileChange={onProfileChange} />
        : <section className="panel profile-panel" aria-labelledby="preferences-title">
          <div className="panel-label"><span className="mini-icon violet"><Settings2 size={19} /></span><h2 id="preferences-title">O‘quv sozlamalari</h2></div>
          <p>O‘quv ma’lumotlari hozircha mavjud emas.</p>
        </section>}
    </div>
  </div>;
}

function AccountDetails({ user, token, onUserChange, onLogout }: Pick<ProfileProps, 'user' | 'token' | 'onUserChange' | 'onLogout'>) {
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [busy, setBusy] = useState<'save' | 'verify' | 'logout'>();
  const [feedback, setFeedback] = useState<Feedback>();
  const name = fullName.trim();
  const address = email.trim().toLowerCase();
  const changed = name !== user.fullName || address !== user.email;

  async function run(action: 'save' | 'verify' | 'logout') {
    if (busy) return;
    if (action === 'save' && !name) { setFeedback({ message: 'Ism va familiyangizni kiriting.', error: true }); return; }
    setBusy(action);
    setFeedback(undefined);
    try {
      if (action === 'save') {
        const saved = await api<User>('/users/me', { token, method: 'PATCH', body: { fullName: name, email: address } });
        onUserChange(saved);
        setFullName(saved.fullName);
        setEmail(saved.email);
        setFeedback({ message: 'Shaxsiy ma’lumotlar saqlandi.' });
      } else if (action === 'verify') {
        await api('/auth/email-verification/request', { method: 'POST', body: { email: user.email } });
        setFeedback({ message: 'Tasdiqlash havolasi email manzilingizga yuboriladi.' });
      } else {
        await api('/auth/logout', { token, method: 'POST' });
        onLogout();
      }
    } catch (failure) {
      setFeedback({ message: explain(failure, action === 'save' ? { 409: 'Bu email manzili boshqa akkauntda ishlatilmoqda.' } : {}), error: true });
    } finally { setBusy(undefined); }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (changed) void run('save');
  }

  return <section className="panel profile-panel" aria-labelledby="account-title">
    <div className="panel-label"><span className="mini-icon blue"><UserRound size={19} /></span><h2 id="account-title">Shaxsiy ma’lumotlar</h2></div>
    <form className="account-form" onSubmit={save}>
      <label>Ism va familiya<input name="fullName" autoComplete="name" required maxLength={255} value={fullName} disabled={!!busy}
        onChange={(event) => setFullName(event.target.value)} /></label>
      <label>Email manzili<input name="email" type="email" autoComplete="email" required maxLength={255} value={email} disabled={!!busy}
        onChange={(event) => setEmail(event.target.value)} /></label>
      <div className="profile-form-actions">
        <button type="submit" className="button primary" disabled={!!busy || !changed}><Save size={17} /> {busy === 'save' ? 'Saqlanmoqda…' : 'Ma’lumotlarni saqlash'}</button>
      </div>
    </form>
    <div className="profile-verification">
      <span className={user.emailVerifiedAt ? 'email-verified' : 'email-unverified'}>
        {user.emailVerifiedAt ? <BadgeCheck size={17} /> : <CircleAlert size={17} />}
        {user.emailVerifiedAt ? 'Email tasdiqlangan' : 'Email tasdiqlanmagan'}
      </span>
      {!user.emailVerifiedAt && <button type="button" className="button secondary" disabled={!!busy || address !== user.email} onClick={() => void run('verify')}>
        <Mail size={16} /> {busy === 'verify' ? 'Yuborilmoqda…' : 'Tasdiqlash havolasini yuborish'}
      </button>}
    </div>
    {feedback && <Notice error={feedback.error}>{feedback.message}</Notice>}
    <button type="button" className="button quiet profile-logout" disabled={!!busy} onClick={() => void run('logout')}>
      <LogOut size={18} /> {busy === 'logout' ? 'Chiqilmoqda…' : 'Chiqish'}
    </button>
  </section>;
}

function LearningPreferences({ profile, token, onProfileChange }: { profile: Profile; token: string; onProfileChange: (value: Profile) => void }) {
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
    <div className="panel-label"><span className="mini-icon violet"><Settings2 size={19} /></span><h2 id="preferences-title">O‘quv sozlamalari</h2></div>
    <form className="account-form" onSubmit={(event) => void save(event)}>
      <label>Kunlik yangi so‘zlar<input type="number" name="dailyNewWords" min={1} max={100} required value={dailyWords}
        disabled={busy} onChange={(event) => setTarget(event.target.value)} /><small>Kuniga 1 dan 100 tagacha yangi so‘z.</small></label>
      <label className="switch-label"><input type="checkbox" checked={audioEnabled} disabled={busy} onChange={(event) => setSound(event.target.checked)} /> O‘yinlardagi meme ovozlari</label>
      {feedback && <Notice error={feedback.error}>{feedback.message}</Notice>}
      <div className="profile-form-actions"><button type="submit" className="button primary" disabled={busy || !changed}>
        <Save size={17} /> {busy ? 'Saqlanmoqda…' : 'Sozlamalarni saqlash'}
      </button></div>
    </form>
  </section>;
}
