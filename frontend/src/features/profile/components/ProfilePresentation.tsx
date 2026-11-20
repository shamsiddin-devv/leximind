import { useId, type CSSProperties, type ReactNode } from 'react';
import { Award, BadgeCheck, BookOpen, ChartNoAxesColumn, CircleCheck, Clock3, Flame, Mail, Target, Zap } from 'lucide-react';
import type { Plan, Profile, Statistics, User } from '../../../shared/types/api';
import { profileBannerSource, profileMetrics, type ProfileAppearance, type ProfileMetric } from '../data/profileAppearance';
import './ProfilePresentation.css';

type ProfileData = { user: User; profile?: Profile; statistics?: Statistics; forecast?: Plan['forecast'] };
const metricIcons = { xp: Zap, words: BookOpen, streak: Flame, sessions: CircleCheck, accuracy: Target, studyTime: Clock3 };
const metricLabels = Object.fromEntries(profileMetrics.map(({ id, label }) => [id, label]));
const number = new Intl.NumberFormat('uz-UZ');

function profileMetricValue(id: ProfileMetric, statistics?: Statistics, profile?: Profile) {
  const values: Record<ProfileMetric, string | number | undefined> = {
    xp: undefined,
    words: statistics?.learnedWords,
    streak: profile ? profile.streakDay + ' kun' : undefined,
    sessions: statistics?.sessions,
    accuracy: statistics?.accuracy == null ? undefined : statistics.accuracy + '%',
    studyTime: statistics?.studyMinutes === undefined ? undefined : number.format(statistics.studyMinutes) + ' daq',
  };
  const value = values[id];
  return typeof value === 'number' ? number.format(value) : value;
}

export function ProfileCover({ appearance, user, profile, avatar, toolbar, bannerAction, preview }: {
  appearance: ProfileAppearance; user: User; profile?: Profile; avatar: ReactNode;
  toolbar?: ReactNode; bannerAction?: ReactNode; preview?: boolean;
}) {
  const id = useId();
  const Heading = preview ? 'h3' : 'h1';
  const vertical = appearance.layout === 'vertical';
  const style = { '--cover-position': appearance.position, '--cover-overlay': appearance.overlay / 100 } as CSSProperties;
  return <section className="panel profile-overview customized-profile-cover" data-height={appearance.height} style={style} aria-labelledby={id}>
    <img className="profile-cover" src={profileBannerSource(appearance.banner, appearance.layout)} alt="" />
    <div className="profile-overview-content">
      {toolbar}
      <div className="profile-hero-identity">
        {avatar}
        <div className="profile-identity">
          <Heading id={id}>{user.fullName}
            {user.hasProfileBadge && <BadgeCheck size={21} className="profile-verified-badge" aria-label="Tasdiqlangan profil" />}
          </Heading>
          {(!preview || appearance.content.email) && <p className="profile-cover-email">
            {!vertical && <Mail size={15} aria-hidden="true" />} {user.email}
          </p>}
          {profile && <p className="profile-cefr"><BookOpen size={14} aria-hidden="true" /> {profile.level} CEFR</p>}
          {preview && appearance.content.bio && user.bio && <p className="customized-profile-bio">{user.bio}</p>}
        </div>
      </div>
      {bannerAction}
    </div>
  </section>;
}

export function ProfileInsights({ appearance, user, profile, statistics, forecast = [], preview }: ProfileData & {
  appearance: ProfileAppearance; preview?: boolean;
}) {
  const enabled = appearance.metrics.filter(({ visible }) => visible);
  const peak = Math.max(1, ...forecast.map(({ count }) => count));
  const Heading = preview ? 'h3' : 'h2';

  return <div className="profile-insights">
    {enabled.length > 0 && <section className="panel profile-insight-panel" aria-label="O‘rganish statistikasi">
      <Heading>O‘rganish statistikasi</Heading>
      <dl className="customized-profile-stats" data-style={appearance.statsStyle}>
        {enabled.map(({ id }) => {
          const value = profileMetricValue(id, statistics, profile);
          const Icon = metricIcons[id];
          return <div key={id}>
            <dt><Icon size={17} aria-hidden="true" /> {metricLabels[id]}</dt>
            <dd>{value ?? <span title={id === 'xp' ? 'XP hisobi hali mavjud emas' : 'Ma’lumot mavjud emas'}>—</span>}</dd>
          </div>;
        })}
      </dl>
    </section>}
    {appearance.content.charts && <section className="panel profile-insight-panel">
      <Heading><ChartNoAxesColumn size={17} aria-hidden="true" /> Keyingi takrorlashlar</Heading>
      {forecast.some(({ count }) => count > 0) ? <div className="forecast-graph profile-forecast">
        {forecast.map(({ date, count }) => <div className="forecast-day" key={date}>
          <span className="forecast-count">{count}</span>
          <span className="forecast-track" aria-hidden="true"><span style={{ blockSize: count * 100 / peak + '%' }} /></span>
          <time dateTime={date}>{date.slice(8, 10)}.{date.slice(5, 7)}</time>
        </div>)}
      </div> : <p>Rejadagi takrorlashlar shu yerda ko‘rinadi.</p>}
    </section>}
    {appearance.content.achievements && <section className="panel profile-insight-panel">
      <Heading><Award size={17} aria-hidden="true" /> Yutuqlar</Heading>
      <p>{user.hasProfileBadge ? 'Tasdiqlangan profil belgisi' : 'Hozircha yutuqlar yo‘q.'}</p>
    </section>}
  </div>;
}
