import { ArrowRight, BookOpen, CalendarDays, Check, CircleHelp, Clock3, Flame, Layers3, Play, RotateCcw, Sparkles, Target } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { useInterfaceLanguage } from '../../../app/language';
import { Link, routes } from '../../../app/router';
import { Speak } from '../../../shared/components/UI';
import type { Activity, Plan, Profile, SessionSummary, Statistics, Word } from '../../../shared/types/api';
import { api } from '../../../shared/services/api';
import { dateKey, uzbekMonths } from '../../../shared/utils/date';
import { activities } from '../../practice/activities';
import { ActivityTile } from '../../practice/components/ActivityTile';
import { describeDailySession } from '../dailySession';
import { dashboardCopy } from './dashboardCopy';
import './Dashboard.css';

type Props = {
  name: string; token: string; profile?: Profile; plan?: Plan; history: SessionSummary[]; stats?: Statistics; busy: boolean;
  onStart: () => void; onActivity: (kind: Activity) => void;
};
const uzbekDays = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const weekDay = (date: Date) => (date.getUTCDay() + 6) % 7;

const dailyWordMessages = {
  uz: ['Kun so‘zi yuklanmoqda…', 'Bugun uchun so‘z mavjud emas.', 'Kun so‘zini yuklab bo‘lmadi.'],
  en: ['Loading the word of the day…', 'No word is available today.', 'The word of the day could not be loaded.'],
  ru: ['Загружаем слово дня…', 'Сегодня слово недоступно.', 'Не удалось загрузить слово дня.'],
} as const;

