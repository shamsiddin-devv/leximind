import { useState } from 'react';
import { BadgeCheck, BookOpen, Flame, Layers3, Mail, Share2 } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import type { Profile, Statistics, User } from '../../../shared/types/api';
import { defaultBanner } from '../data/profileAppearance';
import { ProfileAvatarEditor } from './ProfileAvatarEditor';
import { ProfileBannerEditor } from './ProfileBannerEditor';

function readBanner(key: string) {
  try { return localStorage.getItem(key) ?? defaultBanner; }
  catch { return defaultBanner; }
}

export function ProfileHero({ user, profile, statistics, token, onUserChange }: {
  user: User;
  profile?: Profile;
  statistics?: Statistics;
  token: string;
  onUserChange: (user: User) => void;
}) {
  const storageKey = 'leximind.profile-banner.' + user.id;
  const [banner, setBanner] = useState(() => readBanner(storageKey));
  const [shareStatus, setShareStatus] = useState('');
  const canShare = user.privacy?.profilePublic && user.privacy.profileSharing;
  const metrics = [
    ...(profile ? [
      { label: 'Faollik seriyasi', value: profile.streakDay + ' kun', icon: Flame, tone: 'amber' },
      { label: 'Daraja', value: profile.level, icon: BookOpen, tone: 'violet' },
    ] : []),
    ...(statistics ? [
      { label: 'So‘z kartalari', value: statistics.cards, icon: Layers3, tone: 'blue' },
    ] : []),
  ];

  function updateBanner(next: string) {
    if (next === defaultBanner) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, next);
    setBanner(next);
  }

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

  return <>
    <section className="panel profile-overview" aria-labelledby="profile-name">
      <img className="profile-cover" src={banner} alt="" width={1620} height={540} />
      <div className="profile-overview-content">
        <div className="profile-cover-toolbar" role="group" aria-label="Banner amallari" lang="en">
          <button type="button" onClick={() => canShare ? void shareProfile() : setShareStatus('Havola yaratish uchun profilni oching va ulashishga ruxsat bering.')}>
            <Share2 size={15} aria-hidden="true" /> Share profile
          </button>
          <ProfileBannerEditor banner={banner} onSave={updateBanner} />
        </div>
        <div className="profile-hero-identity">
          <ProfileAvatarEditor user={user} token={token} onUserChange={onUserChange} />
          <div className="profile-identity">
            <h1 id="profile-name">{user.fullName}
              {user.hasProfileBadge && <span className="profile-verified-badge" title="Tasdiqlangan profil">
                <BadgeCheck size={24} aria-label="Tasdiqlangan profil" />
              </span>}
            </h1>
            <p><Mail size={15} aria-hidden="true" /> {user.email}</p>
            {profile && <p className="profile-cefr"><BookOpen size={14} aria-hidden="true" /> {profile.level} CEFR</p>}
          </div>
        </div>
        {metrics.length > 0 && <dl className="profile-metrics" aria-label="O‘quv ko‘rsatkichlari">
          {metrics.map(({ label, value, icon: Icon, tone }) => <div key={label} data-tone={tone}>
            <dt><Icon size={20} aria-hidden="true" /> {label}</dt><dd>{value}</dd>
          </div>)}
        </dl>}
      </div>
    </section>
    {shareStatus && <div className="profile-share-status"><Notice>{shareStatus}{!canShare && <> <Link className="text-link" href={routes.settingsPrivacy}>Privacy &amp; Security</Link></>}</Notice></div>}
  </>;
}
