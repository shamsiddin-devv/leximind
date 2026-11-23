import { useRef, useState } from 'react';
import { BadgeCheck, Bell, CircleAlert, GraduationCap, Settings2, UserRound, Volume2, type LucideIcon } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { Profile, User } from '../../../shared/types/api';
import type { PreferenceSave } from '../hooks/usePreferenceSave';

type Feedback = { message: string; error?: true };
export type ProfileIdentityDraft = { fullName?: string; bio?: string };
const maxBioLength = 280;

export function ProfileSectionHeading({ id, icon: Icon, title, description }: {
  id: string; icon: LucideIcon; title: string; description: string;
}) {
  return <header className="profile-section-heading">
    <span className="profile-panel-icon"><Icon size={19} aria-hidden="true" /></span>
    <div><h2 id={id}>{title}</h2><p>{description}</p></div>
  </header>;
}

export function AccountDetails({ user, token, onUserChange, vertical, draft, onDraftChange }: {
  user: User; token: string; onUserChange: (user: User) => void; vertical?: boolean;
  draft: ProfileIdentityDraft; onDraftChange: (draft: ProfileIdentityDraft) => void;
}) {
  const [saving, setSaving] = useState(false);
  const requestPending = useRef(false);
  const [feedback, setFeedback] = useState<Feedback>();
  const fullName = draft.fullName ?? user.fullName;
  const bio = draft.bio ?? user.bio ?? '';

  async function save() {
    if (requestPending.current) return;
    const name = fullName.trim();
    if (!name) { setFeedback({ message: 'Ism va familiyangizni kiriting.', error: true }); return; }
    const nextBio = bio.trim() || null;
    const changes = {
      ...(name !== user.fullName ? { fullName: name } : {}),
      ...(nextBio !== (user.bio ?? null) ? { bio: nextBio } : {}),
    };
    if (Object.keys(changes).length === 0) {
      if (draft.fullName !== undefined || draft.bio !== undefined) onDraftChange({});
      return;
    }
    requestPending.current = true;
    setSaving(true);
    setFeedback(undefined);
    try {
      const saved = await api<User>('/users/me', { token, method: 'PATCH', body: changes });
      onUserChange(saved);
      onDraftChange({});
      setFeedback({ message: 'Shaxsiy ma’lumotlar saqlandi.' });
    } catch (failure) {
      setFeedback({ message: explain(failure), error: true });
    } finally {
      requestPending.current = false;
      setSaving(false);
    }
  }

  const verification = <div className="profile-verification">
    <span className={user.emailVerifiedAt ? 'email-verified' : 'email-unverified'}>
      {user.emailVerifiedAt ? <BadgeCheck size={17} aria-hidden="true" /> : <CircleAlert size={17} aria-hidden="true" />}
      {user.emailVerifiedAt ? 'Email tasdiqlangan' : 'Email tasdiqlanmagan'}
    </span>
    {!user.emailVerifiedAt && <Link className="text-link profile-verify-link" href={routes.settingsVerifyEmail}>Tasdiqlash</Link>}
  </div>;

  return <section className="profile-panel" aria-labelledby="account-title">
    <ProfileSectionHeading id="account-title" icon={UserRound}
      title={vertical ? 'Profil ma’lumotlari' : 'Shaxsiy ma’lumotlar'} description="Profilingizdagi asosiy ma’lumotlarni yangilang." />
    <form className="account-form profile-account-form" onSubmit={(event) => { event.preventDefault(); void save(); }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) void save();
      }}>
      <label>
        <span>Ism va familiya</span>
        <input id="profile-full-name" name="fullName" autoComplete="name" required maxLength={255} value={fullName} readOnly={saving}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          onChange={(event) => { onDraftChange({ ...draft, fullName: event.target.value }); setFeedback(undefined); }} />
      </label>
      <label>
        <span>Email manzili</span>
        <input type="email" value={user.email} readOnly />
      </label>
      <label className="profile-bio-field">
        <span>Bio</span>
        <textarea name="bio" rows={3} maxLength={maxBioLength} value={bio} readOnly={saving}
          placeholder="O‘zingiz haqingizda qisqacha yozing"
          aria-describedby="profile-bio-hint"
          onChange={(event) => { onDraftChange({ ...draft, bio: event.target.value }); setFeedback(undefined); }} />
        <small id="profile-bio-hint">Maydonlardan chiqqanda avtomatik saqlanadi · {bio.length}/{maxBioLength}</small>
      </label>
    </form>
    {verification}
    {saving && <p role="status">Saqlanmoqda…</p>}
    {feedback && <Notice error={feedback.error}>{feedback.message}</Notice>}
  </section>;
}

