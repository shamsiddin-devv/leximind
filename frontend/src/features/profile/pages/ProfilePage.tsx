import { Settings2 } from 'lucide-react';
import { ProfileHero } from '../components/ProfileHero';
import { AccountDetails, LearningPreferences } from '../components/ProfileSettingsPanels';
import type { Profile, Statistics, User } from '../../../shared/types/api';

type ProfileProps = {
  user: User;
  profile?: Profile;
  statistics?: Statistics;
  token: string;
  onUserChange: (user: User) => void;
  onProfileChange: (profile: Profile) => void;
};

export function ProfilePage({ user, profile, statistics, token, onUserChange, onProfileChange }: ProfileProps) {
  return <div className="container screen inner-screen profile-page">
    <ProfileHero key={user.id} user={user} profile={profile} statistics={statistics} token={token} onUserChange={onUserChange} />
    <div className="profile-panels">
      <AccountDetails user={user} token={token} onUserChange={onUserChange} />
      {profile
        ? <LearningPreferences profile={profile} token={token} onProfileChange={onProfileChange} />
        : <section className="panel profile-panel" aria-labelledby="preferences-title">
          <div className="panel-label"><span className="mini-icon profile-panel-icon"><Settings2 size={17} aria-hidden="true" /></span><h2 id="preferences-title">O‘quv sozlamalari</h2></div>
          <p>O‘quv ma’lumotlari hozircha mavjud emas.</p>
        </section>}
    </div>
  </div>;
}
