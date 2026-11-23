import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import {
  ArrowLeft, BadgeCheck, BarChart3, BookOpen, Bookmark, ChevronDown, ChevronRight,
  Clock3, Copy, Crown, EllipsisVertical, ExternalLink, Flag, Flame, House, Layers, Medal,
  Share2, Star, Target, Trophy, Zap,
} from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Brand } from '../../../shared/components/Brand';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { Leaderboard, RankingEntry, SharedProfileData } from '../../../shared/types/api';
import { uzbekMonths } from '../../../shared/utils/date';
import { duration, StatisticsChart } from '../../learning/components/StatisticsCharts';
import { ProfileCover } from '../components/ProfilePresentation';
import { defaultProfileAppearance } from '../data/profileAppearance';
import '../../learning/pages/StatisticsPage.css';
import './SharedProfile.css';

const profileId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const number = new Intl.NumberFormat('uz-UZ');
const periods = [
  { key: 'all', label: 'Barcha vaqt' },
  { key: 'month', label: 'Bu oy' },
  { key: 'week', label: 'Bu hafta' },
] as const;
const tabs = [
  { key: 'overview', label: 'Umumiy', icon: House },
  { key: 'achievements', label: 'Yutuqlar', icon: Trophy },
  { key: 'statistics', label: 'Statistika', icon: BarChart3 },
  { key: 'collections', label: 'To‘plamlar', icon: Bookmark },
] as const;
const ranges = [4, 8, 12] as const;

type Period = (typeof periods)[number]['key'];
type ProfileTab = (typeof tabs)[number]['key'];
type ProfileStatistics = NonNullable<SharedProfileData['statistics']>;
type Result<T> = { data: T; error?: never } | { data?: never; error: string };

export default function SharedProfile({ id, token }: { id: string; token?: string | null }) {
  const [profile, setProfile] = useState<Result<SharedProfileData>>();
  const [period, setPeriod] = useState<Period>('all');
  const [ranking, setRanking] = useState<{ token: string; periods: Partial<Record<Period, Result<Leaderboard>>> }>();
  const profileValid = profileId.test(id);
  const cachedRankings = ranking?.token === token ? ranking?.periods : undefined;
  const currentRanking = cachedRankings?.[period];
  const allTime = cachedRankings?.all?.data;
  const rank = allTime?.entries.find((entry) => entry.id === id)?.rank ??
    (allTime?.own?.id === id ? allTime.own.rank : null);

  useEffect(() => {
    if (!profileValid) return;
    const controller = new AbortController();
    void api<SharedProfileData>('/users/shared/' + id, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setProfile({ data }); })
      .catch((failure) => {
        if (!controller.signal.aborted) setProfile({ error: explain(failure, { 404: 'Profil havolasi mavjud emas yoki ulashish o‘chirilgan.' }) });
      });
    return () => controller.abort();
  }, [id, profileValid]);

  useEffect(() => {
    if (!token || currentRanking) return;
    const controller = new AbortController();
    const save = (result: Result<Leaderboard>) => {
      if (controller.signal.aborted) return;
      setRanking((previous) => ({
        token,
        periods: { ...(previous?.token === token ? previous.periods : undefined), [period]: result },
      }));
    };
    void api<Leaderboard>('/leaderboard?period=' + period, { token, signal: controller.signal })
      .then((data) => save({ data }))
      .catch((failure) => save({ error: explain(failure) }));
    return () => controller.abort();
  }, [currentRanking, period, token]);

  const failure = profileValid ? profile?.error : 'Profil havolasi mavjud emas.';
  return <div className="shared-profile">
    <header className="shared-profile-header">
      <div className="shared-profile-header-inner">
        <Brand />
        <Link className="shared-profile-back" href={routes.leaderboard} lang="en"><ArrowLeft size={18} aria-hidden="true" /> Leaderboard</Link>
      </div>
    </header>
    <main id="main" className="shared-profile-layout" tabIndex={-1}>
      <div className="shared-profile-main">
        {failure ? <section className="shared-profile-panel shared-profile-unavailable"><h1>Ochiq profil</h1><Notice error>{failure}</Notice></section>
          : profile?.data ? <ProfileDetails id={id} profile={profile.data} rank={rank} />
          : <p className="shared-profile-panel" role="status">Profil yuklanmoqda…</p>}
      </div>
      <RankingSidebar activeId={id} period={period} onPeriodChange={setPeriod} result={currentRanking} signedIn={Boolean(token)}
        onRetry={() => setRanking((previous) => previous && { ...previous, periods: { ...previous.periods, [period]: undefined } })} />
    </main>
  </div>;
}

