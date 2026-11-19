import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Mail, Send } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { User } from '../../../shared/types/api';
import { LocationFields } from './LocationFields';

export type VerificationProps = { user: User; token: string; onUserChange: (user: User) => void };

export function badgeRequirements(user: User) {
  return [
    { label: 'Joylashuv', complete: Boolean(user.location) },
    { label: 'Gender', complete: Boolean(user.gender && user.gender !== 'undisclosed') },
    { label: 'Telefon raqami', complete: Boolean(user.phoneNumber) },
    { label: 'Email', complete: Boolean(user.emailVerifiedAt) },
  ];
}

const emailSteps = ['Email manzili', 'Tasdiqlash xati', 'Tasdiqlandi'];

function VerificationLayout({ title, description, labels, step, children }: {
  title: string; description: string; labels: string[]; step: number; children: ReactNode;
}) {
  return <div className="privacy-flow">
    <Link className="text-link privacy-back" href={routes.settingsPrivacy}><ArrowLeft size={16} aria-hidden="true" /> Privacy & Security</Link>
    <header className="privacy-flow-heading"><h1>{title}</h1><p>{description}</p></header>
    <ol className="privacy-steps" aria-label="Tasdiqlash bosqichlari">
      {labels.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} data-done={index < step}>
        <span aria-hidden="true">{index < step ? <Check size={14} /> : index + 1}</span>{label}
      </li>)}
    </ol>
    <div className="privacy-flow-content">{children}</div>
  </div>;
}

function useEmailVerification({ user, token, onUserChange }: VerificationProps) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<'send' | 'check'>();
  const [feedback, setFeedback] = useState<{ message: string; error?: boolean }>();

  async function verify(action: 'send' | 'check') {
    if (busy) return;
    setBusy(action);
    setFeedback(undefined);
    try {
      if (action === 'send') {
        await api('/auth/email-verification/request', { method: 'POST', body: { email: user.email } });
        setSent(true);
        setFeedback({ message: 'Tasdiqlash xati so‘raldi.' });
      } else {
        const next = await api<User>('/users/me', { token });
        onUserChange(next);
        if (!next.emailVerifiedAt) setFeedback({ message: 'Email hali tasdiqlanmagan. Xatdagi havolani ochib, qayta tekshiring.' });
      }
    } catch (error) {
      setFeedback({ error: true, message: explain(error, { 503: 'Email yuborish xizmati hozircha sozlanmagan.' }) });
    } finally {
      setBusy(undefined);
    }
  }

  return { sent, busy, feedback, verify };
}

export function EmailVerification(props: VerificationProps) {
  const email = useEmailVerification(props);
  const step = props.user.emailVerifiedAt ? 2 : email.sent ? 1 : 0;

  return <VerificationLayout title="Emailni tasdiqlash" description="Akkauntingizga bog‘langan email manzilini tasdiqlang." labels={emailSteps} step={step}>
    {step === 2 ? <div className="privacy-success">
      <Mail size={24} aria-hidden="true" /><h2>Email tasdiqlandi</h2><p>{props.user.email}</p>
      <Link className="button secondary" href={routes.settingsProfileBadge}>Profil tasdiq belgisiga o‘tish <ArrowRight size={16} aria-hidden="true" /></Link>
    </div> : <>
      <h2>{step === 0 ? 'Email manzilingizni tekshiring' : 'Xatdagi havolani oching'}</h2>
      <p>{step === 0 ? 'Tasdiqlash havolasi shu manzilga yuboriladi.' : 'Xat kelmasa, spam papkasini ham tekshiring. Havolani ochganingizdan keyin bu yerda holatni yangilashingiz mumkin.'}</p>
      <p className="privacy-verification-address"><Mail size={17} aria-hidden="true" />{props.user.email}</p>
      {email.feedback && <Notice error={email.feedback.error}>{email.feedback.message}</Notice>}
      <div className="privacy-flow-actions">
        {step === 0 ? <>
          <Link className="button quiet" href={routes.settingsAccount}>Emailni o‘zgartirish</Link>
          <button type="button" className="button primary" disabled={!!email.busy} onClick={() => void email.verify('send')}>
            <Send size={16} aria-hidden="true" />{email.busy === 'send' ? 'Yuborilmoqda…' : 'Tasdiqlash xatini yuborish'}
          </button>
        </> : <>
          <button type="button" className="button secondary" disabled={!!email.busy} onClick={() => void email.verify('send')}>
            {email.busy === 'send' ? 'Yuborilmoqda…' : 'Xatni qayta yuborish'}
          </button>
          <button type="button" className="button primary" disabled={!!email.busy} onClick={() => void email.verify('check')}>
            {email.busy === 'check' ? 'Tekshirilmoqda…' : 'Holatni tekshirish'}
          </button>
        </>}
      </div>
    </>}
  </VerificationLayout>;
}

