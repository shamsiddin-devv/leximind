import { useEffect, useRef } from 'react';
import './EmailCodeField.css';

export function EmailCodeField({ id, hint = 'Xatdagi 6 xonali kodni kiriting.', disabled = false }: { id: string; hint?: string; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);

  return <label className="email-code-field" htmlFor={id}>
    Bir martalik kod
    <input ref={input} id={id} name="code" type="text" inputMode="numeric" autoComplete="one-time-code"
      pattern="[0-9]{6}" maxLength={6} placeholder="000000" spellCheck={false}
      aria-describedby={id + '-hint'} disabled={disabled} required />
    <small id={id + '-hint'}>{hint}</small>
  </label>;
}
