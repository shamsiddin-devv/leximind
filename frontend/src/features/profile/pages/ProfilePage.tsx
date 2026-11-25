import { useState, useSyncExternalStore } from 'react';
import { Settings2 } from 'lucide-react';
import { ProfileHero } from '../components/ProfileHero';
import { ProfileActivitySummary } from '../components/ProfileActivitySummary';
import { AccountDetails, LearningPreferences, ProfileSectionHeading, type ProfileIdentityDraft } from '../components/ProfileSettingsPanels';
import type { Profile, Statistics, User } from '../../../shared/types/api';
import type { ProfileAppearanceState } from '../hooks/useAccountUiPreferences';
import type { PreferenceSave } from '../hooks/usePreferenceSave';
import './ProfilePage.css';

const narrowProfile = window.matchMedia('(max-width: 720px)');
function subscribeToNarrowProfile(onChange: () => void) {
  narrowProfile.addEventListener('change', onChange);
  return () => narrowProfile.removeEventListener('change', onChange);
}

type ProfileProps = {
  user: User;
  profile?: Profile;
  statistics?: Statistics;
  streak?: number;
  gamesPlayed?: number;
  token: string;
  appearance: ProfileAppearanceState;
  onUserChange: (user: User) => void;
  preferences: PreferenceSave;
};

export function ProfilePage({ user, profile, statistics, streak, gamesPlayed, token, appearance, onUserChange, preferences }: ProfileProps) {
  const [draft, setDraft] = useState<ProfileIdentityDraft>({});
  const isNarrow = useSyncExternalStore(subscribeToNarrowProfile, () => narrowProfile.matches);
  const layout = isNarrow ? 'vertical' : appearance.saved.layout;
  const vertical = layout === 'vertical';
  const identity = {
    fullName: draft.fullName?.trim() || user.fullName,
    bio: draft.bio === undefined ? user.bio : draft.bio.trim(),
  };
  const summary = <ProfileActivitySummary token={token} statistics={statistics} streak={streak} gamesPlayed={gamesPlayed} />;
  return <div className="container screen inner-screen profile-page">
    <div className="customized-profile-layout" data-layout={layout}>
      <ProfileHero key={user.id} user={user} identity={identity} profile={profile} token={token}
        appearance={appearance} layout={layout} onUserChange={onUserChange} />
      <div className="customized-profile-main profile-details">
        {!vertical && summary}
        <div className="profile-panels">
          <AccountDetails user={user} token={token} onUserChange={onUserChange} vertical={vertical}
            draft={draft} onDraftChange={setDraft} />
          {profile
            ? <LearningPreferences profile={profile} preferences={preferences} />
            : <section className="profile-panel" aria-labelledby="preferences-title">
              <ProfileSectionHeading id="preferences-title" icon={Settings2} title="O‘quv sozlamalari" description="Kundalik o‘qish tartibini sozlang." />
              <p>O‘quv ma’lumotlari hozircha mavjud emas.</p>
            </section>}
        </div>
        {vertical && summary}
      </div>
    </div>
  </div>;
}
