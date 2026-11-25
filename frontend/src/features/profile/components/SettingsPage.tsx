import type { NavigationItem } from '../../../app/navigation';
import { routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import type { Plan, Profile, Statistics, User } from '../../../shared/types/api';
import type { NotificationPreferences, ProfileAppearanceState } from '../hooks/useAccountUiPreferences';
import type { PreferenceSave } from '../hooks/usePreferenceSave';
import { LearningPreferencesForm } from './LearningPreferencesForm';
import { AccountSettings } from './AccountSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { DeviceSessions } from './DeviceSessions';
import { PasswordSettings } from './PasswordSettings';
import { PrivacySettings } from './PrivacySettings';
import { EmailVerification, ProfileBadgeVerification } from './ProfileVerification';
import { NotificationSettings } from './NotificationSettings';
import { UICustomization } from './UICustomization';
import './SettingsForms.css';

export function SettingsPage({ path, section, user, profile, statistics, forecast, appearance, token, preferences, notifications, onUserChange, onPasswordChanged, onDeleted }: {
  path: string;
  section: NavigationItem;
  user: User;
  profile?: Profile;
  statistics?: Statistics;
  forecast?: Plan['forecast'];
  appearance: ProfileAppearanceState;
  token: string;
  preferences: PreferenceSave;
  notifications: NotificationPreferences;
  onUserChange: (user: User) => void;
  onPasswordChanged: () => void;
  onDeleted: () => void;
}) {
  if (path === routes.settingsVerifyEmail || path === routes.settingsProfileBadge) {
    const Verification = path === routes.settingsVerifyEmail ? EmailVerification : ProfileBadgeVerification;
    return <div className="container screen settings-page settings-sheet privacy-page">
      <Verification key={user.id} user={user} token={token} onUserChange={onUserChange} />
    </div>;
  }

  if (section.href === routes.settingsPassword) return <div className="container screen settings-page settings-sheet settings-password-page">
    <PasswordSettings token={token} onChanged={onPasswordChanged} />
    <DeviceSessions token={token} />
  </div>;

  let panel;
  switch (section.href) {
    case routes.settingsAccount:
      panel = <AccountSettings user={user} token={token} onUserChange={onUserChange} onDeleted={onDeleted} />;
      break;
    case routes.settingsNotifications:
      panel = <NotificationSettings profile={profile} preferences={preferences} notifications={notifications} token={token} user={user} />;
      break;
    case routes.settingsAppearance:
      panel = <AppearanceSettings />;
      break;
    case routes.settingsCustomization:
      panel = <UICustomization appearance={appearance} user={user} profile={profile} statistics={statistics} forecast={forecast} />;
      break;
    case routes.settingsPrivacy:
      panel = <PrivacySettings user={user} token={token} onUserChange={onUserChange} onDeleted={onDeleted} />;
      break;
    case routes.settingsLearning:
      panel = profile ? <LearningPreferencesForm profile={profile} preferences={preferences} />
        : <Notice>O‘quv ma’lumotlari hozircha mavjud emas.</Notice>;
  }

  const unifiedSurface = section.href === routes.settingsLearning || section.href === routes.settingsNotifications
    || section.href === routes.settingsAppearance || section.href === routes.settingsCustomization;

  return <div className={'container screen settings-page settings-sheet' + (unifiedSurface ? ' settings-sheet--unified' : '') + (path === routes.settingsPrivacy ? ' privacy-page' : '')}>
    <h1 lang="en">{section.label}</h1>
    {panel}
  </div>;

}
