import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { User } from '../../../shared/types/api';
import { profileLinkHref, profileSocialPlatforms, type SocialPlatform } from '../data/socialLinks';
import './ProfileAvatarEditor.css';
import './SocialLinksSettings.css';

export function SocialLinksSettings({ user, token, onUserChange, disabled }: {
  user: User; token: string; onUserChange: (user: User) => void; disabled: boolean;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState<SocialPlatform>();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; invalid?: boolean }>();
  const [status, setStatus] = useState('');
  const saved = platform ? user.socialLinks?.[platform.key] : undefined;

  useLayoutEffect(() => {
    if (!platform || !dialog.current || dialog.current.open) return;
    dialog.current.showModal();
    input.current?.focus({ preventScroll: true });
  }, [platform]);

  function open(item: SocialPlatform) {
    setDraft(user.socialLinks?.[item.key] ?? '');
    setFeedback(undefined);
    setStatus('');
    setPlatform(item);
  }

  async function save(value: string | null) {
    if (!platform || saving) return;
    if (value !== null && !profileLinkHref(value, platform)) {
      setFeedback({ message: 'Havolani namunadagi shaklda kiriting.', invalid: true });
      input.current?.focus();
      return;
    }
    setSaving(true);
    setFeedback(undefined);
    try {
      const updated = await api<User>('/users/me', {
        token, method: 'PATCH', body: { socialLinks: { [platform.key]: value } },
      });
      onUserChange(updated);
      setStatus(value ? platform.label + ' havolasi saqlandi.' : platform.label + ' havolasi olib tashlandi.');
      dialog.current?.close();
    } catch (error) {
      setFeedback({ message: explain(error) });
    } finally {
      setSaving(false);
    }
  }

  return <section className="settings-form-row settings-social-row" aria-labelledby={id + '-title'}>
    <div className="settings-field-label">
      <h3 className="settings-row-label" id={id + '-title'}>Ijtimoiy havolalar</h3>
      <small id={id + '-hint'}>Havolani qo‘shish yoki tahrirlash uchun ikonkani bosing.</small>
    </div>
    <div className="settings-field-control">
      <div className="settings-social-icons" role="group" aria-labelledby={id + '-title'} aria-describedby={id + '-hint'}>
        {profileSocialPlatforms.map((item) => {
          const Icon = item.icon;
          const linked = Boolean(profileLinkHref(user.socialLinks?.[item.key], item));
          const label = item.label + (linked ? ' · Havolani tahrirlash' : ' · Havola qo‘shish');
          return <button key={item.key} type="button" className="settings-social-icon" title={label} aria-label={label}
            aria-haspopup="dialog" data-linked={linked} disabled={disabled} onClick={() => open(item)}>
            <Icon size={21} aria-hidden="true" />
            {linked && <span className="settings-social-check"><Check size={10} aria-hidden="true" /></span>}
          </button>;
        })}
      </div>
      <span className="profile-sr-only" role="status">{status}</span>
    </div>
    <dialog ref={dialog} className="app-dialog profile-photo-dialog settings-social-dialog"
      aria-labelledby={id + '-dialog-title'} aria-describedby={id + '-dialog-note'}
      onCancel={(event) => { if (saving) event.preventDefault(); }}
      onClose={() => setPlatform(undefined)}>
      {platform && <>
        <header className="app-dialog-heading">
          <div>
            <h2 id={id + '-dialog-title'}>{platform.label}</h2>
            <p id={id + '-dialog-note'}>Havola gorizontal profil bannerida ko‘rinadi.</p>
          </div>
          <button type="button" className="app-dialog-close" aria-label="Yopish" disabled={saving}
            onClick={() => dialog.current?.close()}><X size={16} aria-hidden="true" /></button>
        </header>
        <form className="app-dialog-form" aria-labelledby={id + '-dialog-title'} noValidate onSubmit={(event) => {
          event.preventDefault();
          void save(draft.trim());
        }}>
          <div className="app-dialog-field">
            <label htmlFor={id + '-url'}>Havola</label>
            <input ref={input} id={id + '-url'} type="url" name="url" placeholder={platform.example} maxLength={512} required
              value={draft} disabled={saving} aria-invalid={feedback?.invalid || undefined}
              aria-describedby={feedback?.invalid ? id + '-example ' + id + '-error' : id + '-example'}
              onChange={(event) => { setDraft(event.currentTarget.value); setFeedback(undefined); }} />
            <small id={id + '-example'}>Masalan {platform.example}</small>
          </div>
          {feedback && <div id={id + '-error'}><Notice error>{feedback.message}</Notice></div>}
          {saving && <p className="app-dialog-description" role="status">Saqlanmoqda…</p>}
          <div className="app-dialog-actions">
            <button type="button" className="app-dialog-button" disabled={saving}
              onClick={() => dialog.current?.close()}>Bekor qilish</button>
            <button type="submit" className="app-dialog-button" data-tone="accent"
              disabled={saving || !draft.trim() || draft.trim() === saved}>Havolani saqlash</button>
          </div>
          {saved && <button type="button" className="app-dialog-button settings-social-remove" data-tone="danger" disabled={saving}
            onClick={() => void save(null)}><Trash2 size={15} aria-hidden="true" /> Havolani olib tashlash</button>}
        </form>
      </>}
    </dialog>
  </section>;
}
