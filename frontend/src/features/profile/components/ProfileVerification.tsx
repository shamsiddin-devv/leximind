import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Mail, MapPin, Phone, Send, UserRound } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { User } from '../../../shared/types/api';
import { EmailCodeField } from '../../auth/components/EmailCodeField';
import { useEmailCodeCooldown } from '../../auth/hooks/useEmailCodeCooldown';
import { VerifiedBadge } from '../../../shared/components/VerifiedBadge';
import { VerificationAddress, type VerificationPlace } from './VerificationAddress';
import { VerifyPhoneStep } from './VerifyPhoneStep';
import './ProfileBadgeFlow.css';

export type VerificationProps = { user: User; token: string; onUserChange: (user: User) => void };

export function badgeRequirements(user: User) {
  return [
    { label: 'Manzil', complete: Boolean(user.countryCode && user.city && (user.countryCode !== 'UZ' || user.administrativeRegion)) },
    { label: 'Gender', complete: Boolean(user.gender && user.gender !== 'undisclosed') },
    { label: 'Telefon', complete: Boolean(user.phoneVerifiedAt) },
    { label: 'Email', complete: Boolean(user.emailVerifiedAt) },
  ];
}

const emailSteps = ['Email manzili', 'Bir martalik kod', 'Tasdiqlandi'];
type VerificationAction = 'send' | 'check' | 'code';

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
  const [busy, setBusy] = useState<VerificationAction>();
  const [feedback, setFeedback] = useState<{ message: string; error?: boolean }>();
  const codeCooldown = useEmailCodeCooldown();

  async function verify(action: VerificationAction, code?: FormDataEntryValue | null) {
    if (busy || (action === 'send' && codeCooldown.coolingDown)) return;
    setBusy(action);
    setFeedback(undefined);
    try {
      if (action === 'send') {
        await api('/auth/email-verification/request', { method: 'POST', body: { email: user.email } });
        setSent(true);
        codeCooldown.markSent();
        setFeedback({ message: 'Tasdiqlash xati so‘raldi. Xat kelmasa, spam papkasini ham tekshiring.' });
      } else {
        if (action === 'code') {
          await api('/auth/email-verification/confirm-code', { method: 'POST', body: { email: user.email, code } });
        }
        const next = await api<User>('/users/me', { token });
        onUserChange(next);
        if (!next.emailVerifiedAt) setFeedback({ message: 'Email hali tasdiqlanmagan. Xatdagi kodni kiriting.' });
      }
    } catch (error) {
      const errors: Record<number, string> = { 503: 'Email yuborish xizmati hozircha ishlamayapti.' };
      if (action === 'code') errors[400] = 'Kod noto‘g‘ri, muddati tugagan yoki urinishlar chegarasiga yetilgan.';
      setFeedback({ error: true, message: explain(error, errors) });
    } finally {
      setBusy(undefined);
    }
  }

  return { sent, busy, feedback, verify, coolingDown: codeCooldown.coolingDown };
}

