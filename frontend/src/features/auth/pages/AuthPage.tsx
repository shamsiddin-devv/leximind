import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { Link, navigate, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { SessionToken } from '../../../shared/types/api';

export type AccountLink = { action: 'verify_email' | 'reset_password'; token: string };
type Mode = 'login' | 'register' | 'recover' | 'reset' | 'verify';
const minimumPasswordLength = 8;

const copy = {
  login: { title: 'Xush kelibsiz!', description: 'Takrorlash rejangiz va natijalaringizga qayting.', action: 'Kirish' },
  register: { title: 'Ro‘yxatdan o‘ting', description: 'Shaxsiy lug‘atingizni yarating va birinchi mashqni boshlang.', action: 'Akkaunt yaratish' },
  recover: { title: 'Parolni tiklash', description: 'Email manzilingizni kiriting. Tiklash havolasini shu manzilga yuboramiz.', action: 'Havola yuborish' },
  reset: { title: 'Yangi parol yarating', description: 'LexiMind akkauntingiz uchun yangi parol kiriting.', action: 'Parolni saqlash' },
  verify: { title: 'Emailni tasdiqlash', description: 'Email manzilingizni tasdiqlash uchun quyidagi tugmani bosing.', action: 'Emailni tasdiqlash' },
};

export function AuthPage({ mode, link, onLogin, onConfirmed }: {
  mode: Mode; link?: AccountLink; onLogin: (session: SessionToken) => void; onConfirmed: (action: AccountLink['action']) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [created, setCreated] = useState(false);
  const active = useRef<AbortController | null>(null);
  const register = mode === 'register';
  const needsEmail = mode === 'login' || register || mode === 'recover';
  const needsPassword = mode === 'login' || register || mode === 'reset';
  const newPassword = register || mode === 'reset';
  const content = copy[mode];

  useEffect(() => () => { active.current?.abort(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current || complete || created) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') ?? '').trim();
    const password = String(fields.get('password') ?? '');
    const fullName = String(fields.get('fullName') ?? '').trim();
    if (register && !fullName) { setError('Ism va familiyangizni kiriting.'); return; }
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
    let registered = false;
    setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'recover') {
        await api('/auth/password-reset/request', { ...options, body: { email } });
        setMessage('Agar bu email ro‘yxatdan o‘tgan bo‘lsa, tiklash havolasi yuboriladi.');
        setComplete(true);
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
      if (register) {
        await api('/auth/register', { ...options, body: { fullName, email, password } });
        registered = true;
      }
      const session = await api<SessionToken>('/auth/login', { ...options, body: { email, password } });
      if (!request.signal.aborted) { onLogin(session); navigate(routes.dashboard, true); }
    } catch (failure) {
      if (request.signal.aborted) return;
      if (registered) {
        setCreated(true);
        setMessage('Akkaunt yaratildi. Kirish sahifasida parolingiz bilan davom eting.');
      } else {
        setError(explain(failure, {
          409: register ? 'Bu email bilan akkaunt mavjud. Kirish sahifasidan foydalaning.' : 'Havola eskirgan yoki ilgari ishlatilgan.',
        }));
      }
    } finally {
      if (!request.signal.aborted) { active.current = null; setBusy(false); }
    }
  }

  return <div className="container auth-shell screen">
    <aside className="auth-aside">
      <div className="art-rings" aria-hidden="true" />
      <div className="auth-aside-copy">
        <span className="mini-icon"><BookOpen size={21} /></span>
        <h2>Bugungi bir so‘z.<br />Ertangi bir suhbat.</h2>
        <p>So‘z kartalari, qisqa o‘yinlar va shaxsiy takrorlash rejasi.</p>
      </div>
      <img src="/learning-book.webp" alt="" width="840" height="560" />
    </aside>
    <section className="auth-content" aria-labelledby="auth-title">
      <Link className="auth-back text-link" href={mode === 'login' || register ? routes.home : routes.login}><ArrowLeft size={16} /> {mode === 'login' || register ? 'Bosh sahifa' : 'Kirish sahifasi'}</Link>
      <div className="auth-heading"><span className="tile-icon blue">{mode === 'verify' ? <Mail size={23} /> : <KeyRound size={23} />}</span>
        <h1 id="auth-title">{content.title}</h1><p>{content.description}</p></div>
      <form className="account-form auth-form" onSubmit={(event) => void submit(event)}>
        {register && !created && <label htmlFor="full-name">Ism va familiya<input id="full-name" name="fullName" autoComplete="name" required maxLength={255} enterKeyHint="next" /></label>}
        {needsEmail && !complete && !created && <label htmlFor="email">Email manzili
          <input id="email" name="email" type="email" autoComplete={mode === 'login' ? 'username' : 'email'} spellCheck={false} required maxLength={255} enterKeyHint={needsPassword ? 'next' : 'send'} />
        </label>}
        {needsPassword && !complete && !created && <div className="password-field">
          <div className="password-label"><label htmlFor="password">{mode === 'reset' ? 'Yangi parol' : 'Parol'}</label>
            {mode === 'login' && <Link className="text-link" href={routes.recover}>Parolni unutdingizmi?</Link>}</div>
          <div className="password-input"><input id="password" type={showPassword ? 'text' : 'password'} name="password"
            minLength={newPassword ? minimumPasswordLength : undefined} maxLength={72} autoComplete={newPassword ? 'new-password' : 'current-password'}
            aria-describedby={newPassword ? 'password-hint' : undefined} required enterKeyHint="go" />
            <button type="button" className="icon-button" aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
              onClick={() => setShowPassword((previous) => !previous)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          {newPassword && <small id="password-hint">Kamida {minimumPasswordLength} belgi.</small>}
        </div>}
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        {complete || created
          ? <Link className="button primary" href={routes.login}>Kirish sahifasiga <ArrowRight size={18} /></Link>
          : <button className="button primary" disabled={busy} type="submit">{busy ? 'Yuborilmoqda…' : content.action} <ArrowRight size={18} /></button>}
      </form>
      {(mode === 'login' || register) && <p className="auth-switch">{register ? 'Akkauntingiz bormi?' : 'LexiMind’da yangimisiz?'}{' '}
        <Link className="text-link" href={register ? routes.login : routes.register}>{register ? 'Kirish' : 'Ro‘yxatdan o‘tish'}</Link></p>}
    </section>
  </div>;
}
