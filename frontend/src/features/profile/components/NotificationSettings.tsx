import { AlarmClock, Award, Bell, ChartNoAxesCombined, FileText, Flame, Mail, Megaphone, Repeat2, type LucideIcon } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import type { Profile } from '../../../shared/types/api';
import type { NotificationChoice, NotificationPreferences } from '../hooks/useNotificationPreferences';
import type { PreferenceSave } from '../hooks/usePreferenceSave';
import { PreferenceSection, PreferenceSwitch } from './PreferenceControls';
import './NotificationSettings.css';

type NotificationRow = {
  id: 'daily' | NotificationChoice;
  label: string;
  description: string;
  icon: LucideIcon;
};

const groups: { id: string; title: string; description: string; items: NotificationRow[] }[] = [
  {
    id: 'learning', title: 'O‘rganish', description: 'Kundalik o‘rganish odatingiz uchun.',
    items: [
      { id: 'daily', label: 'Kunlik eslatma', description: 'LexiMind ochiq bo‘lganda belgilangan vaqtda eslatadi.', icon: AlarmClock },
      { id: 'review', label: 'Takrorlash eslatmasi', description: 'Takrorlashga tayyor kartalar haqida xabar.', icon: Repeat2 },
      { id: 'streak', label: 'Streak ogohlantirishi', description: 'O‘rganish seriyasi uzilish xavfida.', icon: Flame },
    ],
  },
  {
    id: 'results', title: 'Natijalar', description: 'Yutuq va rivojlanishingiz haqida xabarlar.',
    items: [
      { id: 'achievements', label: 'Yutuqlar', description: 'Yangi nishon qo‘lga kiritilganda.', icon: Award },
      { id: 'progress', label: 'Rivojlanish yangiliklari', description: 'Daraja va XP marralari haqida.', icon: ChartNoAxesCombined },
      { id: 'weekly', label: 'Haftalik hisobot', description: 'Haftalik mashqlar bo‘yicha qisqa xulosa.', icon: FileText },
    ],
  },
  {
    id: 'channels', title: 'Kanallar', description: 'Xabarlarni qayerda olishni tanlang.',
    items: [
      { id: 'push', label: 'Push bildirishnomalar', description: 'Brauzer va qurilmadagi xabarlar.', icon: Bell },
      { id: 'email', label: 'Email xabarlar', description: 'Hisobotlar va muhim xabarlar email orqali.', icon: Mail },
      { id: 'news', label: 'LexiMind yangiliklari', description: 'Yangi funksiyalar haqida xabar.', icon: Megaphone },
    ],
  },
];

export function NotificationSettings({ profile, preferences, notifications }: {
  profile?: Profile; preferences: PreferenceSave; notifications: NotificationPreferences;
}) {
  const daily = preferences.pending.studyReminderEnabled ?? profile?.studyReminderEnabled ?? false;
  const enabledCount = Object.values(notifications.values).filter(Boolean).length + Number(daily);
  const total = notifications.choices.length + 1;
  const allEnabled = enabledCount === total;

  function setAll(checked: boolean) {
    const changes = Object.fromEntries(notifications.choices.map((choice) => [choice, checked]));
    if (notifications.save(changes) && daily !== checked) preferences.save({ studyReminderEnabled: checked });
  }

  return <div className="learning-preferences-form notification-preferences">
    <p className="notification-intro">Qaysi xabarlarni olishni tanlang.</p>
    <div className="notification-master">
      <div className="settings-field-label">
        <label className="settings-row-label" htmlFor="notification-all">Barcha bildirishnomalar</label>
        <small id="notification-count">{enabledCount} / {total} yoqilgan</small>
      </div>
      <PreferenceSwitch id="notification-all" descriptionId="notification-count" checked={allEnabled}
        disabled={!profile} onChange={setAll} />
    </div>
    {groups.map((group) => <PreferenceSection key={group.id} id={'notifications-' + group.id} title={group.title} description={group.description}>
      {group.items.map(({ id, label, description, icon: Icon }) => {
        const fieldId = 'notification-' + id;
        return <div className="settings-form-row notification-row" key={id}>
          <div className="notification-label">
            <span className="notification-icon"><Icon size={17} aria-hidden="true" /></span>
            <div className="settings-field-label">
              <label className="settings-row-label" htmlFor={fieldId}>{label}</label>
              <small id={fieldId + '-description'}>{description}</small>
            </div>
          </div>
          <PreferenceSwitch id={fieldId} descriptionId={fieldId + '-description'}
            checked={id === 'daily' ? daily : notifications.values[id]} disabled={id === 'daily' && !profile}
            onChange={(checked) => {
              if (id === 'daily') preferences.save({ studyReminderEnabled: checked });
              else notifications.save({ [id]: checked });
            }} />
        </div>;
      })}
    </PreferenceSection>)}
    <p className="notification-note">Kunlik va takrorlash eslatmalari LexiMind ichida ishlaydi. Qolgan tanlovlar bu brauzerda saqlanadi va xabar yuborish xizmati ulanganda qo‘llanadi.</p>
    {(notifications.error || preferences.status?.error) && <Notice error>{notifications.error || preferences.status?.message}</Notice>}
    <p className="preference-status" role="status">{preferences.status?.error ? '' : preferences.status?.message}</p>
  </div>;
}