export function EmailVerification(props: VerificationProps) {
  const email = useEmailVerification(props);
  const step = props.user.emailVerifiedAt ? 2 : email.sent ? 1 : 0;

  return <VerificationLayout title="Emailni tasdiqlash" description="Akkauntingizga bog‘langan email manzilini tasdiqlang." labels={emailSteps} step={step}>
    {step === 2 ? <div className="privacy-success">
      <Mail size={24} aria-hidden="true" /><h2>Email tasdiqlandi</h2><p>{props.user.email}</p>
      <Link className="button secondary" href={routes.settingsProfileBadge}>Profil tasdiq belgisiga o‘tish <ArrowRight size={16} aria-hidden="true" /></Link>
    </div> : <>
      <h2 id="verify-email-heading">{step === 0 ? 'Email manzilingizni tekshiring' : 'Tasdiqlash kodini kiriting'}</h2>
      <p>{step === 0 ? 'Bir martalik kod shu manzilga yuboriladi.' : 'Kodni LexiMind yuborgan xatdan topasiz.'}</p>
      <p className="privacy-verification-address"><Mail size={17} aria-hidden="true" />{props.user.email}</p>
      {email.feedback && <Notice error={email.feedback.error}>{email.feedback.message}</Notice>}
      {step === 0 ? <div className="privacy-flow-actions">
          <Link className="button quiet" href={routes.settingsAccount}>Emailni o‘zgartirish</Link>
          <button type="button" className="button primary" disabled={!!email.busy} onClick={() => void email.verify('send')}>
            <Send size={16} aria-hidden="true" />{email.busy === 'send' ? 'Yuborilmoqda…' : 'Kod yuborish'}
          </button>
      </div> : <form className="privacy-step-form" aria-labelledby="verify-email-heading" onSubmit={(event) => {
        event.preventDefault();
        void email.verify('code', new FormData(event.currentTarget).get('code'));
      }}>
        <EmailCodeField id="verification-code" />
        <div className="privacy-flow-actions">
          <button type="submit" className="button primary" disabled={!!email.busy}>
            {email.busy === 'code' ? 'Tekshirilmoqda…' : 'Emailni tasdiqlash'}
          </button>
          <button type="button" className="button secondary" disabled={!!email.busy || email.coolingDown} onClick={() => void email.verify('send')}>
            {email.busy === 'send' ? 'Yuborilmoqda…' : 'Kodni qayta yuborish'}
          </button>
          <button type="button" className="button quiet" disabled={!!email.busy} onClick={() => void email.verify('check')}>
            {email.busy === 'check' ? 'Tekshirilmoqda…' : 'Holatni tekshirish'}
          </button>
        </div>
        {email.coolingDown && <p>1 daqiqadan keyin yangi kod so‘rashingiz mumkin.</p>}
      </form>}
    </>}
  </VerificationLayout>;
}

const badgeStages = [
  { title: 'Yashash hududingiz', description: 'Davlat va shahar yoki tumanni tanlang.', icon: MapPin },
  { title: 'Genderingizni tanlang', description: '', icon: UserRound },
  { title: 'Telefon raqamingizni tasdiqlang', description: 'Telegram orqali bir martalik kod oling.', icon: Phone },
  { title: 'Emailingizni tasdiqlang', description: 'Email manzilingizga yuborilgan kod orqali yakunlang.', icon: Mail },
];