function RankingSidebar({ activeId, period, onPeriodChange, result, signedIn, onRetry }: {
  activeId: string; period: Period; onPeriodChange: (period: Period) => void;
  result?: Result<Leaderboard>; signedIn: boolean; onRetry: () => void;
}) {
  const entries = result?.data?.entries.slice(0, 10) ?? [];
  return <aside className="shared-profile-panel shared-ranking" aria-labelledby="shared-ranking-title">
    <header className="shared-ranking-heading">
      <Trophy className="shared-ranking-trophy" size={29} aria-hidden="true" />
      <div><h2 id="shared-ranking-title" lang="en">Leaderboard</h2><p>LexiMind yetakchilari</p></div>
      {signedIn && <div className="shared-ranking-periods" role="group" aria-label="Reyting davri">
        {periods.map(({ key, label }) => <button key={key} type="button" aria-pressed={period === key}
          onClick={() => onPeriodChange(key)}>{label}</button>)}
      </div>}
    </header>
    <div className="shared-ranking-results" aria-busy={signedIn && !result}>
      {!signedIn ? <p className="shared-profile-note">Reytingni ko‘rish uchun <Link href={routes.login}>akkauntga kiring</Link>.</p>
        : result?.error ? <div className="shared-profile-note" role="status">{result.error} <button type="button" onClick={onRetry}>Qayta urinish</button></div>
        : !result ? <p className="shared-profile-note" role="status">Reyting yuklanmoqda…</p>
        : entries.length ? <ol className="shared-ranking-list">
          {entries.map((entry) => <RankingRow key={entry.id} entry={entry} selected={entry.id === activeId} />)}
        </ol> : <p className="shared-profile-note">Bu davrda natijalar hali yo‘q.</p>}
    </div>
    <Link className="shared-ranking-link" href={routes.leaderboard}>To‘liq reytingni ko‘rish <ChevronRight size={16} aria-hidden="true" /></Link>
  </aside>;
}

function RankingRow({ entry, selected }: { entry: RankingEntry; selected: boolean }) {
  const row = <>
    <span className="shared-ranking-place" data-place={entry.rank}>{entry.rank}</span>
    <span className="shared-ranking-crown" data-place={entry.rank}>{entry.rank !== null && entry.rank <= 3 && <Crown size={15} aria-hidden="true" />}</span>
    <UserAvatar className="shared-ranking-avatar" name={entry.fullName} url={entry.avatarUrl} />
    <span className="shared-ranking-name"><span>{entry.fullName}</span>
      {entry.hasProfileBadge && <BadgeCheck size={14} aria-label="Tasdiqlangan profil" />}</span>
    <strong className="shared-ranking-xp">{number.format(entry.xp)} XP</strong>
  </>;
  return <li>{entry.canViewProfile
    ? <Link href={routes.sharedProfile + '/' + entry.id} className="shared-ranking-row" aria-current={selected ? 'page' : undefined}>{row}</Link>
    : <div className="shared-ranking-row">{row}</div>}</li>;
}

