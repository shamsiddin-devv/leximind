import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { SharedProfileData } from '../../../shared/types/api';
import './SharedProfile.css';

const profileId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export default function SharedProfile({ id }: { id: string }) {
  const [profile, setProfile] = useState<SharedProfileData>();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profileId.test(id)) return;
    const controller = new AbortController();
    void api<SharedProfileData>('/users/shared/' + id, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setProfile(result); })
      .catch((failure) => { if (!controller.signal.aborted) setError(explain(failure, { 404: 'Profil havolasi mavjud emas yoki ulashish o‘chirilgan.' })); });
    return () => controller.abort();
  }, [id]);

  const failure = profileId.test(id) ? error : 'Profil havolasi mavjud emas.';
  return <div className="container screen shared-profile">
    {failure ? <><h1>Umumiy profil</h1><Notice error>{failure}</Notice></>
      : !profile ? <p role="status">Profil yuklanmoqda…</p>
      : <>
        <UserAvatar className="shared-profile-avatar" name={profile.fullName} url={profile.avatarUrl} />
        <h1>{profile.fullName}{profile.hasProfileBadge && <BadgeCheck size={25} aria-label="Tasdiqlangan profil" />}</h1>
        {(profile.level || profile.statistics) && <dl className="shared-profile-stats">
          {profile.level && <div><dt>CEFR daraja</dt><dd>{profile.level}</dd></div>}
          {profile.statistics && <>
            <div><dt>O‘rganilgan so‘zlar</dt><dd>{profile.statistics.learnedWords}</dd></div>
            <div><dt>Faollik seriyasi</dt><dd>{profile.statistics.streakDay} kun</dd></div>
          </>}
        </dl>}
      </>}
  </div>;
}
