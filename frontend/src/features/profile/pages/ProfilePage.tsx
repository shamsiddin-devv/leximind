import { Settings2 } from 'lucide-react';
import { ProfileHero } from '../components/ProfileHero';
import { AccountDetails, LearningPreferences, ProfileSectionHeading } from '../components/ProfileSettingsPanels';
import type { Profile, User } from '../../../shared/types/api';
import type { ProfileAppearanceState } from '../hooks/useProfileAppearance';
import type { PreferenceSave } from '../hooks/usePreferenceSave';

type ProfileProps = {
  user: User;
  profile?: Profile;
  token: string;
  appearance: ProfileAppearanceState;
  onUserChange: (user: User) => void;
  preferences: PreferenceSave;
};

export function ProfilePage({ user, profile, token, appearance, onUserChange, preferences }: ProfileProps) {
  const vertical = appearance.saved.layout === 'vertical';
  return <div className="container screen inner-screen profile-page">
    <div className="customized-profile-layout" data-layout={appearance.saved.layout}>
      <ProfileHero key={user.id} user={user} profile={profile} token={token}
        appearance={appearance} onUserChange={onUserChange} />
      <div className="customized-profile-main profile-details">
        <div className="profile-panels">
          <AccountDetails user={user} token={token} onUserChange={onUserChange} vertical={vertical} />
          {profile
            ? <LearningPreferences profile={profile} preferences={preferences} />
            : <section className="profile-panel" aria-labelledby="preferences-title">
              <ProfileSectionHeading id="preferences-title" icon={Settings2} title="O‘quv sozlamalari" description="Kundalik o‘qish tartibini sozlang." />
              <p>O‘quv ma’lumotlari hozircha mavjud emas.</p>
            </section>}
        </div>
      </div>
    </div>
  </div>;
}