export function Dashboard({ name, token, profile, plan, history, stats, busy, onStart, onActivity }: Props) {
  const language = useInterfaceLanguage();
  const copy = dashboardCopy[language];
  const timeZone = 'UTC';
  const dateFormatter = new Intl.DateTimeFormat(copy.dateLocale, { day: 'numeric', month: 'long', timeZone });
  const weekdayFormatter = new Intl.DateTimeFormat(copy.dateLocale, { weekday: 'short', timeZone });
  const dayLabel = (date: Date) => language === 'uz' ? uzbekDays[weekDay(date)] : weekdayFormatter.format(date);
  const today = new Date(dateKey(new Date(), profile?.timezone) + 'T12:00:00Z');
  const weekday = weekDay(today);
  const firstName = name.trim().split(/\s+/)[0];
  const utcDay = dateKey(new Date(), 'UTC');
  const [daily, setDaily] = useState<{ word: Word | null; failed?: boolean; date: string }>();
  const dailyResult = daily?.date === utcDay ? daily : undefined;
  const featuredWord = dailyResult?.word;
  useEffect(() => {
    const controller = new AbortController();
    void api<{ word: Word | null }>('/words/daily', { token, signal: controller.signal })
      .then(({ word }) => { if (!controller.signal.aborted) setDaily({ word, date: utcDay }); })
      .catch(() => { if (!controller.signal.aborted) setDaily({ word: null, failed: true, date: utcDay }); });
    return () => controller.abort();
  }, [token, utcDay]);
  const count = plan?.dailyNewReviewed ?? 0;
  const goal = plan?.dailyNewLimit ?? profile?.dailyNewWords ?? 10;
  const ratio = Math.min(1, count / goal);
  const finishedDays = new Set(history.flatMap((session) => session.status === 'completed' && session.endedAt ? [dateKey(new Date(session.endedAt), profile?.timezone)] : []));
  if (profile?.lastSessionAt) finishedDays.add(dateKey(new Date(profile.lastSessionAt), profile.timezone));
  const randomPractice = profile?.reviewMode === 'random' && !plan?.activeSessionId;
  const [title, detail, action] = describeDailySession(profile, plan, language);
  const forecast = plan?.forecast ?? [];
  const maxForecast = Math.max(1, ...forecast.map((item) => item.count));

  return <div className="container screen study-home">
    <header className="study-home-header">
      <div><h1>{firstName ? <>{copy.hello}, <em>{firstName}!</em></> : copy.hello + '!'}</h1>
        <p>{copy.description}</p></div>
      <div className="study-home-meta">
        {profile && <span><BookOpen size={15} aria-hidden="true" /> {copy.level(profile.level)}</span>}
        <time dateTime={dateKey(today, 'UTC')}><CalendarDays size={15} aria-hidden="true" /> {language === 'uz' ? today.getUTCDate() + '-' + uzbekMonths[today.getUTCMonth()] : dateFormatter.format(today)}</time>
      </div>
    </header>
    <section className="study-home-focus" aria-labelledby="daily-title">
      <div className="study-home-focus-copy">
        <span className="study-home-focus-label"><Sparkles size={15} aria-hidden="true" /> {copy.daily}</span>
        <h2 id="daily-title">{title}</h2>
        <p>{!randomPractice && plan?.nextAction === 'START_SESSION'
          ? copy.available(plan.availableNow) : detail}</p>
        <div className="study-home-actions">
          <button type="button" className="study-home-start" onClick={onStart} disabled={busy || !plan}>
            <Play size={15} fill="currentColor" aria-hidden="true" /> {busy ? copy.loading : action}
          </button>
          <Link href={routes.studyPlan} className="study-home-plan">{copy.studyPlan} <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
      <div className="study-home-art">
        <img src="/learning-book.webp" width="840" height="560" alt="" fetchPriority="high" />
      </div>
    </section>
    <div className="study-home-grid">
      <div className="study-home-main">
        {stats && <section className="panel summary-strip" aria-label={copy.summary}>
          <div><span className="mini-icon blue"><Layers3 size={19} /></span><span><strong>{stats.cards}</strong><small>{copy.cards}</small></span></div>
          <div><span className="mini-icon violet"><RotateCcw size={19} /></span><span><strong>{stats.reviews}</strong><small>{copy.reviews}</small></span></div>
          <div><span className="mini-icon mint"><Check size={20} /></span><span><strong>{stats.sessions}</strong><small>{copy.sessions}</small></span></div>
        </section>}
        <section className="quick-section" aria-labelledby="quick-title">
          <div className="section-heading"><h2 id="quick-title">{copy.quickTitle}</h2>
            <Link className="text-link" href={routes.games}>{copy.allGames} <ArrowRight size={16} /></Link>
          </div>
          <div className="activity-grid quick-grid">{activities.slice(0, 3).map((activity, index) => {
            const [title, detail] = copy.quick[index] ?? [activity.title, activity.detail];
            return <ActivityTile key={activity.id} activity={{ ...activity, title, detail }} action={copy.play} onSelect={onActivity} />;
          })}</div>
        </section>
        {plan && <section className="panel forecast" aria-labelledby="forecast-title">
          <div className="panel-label"><span className="mini-icon blue"><CalendarDays size={19} /></span><h2 id="forecast-title">{copy.forecast}</h2></div>
          {forecast.some(({ count: due }) => due > 0) ? <div className="forecast-graph">{forecast.map(({ date, count: due }) => {
            const day = dayLabel(new Date(date + 'T12:00:00Z'));
            return <div key={date} className="forecast-day">
              <span className="forecast-count">{due}</span>
              <span className="forecast-track"><span style={{ blockSize: Math.max(0, 100 * due / maxForecast) + '%' }} /></span>
              <span>{date === dateKey(today, 'UTC') ? copy.today : day}</span>
            </div>;
          })}</div> : <p>{copy.noForecast}</p>}
        </section>}
      </div>
      <aside className="study-home-rail" aria-label={copy.results}>
        <section className="panel goal">
          <div><div className="panel-label"><span className="mini-icon blue"><Target size={20} /></span><h2>{copy.goal}</h2></div>
            <p><strong>{count}</strong><span> / {goal} {copy.newWords}</span></p>
            {profile && <small className="goal-study-time"><Clock3 size={15} aria-hidden="true" /> {copy.minutes(profile.dailyStudyMinutes)}</small>}</div>
          <div className="goal-ring" style={{ '--fill': `${ratio * 100}%` } as CSSProperties} role="progressbar" aria-label={copy.goal} aria-valuemin={0} aria-valuenow={Math.min(count, goal)} aria-valuemax={goal}>
            <span>{Math.round(ratio * 100)}%</span></div>
        </section>
        <section className="panel streak">
          <div className="panel-label"><span className="mini-icon amber"><Flame size={19} fill="currentColor" strokeWidth={1.7} /></span><h2>{copy.streak}</h2></div>
          <div className="streak-count"><strong>{profile?.streakDay ?? '–'}</strong><span>{copy.daysInARow}</span></div>
          <div className="week">{uzbekDays.map((_, index) => {
            const dayDate = new Date(today);
            dayDate.setUTCDate(today.getUTCDate() + index - weekday);
            const day = dayLabel(dayDate);
            const done = finishedDays.has(dateKey(dayDate, 'UTC'));
            return <div key={index} className={`week-day ${index === weekday ? 'today' : ''} ${done ? 'done' : ''}`} aria-label={`${day}${index === weekday ? ', ' + copy.today : ''}${done ? ', ' + copy.done : ''}`}>
              <span>{day}</span><span className="day-dot">{done ? <Check size={13} strokeWidth={3} /> : <span />}</span>
            </div>;
          })}</div>
        </section>
        <section className="panel word-panel study-home-word">
          <div className="panel-label"><span className="mini-icon violet"><BookOpen size={19} aria-hidden="true" /></span><h2>{copy.word}</h2>{featuredWord && <span className="level">{featuredWord.cefrLevel}</span>}</div>
          {featuredWord ? <>
            <div className="word-title"><strong lang="en">{featuredWord.text}</strong><Speak text={featuredWord.text} url={featuredWord.audioUrl} label={copy.speak} /></div>
            {featuredWord.sense[0] && <p title={copy.wordHint} lang="uz">{featuredWord.sense[0].translationUz}</p>}
          </> : <p role="status">{dailyWordMessages[language][!dailyResult ? 0 : dailyResult.failed ? 2 : 1]}</p>}
          <Link className="text-link" href={routes.vocabulary}>{copy.vocabulary} <ArrowRight size={15} /></Link>
        </section>
        {Boolean(plan?.difficultWords.length) && <section className="panel difficult">
          <div className="panel-label"><span className="mini-icon amber"><CircleHelp size={19} /></span><h2>{copy.hardWords}</h2></div>
          <ul>{plan?.difficultWords.slice(0, 3).map(({ wordId, text, againCount }) => <li key={wordId}><span lang="en">{text}</span><small>{copy.repeats(againCount)}</small></li>)}</ul>
        </section>}
      </aside>
    </div>
  </div>;
}
