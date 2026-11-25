import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ExternalLink, Send } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { User } from '../../../shared/types/api';
import { EmailCodeField } from '../../auth/components/EmailCodeField';
import { useEmailCodeCooldown } from '../../auth/hooks/useEmailCodeCooldown';

const endpoint = '/users/me/phone-verification';
function localDigits(value: string) {
  const digits = value.replace(/[^0-9]/g, '');
  return digits.length > 9 && digits.startsWith('998') ? digits.slice(3, 12) : digits.slice(0, 9);
}
function displayPhone(digits: string) {
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7)].filter(Boolean).join(' ');
}

export function VerifyPhoneStep({ user, token, onBack, onContinue }: {
  user: User; token: string; onBack: () => void; onContinue: (user?: User) => void;
}) {
  const [phone, setPhone] = useState(user.phoneNumber?.startsWith('+998') ? localDigits(user.phoneNumber) : '');
  const [available, setAvailable] = useState<boolean>();
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const cursor = useRef<number | undefined>(undefined);
  const cooldown = useEmailCodeCooldown();
  const verified = Boolean(user.phoneVerifiedAt && user.phoneNumber === '+998' + phone);

  useEffect(() => {
    let active = true;
    void api<{ available: boolean }>(endpoint, { token }).then(
      (status) => { if (active) setAvailable(status.available); },
      () => { if (active) setError('Telegram holatini tekshirib bo‘lmadi. Keyinroq urinib ko‘ring.'); },
    );
    return () => { active = false; };
  }, [token]);

  useLayoutEffect(() => {
    if (cursor.current === undefined || !input.current) return;
    input.current.setSelectionRange(cursor.current, cursor.current);
    cursor.current = undefined;
  });

  async function start() {
    if (busy || !available || phone.length !== 9) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ url: string }>(endpoint + '/request', { method: 'POST', token, body: { phoneNumber: '+998' + phone } });
      setLink(result.url);
      cooldown.markSent();
    } catch (failure) {
      setError(explain(failure, { 429: 'Yangi havola olishdan oldin bir daqiqa kuting.', 503: 'Telegram tasdiqlash xizmati hozircha ulanmagan.' }));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (verified) { onContinue(); return; }
    if (!link) { await start(); return; }
    const code = new FormData(event.currentTarget).get('code');
    setBusy(true);
    setError('');
    try {
      const next = await api<User>(endpoint + '/confirm', { method: 'POST', token, body: { code } });
      onContinue(next);
    } catch (failure) {
      setError(explain(failure, { 400: 'Kod noto‘g‘ri yoki eskirgan. Telegram’da raqamingizni yuborganingizni tekshiring.' }));
    } finally {
      setBusy(false);
    }
  }

  return <form className="privacy-step-form" aria-labelledby="badge-step-heading" onSubmit={(event) => void submit(event)}>
    <label htmlFor="badge-phone">Telefon raqami
      <span className="badge-phone-field">
        <span aria-hidden="true">+998</span>
        <input ref={input} id="badge-phone" name="phoneNumber" type="tel" inputMode="numeric" autoComplete="tel-national"
          placeholder="97 192 22 27" aria-describedby="badge-phone-note" required pattern="[0-9]{2} [0-9]{3} [0-9]{2} [0-9]{2}"
          value={displayPhone(phone)} readOnly={Boolean(link)} disabled={busy}
          onKeyDown={(event) => {
            const { value, selectionStart, selectionEnd } = event.currentTarget;
            if (link || event.key !== 'Backspace' || selectionStart === null ||
              selectionStart !== selectionEnd || value[selectionStart - 1] !== ' ') return;
            event.preventDefault();
            const previousDigit = value.slice(0, selectionStart).replace(/[^0-9]/g, '').length - 1;
            cursor.current = displayPhone(phone.slice(0, previousDigit)).length;
            setPhone(phone.slice(0, previousDigit) + phone.slice(previousDigit + 1));
          }}
          onChange={(event) => {
            const { value, selectionStart } = event.currentTarget;
            const next = localDigits(value);
            const before = value.slice(0, selectionStart ?? value.length).replace(/[^0-9]/g, '').length;
            if (next !== phone && value.replace(/[^0-9]/g, '').length <= 9) {
              cursor.current = displayPhone(next.slice(0, before)).length;
            }
            setPhone(next);
          }} />
      </span>
      <small id="badge-phone-note">O‘zbekiston raqamingizning 9 ta raqamini kiriting. Bo‘sh joylar avtomatik qo‘shiladi.</small>
    </label>
    {verified && <Notice>Telefon raqami tasdiqlangan.</Notice>}
    {!verified && available === false && <Notice>Telegram orqali tasdiqlash xizmati hozircha ulanmagan.</Notice>}
    {link && <>
      <p>Telegram botini oching, «Start» ni bosing va «Raqamimni yuborish» tugmasi orqali raqamingizni ulashing.</p>
      <a className="button secondary badge-telegram-link" href={link} target="_blank" rel="noreferrer">
        Telegram botini ochish <ExternalLink size={15} aria-hidden="true" />
      </a>
      <EmailCodeField id="badge-phone-code" hint="Telegram botidagi 6 xonali kodni kiriting." />
      {cooldown.coolingDown && <small>Yangi havolani bir daqiqadan so‘ng olish mumkin.</small>}
    </>}
    {error && <Notice error>{error}</Notice>}
    <div className="privacy-flow-actions">
      <button type="button" className="button quiet" disabled={busy} onClick={onBack}>Orqaga</button>
      {link && <>
        <button type="button" className="button quiet" disabled={busy} onClick={() => { setLink(''); setError(''); }}>Raqamni tahrirlash</button>
        <button type="button" className="button secondary" disabled={busy || cooldown.coolingDown} onClick={() => void start()}>Yangi havola</button>
      </>}
      <button className="button primary" disabled={busy || !verified && (!available || phone.length !== 9 || !link && cooldown.coolingDown)}>
        {busy ? 'Tekshirilmoqda…' : verified ? 'Davom etish' : link ? 'Kodni tasdiqlash' : 'Telegram havolasini olish'}
        {link || verified ? <ArrowRight size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
      </button>
    </div>
  </form>;
}