export function ProfileBadgeVerification({ user, token, onUserChange }: VerificationProps) {
  const requirements = badgeRequirements(user);
  const completed = requirements.filter(({ complete }) => complete).length;
  const firstIncomplete = requirements.findIndex(({ complete }) => !complete);
  const [step, setStep] = useState(() => firstIncomplete === -1 ? 4 : firstIncomplete);
  const [place, setPlace] = useState<VerificationPlace>({
    countryCode: user.countryCode ?? '', administrativeRegion: user.administrativeRegion ?? '',
    city: user.city ?? '', streetAddress: user.streetAddress ?? '', addressDetails: user.addressDetails ?? '',
  });
  const [gender, setGender] = useState(user.gender === 'undisclosed' ? '' : user.gender ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  const stage = badgeStages[step];

  function changeStep(next: number) {
    setError('');
    setStep(next);
    requestAnimationFrame(() => title.current?.focus());
  }

  function continueFrom(nextUser = user) {
    if (nextUser.hasProfileBadge) {
      changeStep(4);
      return;
    }
    const statuses = badgeRequirements(nextUser);
    const next = statuses.findIndex(({ complete }, index) => index > step && !complete);
    changeStep(next < 0 ? Math.max(0, statuses.findIndex(({ complete }) => !complete)) : next);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const body = step === 0 ? {
      countryCode: place.countryCode, city: place.city.trim(), administrativeRegion: place.administrativeRegion.trim() || null,
      streetAddress: place.streetAddress.trim() || null, addressDetails: place.addressDetails.trim() || null,
    } : { gender };
    if (step === 0 && (!place.countryCode || !place.city.trim() || place.countryCode === 'UZ' && !place.administrativeRegion.trim())) {
      setError('Davlat, viloyat va shahar yoki tuman tanlovini tekshiring.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const next = await api<User>('/users/me', { token, method: 'PATCH', body });
      onUserChange(next);
      continueFrom(next);
    } catch (failure) {
      setError(explain(failure));
    } finally {
      setBusy(false);
    }
  }

  return <div className="profile-badge-flow">
    <Link className="text-link privacy-back" href={routes.settingsPrivacy}><ArrowLeft size={16} aria-hidden="true" /> Privacy &amp; Security</Link>
    <header className="profile-badge-heading">
      <div className="profile-badge-emblem"><VerifiedBadge size={41} decorative /></div>
      <div><h1>Profil tasdiq belgisi</h1><p>To‘rtta qadamni yakunlang va tasdiq belgisini profilingizga qo‘shing.</p></div>
    </header>
    <div className="profile-badge-workspace">
      <aside className="profile-badge-checklist" aria-label="Tasdiqlash holati">
        <div className="badge-progress-label"><strong>Tasdiqlash jarayoni</strong><span>{completed} / 4</span></div>
        <progress max={4} value={completed} aria-label="Bajarilgan talablar" />
        <ol>
          {requirements.map(({ label, complete }, index) => {
            const Icon = badgeStages[index].icon;
            return <li key={label}><button type="button" disabled={busy || firstIncomplete !== -1 && index > firstIncomplete && !complete}
              aria-current={step === index ? 'step' : undefined} onClick={() => changeStep(index)}>
              <Icon size={17} aria-hidden="true" /><span>{label}</span>
              {complete ? <Check size={16} className="badge-step-check" role="img" aria-label="Bajarildi" /> : <span className="badge-step-number" aria-hidden="true">{index + 1}</span>}
            </button></li>;
          })}
        </ol>
      </aside>
      <section className="profile-badge-panel" aria-labelledby="badge-step-heading">
        {stage ? <>
          <h2 ref={title} tabIndex={-1} id="badge-step-heading">{stage.title}</h2>
          {stage.description && <p>{stage.description}</p>}
          {step === 3 ? <>
            {user.emailVerifiedAt && <Notice>Email manzilingiz tasdiqlangan.</Notice>}
            <div className="privacy-flow-actions">
              <button type="button" className="button quiet" onClick={() => changeStep(2)}>Orqaga</button>
              {user.emailVerifiedAt ? <button type="button" className="button primary" onClick={() => continueFrom()}>Davom etish <ArrowRight size={16} aria-hidden="true" /></button>
                : <Link className="button primary" href={routes.settingsVerifyEmail}>Emailni tasdiqlash <ArrowRight size={16} aria-hidden="true" /></Link>}
            </div>
          </> : step === 2 ? <VerifyPhoneStep user={user} token={token} onBack={() => changeStep(1)}
            onContinue={(next) => {
              if (next) onUserChange(next);
              continueFrom(next);
            }} /> : <form className="privacy-step-form" aria-labelledby="badge-step-heading" onSubmit={(event) => void save(event)}>
            {step === 0 && <VerificationAddress place={place} onChange={setPlace} disabled={busy} />}
            {step === 1 && <label htmlFor="badge-gender">Gender
              <select id="badge-gender" name="gender" value={gender} required disabled={busy}
                onChange={(event) => setGender(event.target.value as typeof gender)}>
                <option value="">Tanlang</option><option value="female">Ayol</option><option value="male">Erkak</option><option value="other">Boshqa</option>
              </select>
            </label>}
            {error && <Notice error>{error}</Notice>}
            <div className="privacy-flow-actions">
              {step > 0 && <button type="button" className="button quiet" disabled={busy} onClick={() => changeStep(step - 1)}>Orqaga</button>}
              <button className="button primary" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Davom etish'} <ArrowRight size={16} aria-hidden="true" /></button>
            </div>
          </form>}
        </> : <div className="profile-badge-success">
          <VerifiedBadge size={62} decorative />
          <h2 ref={title} tabIndex={-1} id="badge-step-heading">Profil tasdiqlandi</h2>
          <p>Tasdiq belgisi ismingiz yonida ko‘rinadi.</p>
          <Link className="button primary" href={routes.profile}>Profilga o‘tish <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>}
      </section>
    </div>
    <p className="profile-badge-privacy"><LockKeyhole size={16} aria-hidden="true" /> Telefon raqamingiz, emailingiz va to‘liq manzilingiz faqat sizga ko‘rinadi.</p>
  </div>;
}
