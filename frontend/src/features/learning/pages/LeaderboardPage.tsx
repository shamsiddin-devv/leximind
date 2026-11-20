import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, BadgeCheck, Crown, Flame, Trophy, UserRound } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { api, explain } from '../../../shared/services/api';
import type { Leaderboard, RankingEntry } from '../../../shared/types/api';
import './LeaderboardPage.css';

type Lookup = { result: Leaderboard; error?: never } | { result?: never; error: string };
const number = new Intl.NumberFormat('uz-UZ');
const podiumOrder = [2, 1, 3] as const;

export function LeaderboardPage({ token }: { token: string }) {
  const [lookup, setLookup] = useState<{ token: string; response: Lookup }>();
  const [revision, setRevision] = useState(0);
  const current = lookup?.token === token ? lookup.response : undefined;
  const ranking = current?.result;
  const own = ranking?.own;

  useEffect(() => {
    const controller = new AbortController();
    void api<Leaderboard>('/leaderboard', { token, signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setLookup({ token, response: { result } });
    }).catch((failure) => {
      if (!controller.signal.aborted) setLookup({ token, response: { error: explain(failure) } });
    });
    return () => controller.abort();
  }, [token, revision]);

  return <div className="container screen leaderboard-page">
    <section className="leaderboard-hero" aria-labelledby="leaderboard-title" aria-busy={!current}>
      <header className="leaderboard-header">
        <h1 id="leaderboard-title" lang="en">Leaderboard</h1>
        <p>Kim oldinda? Natijangizni ko‘ring va yangi marraga intiling.</p>
      </header>
      <div className="leaderboard-podium" aria-label="Eng yuqori uch o‘rin"
        data-entrance={ranking ? 'ready' : current ? undefined : 'pending'}>
        {podiumOrder.map((place) => <PodiumPlace key={place} place={place} item={ranking?.entries[place - 1]} ownId={own?.id} />)}
      </div>
    </section>
    {current?.error && <div className="leaderboard-notice"><Notice error>{current.error}</Notice>
      <button type="button" className="button secondary" onClick={() => { setLookup(undefined); setRevision((value) => value + 1); }}>Qayta urinish</button>
    </div>}
    {!current && <p className="leaderboard-notice" role="status">Reyting yuklanmoqda…</p>}
    {ranking && <>
      {ranking.entries.length > 3 && <ol className="leaderboard-rows" start={4} aria-label="Keyingi o‘rinlar">
        {ranking.entries.slice(3).map((entry) => <li key={entry.id}>
          <RankingLink item={entry} ownId={own?.id} className="leaderboard-row">
            <span className="leaderboard-row-rank">{entry.rank}</span>
            <UserAvatar className="leaderboard-row-avatar" name={entry.fullName} url={entry.avatarUrl} />
            <span className="leaderboard-row-name"><LearnerName item={entry} ownId={own?.id} /></span>
            <strong className="leaderboard-row-xp">{number.format(entry.xp)} XP</strong>
            <span className="leaderboard-row-streak" aria-label={entry.streak + ' kunlik seriya'}>
              <Flame size={16} aria-hidden="true" /> {number.format(entry.streak)}
            </span>
          </RankingLink>
        </li>)}
      </ol>}
      {ranking.participants < 3 && <p className="leaderboard-availability">
        {ranking.participants ? 'Keyingi o‘rinlar yangi natijalar bilan to‘ladi.' : 'Reytingga tushgan natijalar hali yo‘q.'}
      </p>}
      {own && <RankingLink item={own} ownId={own.id} className="leaderboard-own">
        <span className="leaderboard-own-icon"><Trophy size={20} aria-hidden="true" /></span>
        <span><strong>Sizning natijangiz</strong><small>{own.rank ? own.rank + '-o‘rin · ' + ranking.participants + ' ishtirokchi' : 'Hali o‘rin olinmagan'}</small></span>
        <strong>{number.format(own.xp)} XP</strong>
        <ArrowUpRight size={17} aria-hidden="true" />
      </RankingLink>}
      {own && !own.rank && own.xp > 0 && <p className="leaderboard-availability">
        Reytingda qatnashish uchun <Link href={routes.settingsPrivacy} className="text-link">profil va statistikani oching</Link> hamda profilni ulashishga ruxsat bering.
      </p>}
    </>}
  </div>;
}

function LearnerName({ item, ownId }: { item: RankingEntry; ownId?: string }) {
  return <><span>{item.fullName}</span>
    {item.hasProfileBadge && <BadgeCheck className="leaderboard-verified" size={16} aria-label="Tasdiqlangan profil" />}
    {item.id === ownId && <small className="leaderboard-you">Siz</small>}</>;
}

function RankingLink({ item, ownId, className, children }: {
  item: RankingEntry; ownId?: string; className: string; children: ReactNode;
}) {
  const href = item.canViewProfile ? routes.sharedProfile + '/' + item.id : item.id === ownId ? routes.profile : undefined;
  return href ? <Link href={href} className={className}>{children}</Link> : <div className={className}>{children}</div>;
}

function PodiumPlace({ place, item, ownId }: { place: 1 | 2 | 3; item?: RankingEntry; ownId?: string }) {
  const contents = <>
    {place === 1 && <Crown className="podium-crown" size={42} aria-hidden="true" />}
    <div className="podium-medallion">
      {place !== 1 && <span className="podium-rank-marker" aria-hidden="true">{place}</span>}
      {item ? <UserAvatar className="podium-avatar" name={item.fullName} url={item.avatarUrl} />
        : <span className="podium-avatar" aria-hidden="true"><UserRound size={28} /></span>}
      <span className="podium-place" role="img" aria-label={place + '-o‘rin'}>{place}</span>
    </div>
    <div className="podium-column">
      {place === 1 && item && <span className="podium-champion-highlight" aria-hidden="true" />}
      <strong className="podium-name">{item ? <LearnerName item={item} ownId={ownId} /> : <span>Bo‘sh o‘rin</span>}</strong>
      {item ? <span className="podium-xp"><Flame size={15} aria-hidden="true" /> {number.format(item.xp)} XP</span>
        : <span className="podium-xp">—</span>}
    </div>
  </>;
  return <div className="podium-slot" data-place={place} data-filled={Boolean(item)}>
    {item ? <RankingLink item={item} ownId={ownId} className="podium-link">{contents}</RankingLink>
      : <div className="podium-link">{contents}</div>}
  </div>;
}