const badgeTitles = ['Qayerdansiz?', 'Genderingizni tanlang', 'Telefon raqamingizni kiriting', 'Emailingizni tasdiqlang'];
const phonePattern = /^[+][1-9][0-9]{7,14}$/;

export function ProfileBadgeVerification({ user, token, onUserChange }: VerificationProps) {
  const requirements = badgeRequirements(user);
  const firstMissing = requirements.findIndex(({ complete }) => !complete);
  const [step, setStep] = useState(firstMissing === -1 ? 3 : firstMissing);
  const [place, setPlace] = useState({ countryCode: user.countryCode ?? '', city: user.city ?? '', legacyLocation: user.countryCode ? '' : user.location ?? '' });
  const [gender, setGender] = useState(user.gender === 'undisclosed' ? '' : user.gender ?? '');
  const [phone, setPhone] = useState(user.phoneNumber ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const title = useRef<HTMLHeadingElement>(null);

  function changeStep(next: number) {
    setError('');
    setStep(next);
    requestAnimationFrame(() => title.current?.focus());
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const number = phone.replace(/[\s().-]/g, '');
    if (step === 0 && !place.countryCode && !place.legacyLocation) { setError('Davlatni tanlang.'); return; }
    if (step === 1 && !gender) { setError('Davom etish uchun genderingizni tanlang.'); return; }
    if (step === 2 && !phonePattern.test(number)) { setError('Telefon raqamini +998901234567 formatida kiriting.'); return; }
    const body = step === 0 ? (place.countryCode ? { countryCode: place.countryCode, city: place.city.trim() || null } : { location: place.legacyLocation })
      : step === 1 ? { gender } : { phoneNumber: number };
    setBusy(true);
    try {
      onUserChange(await api<User>('/users/me', { token, method: 'PATCH', body }));
      changeStep(step + 1);
    } catch (failure) {
      setError(explain(failure));
    } finally {
      setBusy(false);
    }
  }

  return <VerificationLayout title="Profil tasdiq belgisi" description="Profil belgisini olish uchun to‘rtta talabni bajaring."
    labels={requirements.map(({ label }) => label)} step={user.hasProfileBadge ? 4 : step}>
    {user.hasProfileBadge ? <div className="privacy-success">
      <BadgeCheck size={28} aria-hidden="true" />
      <h2>Profil tasdiqlandi</h2><p>Tasdiq belgisi LexiMind profilingizda ko‘rinadi.</p>
      <Link className="button secondary" href={routes.profile}>Profilga o‘tish <ArrowRight size={16} aria-hidden="true" /></Link>
    </div> : <>
      <h2 ref={title} tabIndex={-1} id="badge-step-heading">{badgeTitles[step]}</h2>
      {step === 3 ? <>
        <p>Email tasdiqlangach, to‘rtta talab ham bajarilgan bo‘lsa, profil belgisi avtomatik beriladi.</p>
        <div className="privacy-flow-actions">
          <button type="button" className="button quiet" onClick={() => changeStep(step - 1)}>Orqaga</button>
          <Link className="button primary" href={routes.settingsVerifyEmail}>Emailni tasdiqlash <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </> : <form className="privacy-step-form" aria-labelledby="badge-step-heading" onSubmit={(event) => void save(event)}>
        {step === 0 && <LocationFields countryCode={place.countryCode} city={place.city} legacyLocation={place.legacyLocation} disabled={busy}
          onCountryChange={(countryCode) => setPlace({ countryCode, city: '', legacyLocation: '' })}
          onCityChange={(city) => setPlace((previous) => ({ ...previous, city }))}
          onClearLegacy={() => setPlace((previous) => ({ ...previous, legacyLocation: '' }))} />}
        {step === 1 && <label htmlFor="badge-gender">Gender
          <select id="badge-gender" name="gender" value={gender} required disabled={busy}
            onChange={(event) => setGender(event.target.value as typeof gender)}>
            <option value="">Tanlang</option><option value="female">Ayol</option><option value="male">Erkak</option><option value="other">Boshqa</option>
          </select>
        </label>}
        {step === 2 && <label htmlFor="badge-phone">Telefon raqami
          <input id="badge-phone" name="phoneNumber" type="tel" autoComplete="tel" placeholder="+998901234567" maxLength={25} required
            value={phone} disabled={busy} onChange={(event) => setPhone(event.target.value)} />
        </label>}
        {error && <Notice error>{error}</Notice>}
        <div className="privacy-flow-actions">
          {step > 0 && <button type="button" className="button quiet" disabled={busy} onClick={() => changeStep(step - 1)}>Orqaga</button>}
          <button className="button primary" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Davom etish'} <ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      </form>}
    </>}
  </VerificationLayout>;
}
