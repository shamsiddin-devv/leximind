import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { Link, navigate, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import { api, ApiError, explain } from '../../../shared/services/api';
import type { SessionToken } from '../../../shared/types/api';
import { AuthLayout } from '../components/AuthLayout';
import { EmailCodeField } from '../components/EmailCodeField';
import { useEmailCodeCooldown } from '../hooks/useEmailCodeCooldown';
import { minimumPasswordLength, WelcomePasswordField } from '../components/WelcomePasswordField';
import './AuthWelcome.css';

export type AccountLink = { action: 'verify_email' | 'reset_password'; token: string };
type Mode = 'login' | 'recover' | 'reset' | 'verify';
const copy = {
  login: { title: 'Xush kelibsiz', description: 'Davom etish uchun hisobingizga kiring.', action: 'Kirish' },
  recover: { title: 'Parolni tiklash', description: 'Tiklash kodini olish uchun email manzilingizni kiriting.', action: 'Kod yuborish' },
  reset: { title: 'Yangi parol o‘rnating', description: 'LexiMind akkauntingiz uchun yangi parol kiriting.', action: 'Parolni saqlash' },
  verify: { title: 'Emailni tasdiqlash', description: 'Email manzilingizni tasdiqlash uchun quyidagi tugmani bosing.', action: 'Emailni tasdiqlash' },
};

export function AuthPage({ mode, link, signedIn, onLogin, onConfirmed }: {
  mode: Mode; link?: AccountLink; signedIn?: boolean; onLogin: (session: SessionToken) => void; onConfirmed: (action: AccountLink['action']) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const codeCooldown = useEmailCodeCooldown();
  const active = useRef<AbortController | null>(null);
  const enteringCode = mode === 'recover' && Boolean(recoveryEmail);
  const needsEmail = mode === 'login' || (mode === 'recover' && !enteringCode);
  const needsPassword = mode === 'login' || mode === 'reset' || enteringCode;
  const newPassword = mode === 'reset' || enteringCode;
  const content = enteringCode ? { ...copy.reset, description: 'Emaildagi kodni va yangi parolingizni kiriting.' } : copy[mode];
  const returnToVerification = mode === 'verify' && signedIn;
  const returnLink = returnToVerification ? routes.settingsVerifyEmail : routes.login;
  const returnLabel = returnToVerification ? 'Tasdiqlash sahifasiga' : 'Kirish sahifasiga';

  useEffect(() => () => { active.current?.abort(); }, []);

  async function requestRecoveryCode(email: string, signal: AbortSignal) {
    await api('/auth/password-reset/request', { method: 'POST', signal, body: { email } });
    setRecoveryEmail(email);
    codeCooldown.markSent();
    setMessage('Agar bu email ro‘yxatdan o‘tgan bo‘lsa, kod yuboriladi. Spam papkasini ham tekshiring.');
  }

  async function resendCode() {
    if (active.current || codeCooldown.coolingDown) return;
    const request = new AbortController();
    active.current = request;
    setBusy(true); setError(''); setMessage('');
    try {
      await requestRecoveryCode(recoveryEmail, request.signal);
    } catch (failure) {
      if (!request.signal.aborted) setError(explain(failure, { 429: 'So‘rovlar ko‘payib ketdi. Birozdan keyin qayta urinib ko‘ring.' }));
    } finally {
      if (!request.signal.aborted) { active.current = null; setBusy(false); }
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current || complete || invalidLink) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') ?? '').trim();
    const password = String(fields.get('password') ?? '');
    if (newPassword && Array.from(password).length < minimumPasswordLength) {
      setError('Parol kamida ' + minimumPasswordLength + ' belgidan iborat bo‘lishi kerak.');
      return;
    }
    if (newPassword && new TextEncoder().encode(password).length > 72) {
      setError('Parol 72 baytdan oshmasligi kerak. Qisqaroq parol kiriting.');
      return;
    }
    const request = new AbortController();
    active.current = request;
    const options = { method: 'POST', signal: request.signal };
    setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'recover') {
        if (enteringCode) {
          await api('/auth/password-reset/confirm-code', {
            ...options, body: { email: recoveryEmail, code: fields.get('code'), password },
          });
          setMessage('Parol yangilandi. Yangi parol bilan kiring.');
          setComplete(true);
          onConfirmed('reset_password');
        } else await requestRecoveryCode(email, request.signal);
        return;
      }
      if (link && (mode === 'reset' || mode === 'verify')) {
        const endpoint = mode === 'reset' ? 'password-reset' : 'email-verification';
        await api('/auth/' + endpoint + '/confirm', { ...options, body: { token: link.token, ...(mode === 'reset' ? { password } : {}) } });
        setMessage(mode === 'reset' ? 'Parol yangilandi. Yangi parol bilan kiring.' : 'Email tasdiqlandi.');
        setComplete(true);
        onConfirmed(link.action);
        return;
      }
      const session = await api<SessionToken>('/auth/login', { ...options, body: { email, password, rememberSession: true } });
      if (!request.signal.aborted) { onLogin(session); navigate(routes.dashboard, true); }
    } catch (failure) {
      if (request.signal.aborted) return;
      if (link && failure instanceof ApiError && failure.status === 400) {
        setInvalidLink(true);
        setError('Havola yaroqsiz, muddati tugagan yoki ishlatib bo‘lingan.');
      } else {
        const errors: Record<number, string> = {
          409: 'Havola eskirgan yoki ilgari ishlatilgan.',
        };
        if (mode === 'recover') {
          errors[503] = 'Parolni tiklash uchun email xizmati hozircha ishlamayapti.';
          if (enteringCode) errors[400] = 'Kod noto‘g‘ri, muddati tugagan yoki urinishlar chegarasiga yetilgan.';
        }
        setError(explain(failure, errors));
      }
    } finally {
      if (!request.signal.aborted) { active.current = null; setBusy(false); }
    }
  }

  function accountForm() {
    return <form className="welcome-login-form" aria-labelledby="welcome-login-title" onSubmit={(event) => void submit(event)}>
      {!complete && !invalidLink && (needsEmail || needsPassword) && <div className="welcome-login-fields">
        {needsEmail && <div className="welcome-field"><label htmlFor="email">Email</label>
          <div className="welcome-input-wrap"><Mail className="welcome-input-icon" size={16} aria-hidden="true" />
            <input id="email" name="email" type="email" placeholder="siz@example.com" spellCheck={false}
              autoComplete={mode === 'login' ? 'username' : 'email'} required maxLength={255} enterKeyHint={needsPassword ? 'next' : 'send'} />
          </div>
        </div>}
        {enteringCode && <>
          <div className="welcome-code-address">
            <span>{recoveryEmail}</span>
            <button type="button" disabled={busy} onClick={() => {
              setRecoveryEmail(''); setMessage(''); setError(''); codeCooldown.clear();
            }}>O‘zgartirish</button>
          </div>
          <EmailCodeField id="recovery-code" />
        </>}
        {needsPassword && <WelcomePasswordField id="password" name="password" label={mode === 'reset' || enteringCode ? 'Yangi parol' : 'Parol'}
          placeholder={newPassword ? 'Kamida 8 belgi' : '••••••••'} newPassword={newPassword} hint={newPassword} icon />}
      </div>}
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {enteringCode && !complete && <div className="welcome-code-address">
        <button type="button" disabled={busy || codeCooldown.coolingDown} onClick={() => void resendCode()}>Kodni qayta yuborish</button>
        {codeCooldown.coolingDown && <span>1 daqiqadan keyin qayta so‘rashingiz mumkin.</span>}
      </div>}
      {invalidLink
        ? <AccountLinkActions action={link?.action} signedIn={signedIn} />
        : complete
        ? <Link className="welcome-button welcome-primary" href={returnLink}>{returnLabel} <ArrowRight size={16} /></Link>
        : <button className="welcome-button welcome-primary" disabled={busy} type="submit">{busy ? 'Yuborilmoqda…' : content.action} <ArrowRight size={16} /></button>}
    </form>;
  }

  return <AuthLayout title={content.title} description={content.description} login={mode === 'login'}>{accountForm()}</AuthLayout>;
}

function AccountLinkActions({ action, signedIn }: { action?: AccountLink['action']; signedIn?: boolean }) {
  return <>
    {action !== 'verify_email' && <Link className="welcome-button welcome-primary" href={routes.recover}>
      Yangi tiklash kodini so‘rash <ArrowRight size={16} aria-hidden="true" />
    </Link>}
    {action !== 'reset_password' && <Link className={'welcome-button ' + (action === 'verify_email' ? 'welcome-primary' : 'welcome-login-register')}
      href={signedIn ? routes.settingsVerifyEmail : routes.login}>
      {signedIn ? 'Emailni tasdiqlash' : 'Emailni tasdiqlash uchun kirish'} <ArrowRight size={16} aria-hidden="true" />
    </Link>}
  </>;
}

export function MissingAccountLink({ signedIn }: { signedIn: boolean }) {
  return <AuthLayout title="Havola to‘liq emas" description="Emaildagi havolani to‘liq oching yoki yangi kod so‘rang.">
    <div className="welcome-login-form"><AccountLinkActions signedIn={signedIn} /></div>
  </AuthLayout>;
}
