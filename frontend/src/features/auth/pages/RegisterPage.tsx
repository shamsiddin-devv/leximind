import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Mail } from 'lucide-react';
import { Link, navigate, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { SessionToken } from '../../../shared/types/api';
import { EmailCodeField } from '../components/EmailCodeField';
import { RegisterOnboarding, type RegistrationPreferences } from '../components/RegisterOnboarding';
import { minimumPasswordLength, WelcomePasswordField } from '../components/WelcomePasswordField';
import { useEmailCodeCooldown } from '../hooks/useEmailCodeCooldown';
import './AuthWelcome.css';

type RegistrationDetails = RegistrationPreferences & {
  fullName: string;
  email: string;
  password: string;
  referralCode?: string;
};

const emailRequestErrors = {
  409: 'Bu email bilan akkaunt mavjud. Kirish sahifasidan foydalaning.',
  429: 'Hozir yangi kod yuborib bo‘lmadi. Biroz kutib, qayta urinib ko‘ring.',
  503: 'Email xizmati vaqtincha mavjud emas. Keyinroq qayta urinib ko‘ring.',
};

export function RegisterPage({ referralCode, onLogin }: {
  referralCode?: string;
  onLogin: (session: SessionToken) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [verification, setVerification] = useState<{ details: RegistrationDetails; registrationToken: string }>();
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const active = useRef<AbortController | null>(null);
  const cooldown = useEmailCodeCooldown();
  const referral = referralCode && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(referralCode)
    ? referralCode : undefined;

  useEffect(() => () => { active.current?.abort(); }, []);

  async function run(
    operation: (signal: AbortSignal) => Promise<void>,
    handleError: (failure: unknown) => string,
  ) {
    if (active.current) return;
    const request = new AbortController();
    active.current = request;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation(request.signal);
    } catch (failure) {
      if (!request.signal.aborted) setError(handleError(failure));
    } finally {
      if (!request.signal.aborted) {
        active.current = null;
        setBusy(false);
      }
    }
  }

  function requestCode(details: RegistrationDetails, resend = false) {
    return run(async (signal) => {
      const { registrationToken } = await api<{ registrationToken: string }>('/auth/register/request', {
        method: 'POST', signal, body: { email: details.email },
      });
      if (signal.aborted) return;
      setVerification({ details, registrationToken });
      cooldown.markSent();
      if (resend) setNotice('Yangi kod yuborish uchun qabul qilindi.');
      else window.scrollTo(0, 0);
    }, (failure) => explain(failure, emailRequestErrors));
  }

  function submitDetails(event: FormEvent<HTMLFormElement>, preferences: RegistrationPreferences) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get('password') ?? '');
    if (!fullName.trim()) {
      setError('Ism va familiyangizni kiriting.');
      return;
    }
    if (Array.from(password).length < minimumPasswordLength || new TextEncoder().encode(password).length > 72) {
      setError('Parol kamida 8 ta belgidan iborat va 72 baytdan oshmasligi kerak.');
      return;
    }
    void requestCode({ ...preferences, fullName: fullName.trim(), email: email.trim().toLowerCase(), password, referralCode: referral });
  }

  function confirmCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verification || created) return;
    const code = new FormData(event.currentTarget).get('code');
    const { details, registrationToken } = verification;
    let registered = false;
    void run(async (signal) => {
      const options = { method: 'POST', signal };
      await api('/auth/register', { ...options, body: { ...details, registrationToken, code } });
      registered = true;
      const session = await api<SessionToken>('/auth/login', {
        ...options, body: { email: details.email, password: details.password, rememberSession: true },
      });
      if (!signal.aborted) {
        onLogin(session);
        navigate(routes.dashboard, true);
      }
    }, (failure) => {
      if (registered) {
        setCreated(true);
        setVerification(undefined);
        return '';
      }
      return explain(failure, {
        ...emailRequestErrors,
        400: 'Kod noto‘g‘ri, muddati tugagan yoki urinishlar chegarasiga yetilgan. Kodni tekshiring yoki yangisini so‘rang.',
      });
    });
  }

  function editEmail() {
    setVerification(undefined);
    setError('');
    setNotice('');
    cooldown.clear();
  }

  const verificationForm = created ? <div className="welcome-register-form">
    <Notice>Email tasdiqlandi va hisob yaratildi. Parolingiz bilan kirishda davom eting.</Notice>
    <Link className="welcome-button welcome-primary" href={routes.login}>Kirish sahifasiga <ArrowRight size={16} aria-hidden="true" /></Link>
  </div> : verification && <form className="welcome-register-form" aria-labelledby="welcome-register-title" onSubmit={confirmCode}>
    <div className="welcome-register-fields">
      <div className="welcome-code-address">
        <Mail size={16} aria-hidden="true" />
        <strong>{verification.details.email}</strong>
        <button type="button" disabled={busy} onClick={editEmail}>Emailni o‘zgartirish</button>
      </div>
      <EmailCodeField key={verification.registrationToken} id="registration-code" disabled={busy} />
      <small>Xat kelmasa, Spam papkasini ham tekshiring.</small>
    </div>
    {error && <Notice error>{error}</Notice>}
    {notice && <Notice>{notice}</Notice>}
    <div className="welcome-register-actions">
      <div className="welcome-code-address">
        <button type="button" disabled={busy || cooldown.coolingDown}
          onClick={() => void requestCode(verification.details, true)}>Kodni qayta yuborish</button>
        {cooldown.coolingDown && <small>Qayta yuborish 1 daqiqadan keyin ochiladi.</small>}
      </div>
      <button className="welcome-button welcome-primary" type="submit" disabled={busy}>
        {busy ? 'Tekshirilmoqda…' : 'Tasdiqlash va kirish'} <Check size={16} aria-hidden="true" />
      </button>
    </div>
  </form>;

  return <RegisterOnboarding busy={busy || created} referred={Boolean(referral)} verification={verificationForm}
    onEditEmail={editEmail} renderForm={(preferences) =>
      <form className="welcome-register-form" aria-labelledby="welcome-register-title" onSubmit={(event) => submitDetails(event, preferences)}>
        <div className="welcome-register-fields">
          <div className="welcome-field">
            <label htmlFor="full-name">To‘liq ism va familiya</label>
            <input id="full-name" name="fullName" placeholder="Aziza Karimova" autoComplete="name" required maxLength={255} enterKeyHint="next"
              disabled={busy} value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div className="welcome-field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="siz@example.com" spellCheck={false} autoComplete="email" required maxLength={255}
              enterKeyHint="next" disabled={busy} value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <WelcomePasswordField id="password" name="password" label="Parol" placeholder="Kamida 8 belgi" newPassword hint disabled={busy} />
        </div>
        {error && <Notice error>{error}</Notice>}
        <div className="welcome-register-actions">
          <small>Hisobingiz bormi? <Link href={routes.login}>Kirish</Link></small>
          <button className="welcome-button welcome-primary" type="submit" disabled={busy}>
            {busy ? 'Yuborilmoqda…' : 'Emailga kod yuborish'} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </form>} />;
}
