import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { User } from '../../../shared/types/api';
import { SettingsField } from './SettingsField';
import type { BioValue } from './BioEditor';
import { LocationFields } from './LocationFields';
import { DeleteSettings } from './DeleteSettings';
import { SocialLinksSettings } from './SocialLinksSettings';

const BioEditor = lazy(() => import('./BioEditor'));

type UserFormProps = { user: User; token: string; onUserChange: (user: User) => void };
type Feedback = { message: string; error?: boolean };
type Details = { fullName: string; email: string; bio: BioValue; location: string; countryCode: string; city: string; gender: NonNullable<User['gender']> | ''; phoneNumber: string };

const phonePattern = /^[+][1-9][0-9]{7,14}$/;
const credentialErrors = { 400: 'Joriy parolni va kiritilgan ma’lumotlarni tekshiring.' };

function fieldsFor(user: User): Details {
  return {
    fullName: user.fullName,
    email: user.email,
    bio: { text: user.bio ?? '', format: user.bioFormat ?? null },
    location: user.location ?? '',
    countryCode: user.countryCode ?? '',
    city: user.city ?? '',
    gender: user.gender ?? '',
    phoneNumber: user.phoneNumber ?? '',
  };
}

export function AccountSettings({ user, token, onUserChange, onDeleted }: UserFormProps & { onDeleted: () => void }) {
  return <>
    <ProfileDetails user={user} token={token} onUserChange={onUserChange} />
    <DeleteSettings token={token} userId={user.id} onDeleted={onDeleted} />
  </>;
}

function ProfileDetails({ user, token, onUserChange }: UserFormProps) {
  const [draft, setDraft] = useState<Details>(() => fieldsFor(user));
  const [locationReset, setLocationReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();
  const saved = fieldsFor(user);
  const name = draft.fullName.trim();
  const email = draft.email.trim().toLowerCase();
  const emailChanged = email !== saved.email;
  const bioChanged = draft.bio.text !== saved.bio.text || draft.bio.format !== saved.bio.format;
  const city = draft.city.trim();
  const placeChanged = draft.countryCode !== saved.countryCode || city !== saved.city;
  const phoneNumber = draft.phoneNumber.replace(/[\s().-]/g, '');
  const body = {
    ...(name !== saved.fullName ? { fullName: name } : {}),
    ...(emailChanged ? { email } : {}),
    ...(bioChanged ? { bio: draft.bio.text || null, bioFormat: draft.bio.format } : {}),
    ...(placeChanged ? { countryCode: draft.countryCode || null, city: city || null } : {}),
    ...(!placeChanged && draft.location !== saved.location ? { location: draft.location || null } : {}),
    ...(draft.gender !== saved.gender ? { gender: draft.gender || null } : {}),
    ...(phoneNumber !== saved.phoneNumber ? { phoneNumber: phoneNumber || null } : {}),
  };
  const changed = Object.keys(body).length > 0;
  function field<K extends keyof Details>(key: K, value: Details[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setFeedback(undefined);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !changed) return;
    if (!name || (phoneNumber && !phonePattern.test(phoneNumber))) {
      setFeedback({ error: true, message: !name ? 'Ism va familiyangizni kiriting.' : 'Telefon raqamini +998901234567 shaklida kiriting.' });
      return;
    }
    const currentPassword = emailChanged ? new FormData(event.currentTarget).get('currentPassword') : undefined;
    setBusy(true);
    try {
      const updated = await api<User>('/users/me', { token, method: 'PATCH', body: { ...body, currentPassword } });
      onUserChange(updated);
      setDraft(fieldsFor(updated));
      setFeedback({ message: emailChanged ? 'Profil saqlandi. Yangi emailni Privacy & Security bo‘limida tasdiqlang.' : 'Profil ma’lumotlari saqlandi.' });
    } catch (error) {
      const errors = emailChanged ? { ...credentialErrors, 409: 'Bu email boshqa akkauntda ishlatilmoqda.' } : {};
      setFeedback({ error: true, message: explain(error, errors) });
    } finally { setBusy(false); }
  }

  return <div>
    <form className="settings-form-section settings-profile-form" aria-labelledby="settings-profile-title" onSubmit={(event) => void save(event)}>
    <header className="settings-profile-header">
      <div>
        <h2 id="settings-profile-title">Shaxsiy ma’lumotlar</h2>
        <p>Ism, email va boshqa shaxsiy ma’lumotlaringizni shu yerda yangilang.</p>
      </div>
      <div className="settings-form-actions">
        <button type="button" className="button secondary" disabled={busy || !changed} onClick={() => { setDraft(saved); setLocationReset((value) => value + 1); setFeedback(undefined); }}>Bekor qilish</button>
        <button className="button primary" disabled={busy || !changed}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
      </div>
    </header>
    {feedback && <Notice error={feedback.error}>{feedback.message}</Notice>}
    <SettingsField id="settings-full-name" label="Ism va familiya" required>
      <input id="settings-full-name" name="fullName" autoComplete="name" value={draft.fullName} maxLength={255} required disabled={busy} onChange={(event) => field('fullName', event.target.value)} />
    </SettingsField>
    <SettingsField id="settings-email" label="Email manzili" required>
      <div className="settings-input-icon">
        <Mail size={17} aria-hidden="true" />
        <input id="settings-email" name="email" type="email" autoComplete="email" value={draft.email} maxLength={255} required disabled={busy} onChange={(event) => field('email', event.target.value)} />
      </div>
    </SettingsField>
    {emailChanged && <SettingsField id="settings-email-password" label="Joriy parol" required description="Email manzilini almashtirish uchun.">
      <input id="settings-email-password" name="currentPassword" type="password" autoComplete="current-password" maxLength={72} aria-describedby="settings-email-password-description" required disabled={busy} />
    </SettingsField>}
    <LocationFields key={locationReset} countryCode={draft.countryCode} city={draft.city}
      legacyLocation={saved.countryCode ? '' : draft.location} disabled={busy}
      onCountryChange={(countryCode) => {
        setDraft((previous) => ({ ...previous, countryCode, city: '', location: '' }));
        setFeedback(undefined);
      }}
      onCityChange={(city) => field('city', city)} onClearLegacy={() => field('location', '')} />
    <SettingsField id="settings-gender" label="Gender" optional>
      <select id="settings-gender" name="gender" value={draft.gender} disabled={busy} onChange={(event) => field('gender', event.target.value as Details['gender'])}>
        <option value="">Tanlang</option>
        <option value="female">Ayol</option>
        <option value="male">Erkak</option>
        <option value="other">Boshqa</option>
        <option value="undisclosed">Aytishni istamayman</option>
      </select>
    </SettingsField>
    <SettingsField id="settings-phone" label="Telefon raqami" optional>
      <input id="settings-phone" name="phoneNumber" type="tel" autoComplete="tel" maxLength={25} aria-describedby="settings-phone-format" value={draft.phoneNumber} disabled={busy} onChange={(event) => field('phoneNumber', event.target.value)} />
      <small id="settings-phone-format">Xalqaro formatda kiriting, masalan +998901234567.</small>
    </SettingsField>
    <SettingsField id="settings-bio" label="Bio" optional description="O‘zingizni qisqacha tanishtiring.">
      <Suspense fallback={<p className="settings-bio-loading" role="status">Bio muharriri yuklanmoqda…</p>}>
        <BioEditor id="settings-bio" value={draft.bio} disabled={busy} onChange={(value) => field('bio', value)} />
      </Suspense>
    </SettingsField>
    </form>
    <SocialLinksSettings user={user} token={token} onUserChange={onUserChange} disabled={busy} />
  </div>;
}
