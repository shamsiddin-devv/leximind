import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';

export const minimumPasswordLength = 8;

export function WelcomePasswordField({ id, name, label, placeholder, newPassword = false, hint = false, icon = false, disabled = false, revealAfterInput = false }: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  newPassword?: boolean;
  hint?: boolean;
  icon?: boolean;
  disabled?: boolean;
  revealAfterInput?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const hintId = id + '-hint';

  return <div className="welcome-field">
    <label htmlFor={id}>{label}</label>
    <div className="welcome-input-wrap welcome-input-password" data-reveal-after-input={revealAfterInput || undefined}>
      {icon && <LockKeyhole className="welcome-input-icon" size={16} aria-hidden="true" />}
      <input id={id} name={name} type={visible ? 'text' : 'password'} placeholder={placeholder}
        autoComplete={newPassword ? 'new-password' : 'current-password'} minLength={newPassword ? minimumPasswordLength : undefined}
        required disabled={disabled} maxLength={72} aria-describedby={hint ? hintId : undefined}
        onChange={event => { if (!event.currentTarget.value) setVisible(false); }} />
      <button type="button" className="welcome-password-toggle" disabled={disabled} aria-controls={id}
        aria-label={label + (visible ? 'ni yashirish' : 'ni ko‘rsatish')} onClick={() => setVisible(previous => !previous)}>
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </div>
    {hint && <small id={hintId}>Kamida {minimumPasswordLength} belgi.</small>}
  </div>;
}
