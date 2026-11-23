import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import type { Profile, User } from '../../../shared/types/api';
import type { ProfileAppearanceState } from '../hooks/useProfileAppearance';
import { ProfileAvatarEditor } from './ProfileAvatarEditor';
import { ProfileBannerEditor } from './ProfileBannerEditor';
import { ProfileCover } from './ProfilePresentation';

export function ProfileHero({ user, identity, profile, token, appearance, onUserChange }: {
  user: User;
  identity: Pick<User, 'fullName' | 'bio'>;
  profile?: Profile;
  token: string;
  appearance: ProfileAppearanceState;
  onUserChange: (user: User) => void;
}) {
  const { saved, save } = appearance;
  const vertical = saved.layout === 'vertical';
  const [shareStatus, setShareStatus] = useState('');
  const canShare = user.privacy?.profilePublic && user.privacy.profileSharing;

  async function shareProfile() {
    if (!canShare) return;
    const title = user.fullName + ' · LexiMind';
    const url = new URL(routes.sharedProfile + '/' + user.id, window.location.origin).href;
    setShareStatus('');
    try {
      if (navigator.share) {
        try { await navigator.share({ title, url }); return; }
        catch (failure) {
          if (failure instanceof DOMException && failure.name === 'AbortError') return;
        }
      }
      await navigator.clipboard.writeText(url);
      setShareStatus('Profil havolasi nusxalandi.');
    } catch {
      setShareStatus('Profil havolasini ulashib bo‘lmadi.');
    }
  }

  const bannerEditor = <ProfileBannerEditor banner={saved.banner} position={saved.position}
    onSave={(banner) => save({ ...saved, banner })}
    triggerLabel={vertical ? 'Rasmni almashtirish' : 'Change banner'}
    triggerClassName={vertical ? 'profile-vertical-photo' : undefined} />;

  return <div className="customized-profile-hero">
    <ProfileCover appearance={saved} user={user} identity={identity} level={profile?.level}
      avatar={<ProfileAvatarEditor user={user} token={token} onUserChange={onUserChange} />}
      toolbar={<div className="profile-cover-toolbar" role="group" aria-label="Banner amallari">
        <button type="button" lang="en"
          onClick={() => canShare ? void shareProfile() : setShareStatus('Havola yaratish uchun profilni oching va ulashishga ruxsat bering.')}>
          <Share2 size={15} aria-hidden="true" /> Share profile
        </button>
        {!vertical && bannerEditor}
      </div>}
      bannerAction={vertical ? bannerEditor : undefined} />
    {shareStatus && <div className="profile-share-status"><Notice>{shareStatus}{!canShare && <> <Link className="text-link" href={routes.settingsPrivacy}>Privacy &amp; Security</Link></>}</Notice></div>}
  </div>;
}
