import { useState } from 'react';
import { BadgeCheck, ChevronRight, Download, Globe2, KeyRound, LockKeyhole, MailCheck, MailWarning, ShieldCheck } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import { privateProfile, type Profile, type ProfilePrivacy, type User } from '../../../shared/types/api';
import { DeleteSettings } from './DeleteSettings';
import { DeviceSessions } from './DeviceSessions';
import { PreferenceSwitch } from './PreferenceControls';
import { badgeRequirements, type VerificationProps } from './ProfileVerification';
import './PrivacySettings.css';

const switches = [
  { key: 'profileSharing', label: 'Profilni ulashishga ruxsat', description: 'Profilga ulashish havolasi orqali kirish.' },
  { key: 'publicStatistics', label: 'Ochiq profilda statistika', description: 'Faollik seriyasi va o‘rganilgan so‘zlar soni.' },
  { key: 'publicCefr', label: 'Ochiq profilda CEFR daraja', description: 'Joriy ingliz tili darajangiz.' },
  { key: 'publicBio', label: 'Ochiq profilda Bio', description: 'Qisqa tanishtiruv profilingiz bannerida chiqadi.' },
  { key: 'publicSocialLinks', label: 'Ochiq profilda ijtimoiy havolalar', description: 'Bannerda akkauntingizga qo‘shilgan havolalar ko‘rinadi.' },
] as const;

export function PrivacySettings({ user, token, onUserChange, onDeleted }: VerificationProps & { onDeleted: () => void }) {
  const [pending, setPending] = useState<Partial<ProfilePrivacy>>();
  const [saveError, setSaveError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const privacy = { ...(user.privacy ?? privateProfile), ...pending };
  const completed = badgeRequirements(user).filter(({ complete }) => complete).length;
  const EmailIcon = user.emailVerifiedAt ? MailCheck : MailWarning;

  async function updatePrivacy(patch: Partial<ProfilePrivacy>) {
    if (pending) return;
    setSaveError('');
    setPending(patch);
    try {
      onUserChange(await api<User>('/users/me', { token, method: 'PATCH', body: patch }));
    } catch (error) {
      setSaveError(explain(error));
    } finally {
      setPending(undefined);
    }
  }

  async function exportData() {
    if (exporting) return;
    setExporting(true);
    setExportError('');
    try {
      const [account, learning] = await Promise.all([
        api<User>('/users/me', { token }),
        api<Profile>('/profile', { token }),
      ]);
      const { privacy, ...profile } = account;
      const download = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile, privacy, learning }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(download);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'leximind-profile.json';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (error) {
      setExportError(explain(error));
    } finally {
      setExporting(false);
    }
  }

  return <div className="privacy-sections">
    <section className="privacy-section" aria-labelledby="privacy-visibility">
      <header className="privacy-heading">
        <h2 id="privacy-visibility">Profil ko‘rinishi</h2>
        <p>Boshqalar profilingizda nimalarni ko‘rishini tanlang.</p>
      </header>
      <div className="privacy-row">
        <div><h3 id="privacy-status">Profil holati</h3></div>
        <div role="group" aria-labelledby="privacy-status" className="privacy-visibility">
          <button type="button" aria-pressed={privacy.profilePublic} disabled={!!pending} onClick={() => {
            if (!privacy.profilePublic) void updatePrivacy({ profilePublic: true });
          }}><Globe2 size={15} aria-hidden="true" /> Ochiq</button>
          <button type="button" aria-pressed={!privacy.profilePublic} disabled={!!pending} onClick={() => {
            if (privacy.profilePublic) void updatePrivacy({ profilePublic: false });
          }}><LockKeyhole size={15} aria-hidden="true" /> Yopiq</button>
        </div>
      </div>
      {switches.map(({ key, label, description }) => <div className="privacy-row" key={key}>
        <div>
          <label htmlFor={'privacy-' + key}>{label}</label>
          <p id={'privacy-description-' + key}>{description}</p>
        </div>
        <PreferenceSwitch id={'privacy-' + key} descriptionId={'privacy-description-' + key} checked={privacy[key]}
          disabled={!!pending || !privacy.profilePublic} onChange={(value) => void updatePrivacy({ [key]: value })} />
      </div>)}
      <p className="privacy-note"><ShieldCheck size={16} aria-hidden="true" />
        {!privacy.profilePublic ? 'Profil yopiq. Ulashish havolasi orqali kirish o‘chirilgan.' : 'Email, parol va shaxsiy sozlamalar faqat sizga ko‘rinadi.'}
      </p>
      {saveError && <Notice error>{saveError}</Notice>}
    </section>

    <section className="privacy-section" aria-labelledby="privacy-verification">
      <header className="privacy-heading"><h2 id="privacy-verification">Tasdiqlash</h2></header>
      <div className="privacy-row">
        <div className="privacy-icon-row">
          <span className={'privacy-row-icon ' + (user.emailVerifiedAt ? 'is-positive' : 'is-warning')}><EmailIcon size={20} aria-hidden="true" /></span>
          <div><h3>{user.emailVerifiedAt ? 'Email tasdiqlangan' : 'Email hali tasdiqlanmagan'}</h3><p>{user.email}</p></div>
        </div>
        <Link className="button secondary" href={routes.settingsVerifyEmail}>{user.emailVerifiedAt ? 'Holatni ko‘rish' : 'Emailni tasdiqlash'}<ChevronRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className="privacy-row">
        <div className="privacy-icon-row">
          <span className="privacy-row-icon"><BadgeCheck size={20} aria-hidden="true" /></span>
          <div><h3>Profil tasdiq belgisi</h3><p>{user.hasProfileBadge ? 'Belgi profilingizda ko‘rinadi.' : completed + ' / 4 talab bajarildi.'}</p></div>
        </div>
        <Link className="button secondary" href={routes.settingsProfileBadge}>{user.hasProfileBadge ? 'Talablarni ko‘rish' : completed ? 'Davom etish' : 'Tasdiqlashni boshlash'}<ChevronRight size={16} aria-hidden="true" /></Link>
      </div>
    </section>

    <section className="privacy-section privacy-row" aria-labelledby="privacy-access">
      <div className="privacy-icon-row">
        <span className="privacy-row-icon"><KeyRound size={20} aria-hidden="true" /></span>
        <div><h2 id="privacy-access">Kirish xavfsizligi</h2><p>Parolingizni yangilang yoki tiklang.</p></div>
      </div>
      <div className="privacy-actions">
        <Link className="button quiet" href={routes.recover}>Parolni tiklash</Link>
        <Link className="button secondary" href={routes.settingsPassword}>Parolni o‘zgartirish</Link>
      </div>
    </section>

    <DeviceSessions token={token} privacy />

    <section className="privacy-section" aria-labelledby="privacy-export">
      <div className="privacy-row">
        <div><h2 id="privacy-export">Ma’lumotlarni eksport qilish</h2><p>Profil, maxfiylik va o‘quv sozlamalarini JSON fayl sifatida yuklab oling.</p></div>
        <button type="button" className="button secondary" disabled={exporting} onClick={() => void exportData()}>
          <Download size={16} aria-hidden="true" />{exporting ? 'Tayyorlanmoqda…' : 'Yuklab olish'}
        </button>
      </div>
      {exportError && <Notice error>{exportError}</Notice>}
    </section>

    <DeleteSettings token={token} userId={user.id} onDeleted={onDeleted} privacy />
  </div>;
}