function ProfileDetails({ id, profile, rank }: { id: string; profile: SharedProfileData; rank: number | null }) {
  const [tab, setTab] = useState<ProfileTab>('overview');
  const tabId = useId();
  const { statistics } = profile;
  const tabOffset = tabs.findIndex(({ key }) => key === tab);

  function moveTab(event: KeyboardEvent<HTMLDivElement>) {
    const last = tabs.length - 1;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? last
      : event.key === 'ArrowRight' ? (tabOffset + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (tabOffset + last) % tabs.length : undefined;
    if (next === undefined) return;
    event.preventDefault();
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus();
  }

  return <>
    <div className="shared-profile-panel shared-profile-hero">
      <ProfileCover appearance={defaultProfileAppearance}
        user={{ fullName: profile.fullName, hasProfileBadge: profile.hasProfileBadge, bio: profile.bio, socialLinks: profile.socialLinks }}
        level={profile.level}
        avatar={<UserAvatar className="profile-avatar" name={profile.fullName} url={profile.avatarUrl} />}
        toolbar={<ProfileActions id={id} name={profile.fullName} />} />
      {statistics && <ProfileMetrics statistics={statistics} rank={rank} />}
    </div>
    <div className="shared-profile-tabs" role="tablist" aria-label="Profil bo‘limlari" onKeyDown={moveTab}>
      {tabs.map(({ key, label, icon: Icon }) => <button key={key} type="button" role="tab" id={tabId + key}
        tabIndex={tab === key ? 0 : -1} aria-selected={tab === key} aria-controls={tabId + key + '-panel'}
        onFocus={() => setTab(key)} onClick={() => setTab(key)}><Icon size={16} aria-hidden="true" /> {label}</button>)}
    </div>
    {tabs.map(({ key }) => <div key={key} role="tabpanel" className="shared-profile-tab-panel" hidden={tab !== key}
      id={tabId + key + '-panel'} aria-labelledby={tabId + key} tabIndex={0}>
      {tab === key && (key === 'collections' ?
        <p className="shared-profile-panel shared-profile-note">To‘plamlar faqat profil egasiga ko‘rinadi.</p>
        : !statistics ? <p className="shared-profile-panel shared-profile-note">Profil egasi o‘quv statistikasini yashirgan.</p>
        : key === 'achievements' ? <Milestones statistics={statistics} rank={rank} />
        : <>
          <div className="shared-profile-summary">
            <LearningProgress statistics={statistics} />
            <ActivityChart weeklyXp={statistics.weeklyXp} />
          </div>
          {key === 'statistics' ? <StatisticsDetails statistics={statistics} />
            : <Milestones statistics={statistics} rank={rank} onViewAll={() => {
              document.getElementById(tabId + 'achievements')?.focus();
            }} />}
        </>)}
    </div>)}
  </>;
}

function ProfileActions({ id, name }: { id: string; name: string }) {
  const [message, setMessage] = useState('');
  const menuId = useId();
  const href = routes.sharedProfile + '/' + id;
  const url = new URL(href, window.location.origin).href;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Havola nusxalandi.');
    } catch {
      setMessage('Havolani nusxalab bo‘lmadi.');
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: name + ' · LexiMind', url });
        return;
      } catch (failure) {
        if (failure instanceof DOMException && failure.name === 'AbortError') return;
      }
    }
    await copyLink();
  }

  return <div className="shared-profile-actions">
    <div className="profile-cover-toolbar">
      <button type="button" onClick={() => void share()}><Share2 size={15} aria-hidden="true" /> Ulashish</button>
      <button type="button" aria-label="Profil amallari" popoverTarget={menuId}><EllipsisVertical size={17} aria-hidden="true" /></button>
    </div>
    <div id={menuId} className="shared-profile-menu" popover="auto">
      <button type="button" onClick={(event) => {
        event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover();
        void copyLink();
      }}><Copy size={15} aria-hidden="true" /> Havolani nusxalash</button>
      <a href={href} target="_blank" rel="noopener"><ExternalLink size={15} aria-hidden="true" /> Yangi varaqda ochish</a>
    </div>
    <span role="status" className="shared-profile-action-status">{message}</span>
  </div>;
}

function ProfileMetrics({ statistics, rank }: { statistics: ProfileStatistics; rank: number | null }) {
  const metrics = [
    { label: 'Jami XP', value: number.format(statistics.xp), icon: Star },
    { label: 'Sessiyalar', value: number.format(statistics.sessions), icon: BarChart3 },
    { label: 'Joriy seriya', value: number.format(statistics.streakDay) + ' kun', icon: Flame },
    { label: 'Umumiy o‘rin', value: rank === null ? '—' : '#' + number.format(rank), icon: Crown },
  ];

  return <dl className="shared-profile-metrics">{metrics.map(({ label, value, icon: Icon }) => <div key={label}>
    <dt><Icon size={19} aria-hidden="true" /><span>{label}</span></dt><dd>{value}</dd>
  </div>)}</dl>;
}

function LearningProgress({ statistics }: { statistics: ProfileStatistics }) {
  const accuracy = statistics.accuracy;
  const activeWeeks = statistics.weeklyXp.filter(({ xp }) => xp > 0).length;
  return <section className="shared-profile-panel shared-profile-learning" aria-labelledby="shared-progress-title">
    <h2 id="shared-progress-title">O‘quv taraqqiyoti</h2>
    <div className="shared-profile-learning-body">
      <div className="shared-profile-ring">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="44" />
          {accuracy !== null && <circle className="shared-profile-ring-fill" cx="50" cy="50" r="44" pathLength="100"
            strokeDasharray={Math.max(0, Math.min(100, accuracy)) + ' 100'} />}
        </svg>
        <span><strong>{accuracy === null ? '—' : number.format(accuracy) + '%'}</strong><small>Aniqlik</small></span>
      </div>
      <div className="shared-profile-learning-values">
        <p>O‘rganilgan so‘zlar <strong>{number.format(statistics.learnedWords)}</strong></p>
        <div className="shared-profile-learning-weeks">
          <span>Faol haftalar</span>
          <strong>{activeWeeks} / {statistics.weeklyXp.length}</strong>
        </div>
        {statistics.weeklyXp.length > 0 && <div className="shared-profile-week-track" aria-hidden="true">
          <span style={{ inlineSize: activeWeeks / statistics.weeklyXp.length * 100 + '%' }} />
        </div>}
      </div>
    </div>
  </section>;
}

