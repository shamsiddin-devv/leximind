import { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, BookOpen, Clock3, Flame, Layers, Target, Zap } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { SharedProfileData } from '../../../shared/types/api';
import './SharedProfile.css';

const profileId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const number = new Intl.NumberFormat('uz-UZ');
const weekLabel = new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short', timeZone: 'UTC' });

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
    <Link className="shared-profile-back" href={routes.leaderboard}><ArrowLeft size={17} aria-hidden="true" /> Reytingga qaytish</Link>
    {failure ? <><h1>Ochiq profil</h1><Notice error>{failure}</Notice></>
      : !profile ? <p role="status">Profil yuklanmoqda…</p>
      : <>
        <section className="shared-profile-hero" aria-labelledby="shared-profile-name">
          <UserAvatar className="shared-profile-avatar" name={profile.fullName} url={profile.avatarUrl} />
          <h1 id="shared-profile-name">{profile.fullName}
            {profile.hasProfileBadge && <BadgeCheck size={25} aria-label="Tasdiqlangan profil" />}</h1>
          {profile.level && <span className="shared-profile-level">
            <BookOpen size={15} aria-hidden="true" /> {profile.level} CEFR
          </span>}
        </section>
        {profile.statistics && <PublicStatistics statistics={profile.statistics} />}
      </>}
  </div>;
}

function PublicStatistics({ statistics }: { statistics: NonNullable<SharedProfileData['statistics']> }) {
  const stats = [
    { label: 'Jami XP', value: number.format(statistics.xp), icon: Zap },
    { label: 'O‘rganilgan so‘zlar', value: number.format(statistics.learnedWords), icon: BookOpen },
    { label: 'Faollik seriyasi', value: number.format(statistics.streakDay) + ' kun', icon: Flame },
    { label: 'Tugallangan sessiyalar', value: number.format(statistics.sessions), icon: Layers },
    { label: 'Aniqlik', value: statistics.accuracy === null ? '—' : number.format(statistics.accuracy) + '%', icon: Target },
    { label: 'O‘rganish vaqti', value: number.format(Math.floor(statistics.studySeconds / 60)) + ' daqiqa', icon: Clock3 },
  ];
  const highestXp = Math.max(0, ...statistics.weeklyXp.map(({ xp }) => xp));

  return <section className="shared-profile-progress" aria-labelledby="shared-profile-stats-title">
    <h2 id="shared-profile-stats-title">O‘quv natijalari</h2>
    <dl className="shared-profile-stats">
      {stats.map(({ label, value, icon: Icon }) => <div key={label}>
        <dt><Icon size={16} aria-hidden="true" /> {label}</dt><dd>{value}</dd>
      </div>)}
    </dl>
    <section className="shared-profile-activity" aria-labelledby="shared-profile-activity-title">
      <h3 id="shared-profile-activity-title">Haftalik XP</h3>
      <p>So‘nggi 12 haftada to‘plangan XP</p>
      {highestXp > 0 ? <ol className="shared-profile-weeks">
        {statistics.weeklyXp.map(({ date, xp }) => {
          const label = weekLabel.format(new Date(date + 'T00:00:00Z'));
          return <li key={date} aria-label={label + ', ' + number.format(xp) + ' XP'}
            title={label + ' · ' + number.format(xp) + ' XP'}>
            <div className="shared-profile-bar" aria-hidden="true">
              <span style={{ height: xp / highestXp * 100 + '%' }} />
            </div>
            <span aria-hidden="true">{label}</span>
          </li>;
        })}
      </ol> : <p className="shared-profile-activity-empty">So‘nggi 12 haftada XP qayd etilmagan.</p>}
    </section>
  </section>;
}