function ProfilePreferenceToggle({ id, label, description, icon: Icon, checked, onChange }: {
  id: string; label: string; description: string; icon: LucideIcon; checked: boolean; onChange: (checked: boolean) => void;
}) {
  return <div className="profile-preference-row">
    <span className="profile-preference-icon"><Icon size={17} aria-hidden="true" /></span>
    <div>
      <label htmlFor={id}>{label}</label>
      <small id={id + '-hint'}>{description}</small>
    </div>
    <span className="profile-sound-control">
      <input type="checkbox" role="switch" id={id} checked={checked} aria-describedby={id + '-hint'}
        onChange={(event) => onChange(event.currentTarget.checked)} />
      <span className="profile-sound-track" aria-hidden="true" />
    </span>
  </div>;
}

export function LearningPreferences({ profile, preferences }: {
  profile: Profile; preferences: PreferenceSave;
}) {
  const { save, pending, status } = preferences;
  const [wordsInput, setWordsInput] = useState<string>();
  const [invalidWords, setInvalidWords] = useState(false);
  const dailyWords = pending.dailyNewWords ?? profile.dailyNewWords;
  const audioEnabled = pending.feedbackAudioEnabled ?? profile.feedbackAudioEnabled;
  const reminderEnabled = pending.studyReminderEnabled ?? profile.studyReminderEnabled;

  function commitWords(input: HTMLInputElement) {
    if (wordsInput === undefined) return;
    if (!input.validity.valid) {
      setInvalidWords(true);
      return;
    }
    setWordsInput(undefined);
    if (input.valueAsNumber !== dailyWords) save({ dailyNewWords: input.valueAsNumber });
  }

  return <section className="profile-panel" aria-labelledby="preferences-title">
    <ProfileSectionHeading id="preferences-title" icon={Settings2} title="O‘quv sozlamalari"
      description="Maqsad, ovoz va eslatmalarni sozlang." />
    <div className="account-form profile-preferences">
      <div className="profile-preference-row">
        <span className="profile-preference-icon"><GraduationCap size={17} aria-hidden="true" /></span>
        <div>
          <label htmlFor="profile-daily-words">Kunlik yangi so‘zlar</label>
          <small id="profile-daily-words-hint">1 dan 100 gacha. Enter yoki maydondan chiqish bilan saqlanadi.</small>
        </div>
        <input id="profile-daily-words" type="number" name="dailyNewWords" min={1} max={100} required value={wordsInput ?? dailyWords}
          aria-invalid={invalidWords || undefined} aria-describedby="profile-daily-words-hint"
          onChange={(event) => { setWordsInput(event.currentTarget.value); setInvalidWords(false); }}
          onBlur={(event) => commitWords(event.currentTarget)}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
      </div>
      {invalidWords && <Notice error>1 dan 100 gacha butun son kiriting.</Notice>}
      <ProfilePreferenceToggle id="profile-feedback-audio" icon={Volume2} label="O‘yinlardagi meme ovozlari"
        description="Mashq javoblariga ovozli munosabat." checked={audioEnabled}
        onChange={(checked) => save({ feedbackAudioEnabled: checked })} />
      <ProfilePreferenceToggle id="profile-study-reminder" icon={Bell} label="O‘qish eslatmalari"
        description="LexiMind ochiq bo‘lganda kundalik mashqni eslatadi." checked={reminderEnabled}
        onChange={(checked) => save({ studyReminderEnabled: checked })} />
      {status && <Notice error={status.error}>{status.message}</Notice>}
    </div>
  </section>;
}