function ActivityChart({ weeklyXp }: { weeklyXp: ProfileStatistics['weeklyXp'] }) {
  const [range, setRange] = useState<(typeof ranges)[number]>(4);
  const points = weeklyXp.slice(-range).map(({ date, xp }) => {
    const week = new Date(date + 'T00:00:00Z');
    const day = week.getUTCDate();
    const month = uzbekMonths[week.getUTCMonth()];
    return { label: day + ' ' + month.slice(0, 3), detail: day + '-' + month, value: xp };
  });
  const highest = Math.max(0, ...points.map(({ value }) => value));
  const unit = 10 ** Math.max(0, Math.floor(Math.log10(highest || 1)) - 1);
  const maximum = Math.ceil(highest / (unit * 4)) * unit * 4;
  return <section className="shared-profile-panel shared-profile-activity" aria-labelledby="shared-activity-title">
    <header><h2 id="shared-activity-title">Faollik grafigi</h2>
      <label className="shared-profile-range"><select aria-label="Grafik davri" value={range}
        onChange={(event) => setRange(ranges.find((weeks) => String(weeks) === event.currentTarget.value) ?? 4)}>
        {ranges.map((weeks) => <option key={weeks} value={weeks}>Oxirgi {weeks} hafta</option>)}
      </select><ChevronDown size={14} aria-hidden="true" /></label>
    </header>
    {highest && points.length > 1 ? <StatisticsChart key={range} points={points} kind="area" maximum={maximum} unit=" XP" showDots />
      : <p className="shared-profile-note">Tanlangan davrda haftalik XP ma’lumoti yo‘q.</p>}
  </section>;
}

function StatisticsDetails({ statistics }: { statistics: ProfileStatistics }) {
  return <section className="shared-profile-panel shared-profile-details" aria-labelledby="shared-detail-title">
    <h2 id="shared-detail-title">O‘quv natijalari</h2>
    <dl>
      <div><dt><Clock3 size={16} aria-hidden="true" /> O‘rganish vaqti</dt><dd>{duration(statistics.studySeconds)}</dd></div>
      <div><dt><Layers size={16} aria-hidden="true" /> Tugallangan sessiyalar</dt><dd>{number.format(statistics.sessions)}</dd></div>
      <div><dt><Target size={16} aria-hidden="true" /> Umumiy aniqlik</dt><dd>{statistics.accuracy === null ? '—' : number.format(statistics.accuracy) + '%'}</dd></div>
    </dl>
  </section>;
}

function Milestones({ statistics, rank, onViewAll }: { statistics: ProfileStatistics; rank: number | null; onViewAll?: () => void }) {
  const milestones = [
    { earned: statistics.streakDay >= 7, label: 'Faollik seriyasi', detail: '7 kun', icon: Flame, tone: 'amber' },
    { earned: statistics.learnedWords >= 10, label: 'So‘z boyligi', detail: '10 ta so‘z', icon: BookOpen, tone: 'violet' },
    { earned: statistics.xp >= 1000, label: 'XP marrasi', detail: '1 000 XP', icon: Zap, tone: 'blue' },
    { earned: rank !== null && rank <= 3, label: 'Top 3', detail: 'Umumiy reyting', icon: Crown, tone: 'gold' },
    { earned: statistics.sessions >= 10, label: 'Mashq odati', detail: '10 ta sessiya', icon: Medal, tone: 'mint' },
    { earned: statistics.sessions >= 1, label: 'Birinchi qadam', detail: 'Birinchi sessiya', icon: Flag, tone: 'violet' },
  ].filter(({ earned }) => earned);
  const shown = onViewAll ? milestones.slice(0, 5) : milestones;
  return <section className="shared-profile-panel shared-profile-milestones" aria-labelledby="shared-milestones-title">
    <header><h2 id="shared-milestones-title"><Trophy size={17} aria-hidden="true" /> O‘quv marralari</h2>
      {onViewAll && milestones.length > 0 && <button type="button" onClick={onViewAll}>Barchasi <ChevronRight size={15} aria-hidden="true" /></button>}
    </header>
    {shown.length ? <ul>{shown.map(({ label, detail, icon: Icon, tone }) => <li key={label} data-tone={tone}>
      <span className="shared-milestone-shield"><Icon size={21} aria-hidden="true" /></span>
      <strong>{label}</strong><span>{detail}</span>
    </li>)}</ul> : <p className="shared-profile-note">Hali o‘quv marralari qayd etilmagan.</p>}
  </section>;
}
