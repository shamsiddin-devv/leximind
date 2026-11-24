import { AlarmClock, Award, Bell, ChartNoAxesCombined, FileText, Flame, Mail, Megaphone, Repeat2, type LucideIcon } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { useEffect, useState } from 'react';
import { api } from '../../../shared/services/api';
import type { Profile, User } from '../../../shared/types/api';
import { PushDeviceControl, type DeliveryCapabilities } from '../../notifications/PushDeviceControl';
import type { NotificationChoice, NotificationPreferences } from '../hooks/useAccountUiPreferences';
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
      { id: 'daily', label: 'Kunlik eslatma', description: 'Belgilangan vaqtda kundalik mashqni eslatadi.', icon: AlarmClock },
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
      { id: 'email', label: 'Email xabarlar', description: 'Kunlik eslatma va haftalik hisobot tasdiqlangan email orqali.', icon: Mail },
      { id: 'news', label: 'LexiMind yangiliklari', description: 'Yangi funksiyalar haqida xabar.', icon: Megaphone },
    ],
  },
];

export function NotificationSettings({ profile, preferences, notifications, token, user }: {
  profile?: Profile; preferences: PreferenceSave; notifications: NotificationPreferences; token: string; user: User;
}) {
  const [delivery, setDelivery] = useState<DeliveryCapabilities>();
  useEffect(() => {
    const controller = new AbortController();
    void api<DeliveryCapabilities>('/notifications/delivery', { token, signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setDelivery(value); })
      .catch(() => { /* Inbox preferences remain available. */ });
    return () => controller.abort();
  }, [token]);
  const daily = preferences.pending.studyReminderEnabled ?? profile?.studyReminderEnabled ?? false;
  const enabledCount = Object.values(notifications.values).filter(Boolean).length + Number(daily);
  const total = notifications.choices.length + 1;
  const allEnabled = enabledCount === total;

  function setAll(checked: boolean) {
    const changes = Object.fromEntries(notifications.choices.map((choice) => [choice, checked]));
    void notifications.save(changes).then(() => {
      if (daily !== checked) preferences.save({ studyReminderEnabled: checked });
    }).catch(() => { /* The settings hook displays save failures. */ });
  }

  return <div className="learning-preferences-form notification-preferences">
    <p className="notification-intro">Qaysi xabarlarni olishni tanlang.</p>
    <div className="notification-master">
      <div className="settings-field-label">
        <label className="settings-row-label" htmlFor="notification-all">Barcha bildirishnomalar</label>
        <small id="notification-count">{enabledCount} / {total} yoqilgan</small>
      </div>
      <PreferenceSwitch id="notification-all" descriptionId="notification-count" checked={allEnabled}
        disabled={!profile || !notifications.ready} onChange={setAll} />
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
          <div className="notification-row-controls">
            <PreferenceSwitch id={fieldId} descriptionId={fieldId + '-description'}
              checked={id === 'daily' ? daily : notifications.values[id]} disabled={id === 'daily' ? !profile : !notifications.ready}
              onChange={(checked) => {
                if (id === 'daily') preferences.save({ studyReminderEnabled: checked });
                else void notifications.save({ [id]: checked }).catch(() => { /* The settings hook displays save failures. */ });
              }} />
            {id === 'push' && <PushDeviceControl key={token} token={token} userId={user.id} delivery={delivery} enabled={notifications.values.push} />}
          </div>
        </div>;
      })}
    </PreferenceSection>)}
    <p className="notification-note">Bildirishnomalar qo‘ng‘iroqcha menyusida, tanlovlaringiz esa akkauntingizda saqlanadi.</p>
    {delivery && (!delivery.pushPublicKey || !delivery.emailAvailable) && <p className="notification-note">Bu muhitda {!delivery.pushPublicKey && !delivery.emailAvailable ? 'push va email kanallari' : !delivery.pushPublicKey ? 'push kanali' : 'email kanali'} vaqtincha o‘chiq.</p>}
    {(notifications.error || preferences.status?.error) && <Notice error>{notifications.error || preferences.status?.message} {notifications.error && <button type="button" className="text-link" disabled={notifications.saving} onClick={notifications.retry}>Qayta urinish</button>}</Notice>}
    <p className="preference-status" role="status">{notifications.saving ? 'Saqlanmoqda…' : !notifications.ready && !notifications.error ? 'Sozlamalar yuklanmoqda…' : preferences.status?.error ? '' : preferences.status?.message}</p>
  </div>;
}
