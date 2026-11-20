import { ArrowRight, Check, CirclePlay, Clock3, Flame, Headphones, ListOrdered, Play, RotateCcw, Settings2 } from 'lucide-react';
import type { GameKind, Plan, Profile } from '../../../shared/types/api';
import { Link, routes } from '../../../app/router';
import { uzbekMonths } from '../../../shared/utils/date';
import { describeDailySession } from '../dailySession';
import './StudyPlanPage.css';

const weekdays = ['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
type PlanDay = { date: string; label: string; dayOfMonth: number; today: boolean; past: boolean; completed: boolean; scheduled: number };
type PlanActions = { busy: boolean; onStart: () => void; onPractice: (kind: GameKind) => void };

export function StudyPlanPage({ profile, plan, busy, planFailed, onStart, onPractice }: PlanActions & {
  profile?: Profile; plan?: Plan; planFailed: boolean;
}) {
  const ready = profile && plan?.activity;
  return <div className="container screen study-plan-page">
    <header className="study-plan-heading">
      <div>
        <p className="study-plan-kicker">Kunlik reja</p>
        <h1 lang="en">Study Plan</h1>
        <p className="study-plan-description">Kunlik maqsad, haftalik yo‘nalish va mashg‘ulotlar ketma-ketligi — barchasi bir joyda.</p>
      </div>
      <div className="study-plan-header-actions">
        <Link className="button secondary study-plan-settings" href={routes.settingsLearning}>
          <Settings2 size={14} aria-hidden="true" /> Rejani sozlash
        </Link>
      </div>
    </header>
    {ready ? <StudyPlanContent profile={profile} plan={plan} busy={busy} onStart={onStart} onPractice={onPractice} />
      : <p className="study-plan-loading" role="status">{planFailed || plan ? 'O‘quv rejasi ma’lumotlari hozircha mavjud emas.' : 'O‘quv rejasi yuklanmoqda…'}</p>}
  </div>;
}

function StudyPlanContent({ profile, plan, busy, onStart, onPractice }: PlanActions & { profile: Profile; plan: Plan }) {
  const { today, weekStart, completedDays, studyMinutesToday, currentStreak, longestStreak, gameKindsToday = [] } = plan.activity;
  const completedDates = new Set(completedDays);
  const upcoming = new Map(plan.forecast.map(({ date, count }) => [date, count]));
  const start = new Date(weekStart + 'T12:00:00Z');
  const days: PlanDay[] = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    const date = day.toISOString().slice(0, 10);
    return {
      date,
      label: weekdays[day.getUTCDay()],
      dayOfMonth: day.getUTCDate(),
      today: date === today,
      past: date < today,
      completed: completedDates.has(date),
      scheduled: date === today ? plan.availableNow : upcoming.get(date) ?? 0,
    };
  });
  const weekCompleted = days.filter((day) => day.completed).length;
  const [nextTitle, , action] = describeDailySession(profile, plan);
  const random = profile.reviewMode === 'random' && !plan.activeSessionId;
  const reviewing = plan.activeSessionId || plan.nextAction === 'START_SESSION';
  const mainTitle = random ? 'Tasodifiy so‘zlar mashqi' : reviewing ? 'Kartalarni takrorlash' : nextTitle.replace(/\.$/, '');
  const minutesLeft = Math.max(0, profile.dailyStudyMinutes - studyMinutesToday);
  const wordProgress = Math.min(100, Math.floor(100 * plan.dailyNewReviewed / plan.dailyNewLimit));
  const tasks = [
    { title: 'Yangi so‘zlar to‘plami', detail: 'Kunlik yangi so‘zlar maqsadi', value: plan.dailyNewReviewed + ' / ' + plan.dailyNewLimit + ' so‘z',
      done: plan.dailyNewReviewed >= plan.dailyNewLimit },
    { title: 'Tinglash mashqi', detail: 'Eshitgan so‘zingizni yozing', value: 'Diktant',
      done: gameKindsToday.includes('word_dictation') || gameKindsToday.includes('sentence_dictation') },
    { title: 'O‘rganish vaqti', detail: 'Kunlik vaqt maqsadi', value: studyMinutesToday + ' / ' + profile.dailyStudyMinutes + ' daq',
      done: minutesLeft === 0 },
    { title: 'Gap tuzish', detail: 'So‘zlarni to‘g‘ri tartibda joylashtirish', value: 'Mashq',
      done: gameKindsToday.includes('build_sentence') },
    { title: 'Kunlik takrorlash', detail: plan.activeSessionId ? 'Seans davom etmoqda'
      : plan.availableNow ? 'Takrorlash vaqti kelgan so‘zlar'
      : completedDates.has(today) ? 'Bugungi seans yakunlandi' : 'Hozircha tayyor kartalar yo‘q',
      value: plan.availableNow + ' karta',
      done: !plan.activeSessionId && !plan.availableNow && completedDates.has(today) },
  ];
  const done = tasks.filter((task) => task.done).length;

  return <>
    <div className="study-plan-pair study-plan-overview">
      <section className="study-plan-card study-plan-today" aria-labelledby="study-plan-today-title">
        <div className="study-plan-today-main">
          <div className="study-plan-ring" role="progressbar" aria-label="Yangi so‘zlar maqsadi"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={wordProgress}
            aria-valuetext={plan.dailyNewReviewed + ' / ' + plan.dailyNewLimit + ' so‘z'}>
            <svg viewBox="0 0 112 112" aria-hidden="true">
              <circle cx="56" cy="56" r="53" className="study-plan-ring-track" />
              <circle cx="56" cy="56" r="53" pathLength="100" strokeDasharray="100"
                strokeDashoffset={100 - wordProgress} className="study-plan-ring-value" />
            </svg>
            <div aria-hidden="true"><strong>{wordProgress}%</strong><span>Bajarildi</span></div>
          </div>
          <div className="study-plan-today-content">
            <p className="study-plan-kicker">Bugungi mashg‘ulot</p>
            <h2 id="study-plan-today-title">{mainTitle}</h2>
            <PlanProgress label="Yangi so‘zlar" value={plan.dailyNewReviewed} max={plan.dailyNewLimit} />
            <PlanProgress label="O‘rganish vaqti" value={studyMinutesToday} max={profile.dailyStudyMinutes} unit="daqiqa" positive />
          </div>
        </div>
        <footer className="study-plan-today-footer">
          <p>{minutesLeft ? <>Yana <strong>{minutesLeft} daqiqa</strong> qoldi</> : 'Vaqt maqsadi bajarildi'}
            <span> · </span>{tasks.length - done} ta vazifa</p>
          <button type="button" className="button study-plan-continue" disabled={busy} onClick={onStart}>
            <CirclePlay size={14} aria-hidden="true" /> {busy ? 'Yuklanmoqda…' : plan.activeSessionId ? 'Davom ettirish' : action}
          </button>
        </footer>
      </section>

      <section className="study-plan-card study-plan-streak" aria-labelledby="study-plan-streak-title">
        <header><h2 id="study-plan-streak-title">Seriya</h2><p>Ketma-ket o‘rganilgan kunlar</p></header>
        <div className="study-plan-streak-summary">
          <p><strong>{currentStreak}</strong> kun</p>
          <span className="study-plan-record"><Flame size={14} aria-hidden="true" /> Eng uzun: {longestStreak}</span>
        </div>
        <ol className="study-plan-streak-days" aria-label="Shu haftadagi faollik">
          {days.map((day) => <li key={day.date} aria-current={day.today ? 'date' : undefined} data-done={day.completed}>
            <span className="study-plan-streak-dot">{day.completed ? <Check size={15} aria-hidden="true" /> : day.label}</span>
            <time dateTime={day.date}><span className="study-plan-sr-only">{formatDay(day.date)} · {day.completed ? 'Bajarildi' : 'Yakunlangan seans yo‘q'}</span>
              <span aria-hidden="true">{day.dayOfMonth}</span></time>
          </li>)}
        </ol>
        <div className="study-plan-streak-foot">
          <PlanProgress label="Haftalik faollik" value={weekCompleted} max={7} unit="kun" positive />
        </div>
      </section>
    </div>

    <section className="study-plan-week" id="study-plan-week" aria-labelledby="study-plan-week-title">
      <header className="study-plan-week-heading">
        <div><p className="study-plan-kicker">Haftalik yo‘nalish</p>
          <h2 id="study-plan-week-title">{formatWeek(weekStart, days[6].date)}</h2></div>
        <p>{weekCompleted} / 7 kun bajarildi</p>
      </header>
      <ol className="study-plan-week-days">
        {days.map((day) => <li key={day.date} className="study-plan-day" aria-current={day.today ? 'date' : undefined} data-done={day.completed}>
          <div className="study-plan-day-top">
            <span>{day.label}</span>
            {day.today ? <Play size={11} fill="currentColor" aria-hidden="true" />
              : day.completed ? <Check size={13} aria-hidden="true" /> : !day.past && <Clock3 size={12} aria-hidden="true" />}
          </div>
          <time dateTime={day.date}>{formatDay(day.date, true)}</time>
          <strong>{day.today ? 'Bugungi mashg‘ulot' : day.completed ? 'Mashq bajarildi' : day.past ? 'Mashq qayd etilmagan' : 'Takrorlash'}</strong>
          {!day.past && <span className="study-plan-day-note">{day.today ? day.scheduled + ' ta tayyor karta'
            : day.scheduled ? day.scheduled + ' ta karta' : 'Rejalashtirilmagan'}</span>}
        </li>)}
      </ol>
    </section>

    <div className="study-plan-pair study-plan-bottom">
      <section className="study-plan-card study-plan-tasks" aria-labelledby="study-plan-tasks-title">
        <header className="study-plan-tasks-heading">
          <div><h2 id="study-plan-tasks-title">Bugungi vazifalar</h2><p>{done} / {tasks.length} bajarildi</p></div>
          <strong>{Math.round(100 * done / tasks.length)}%</strong>
        </header>
        <ol className="study-plan-task-list">
          {tasks.map((task) => <li key={task.title} data-done={task.done}>
            <span className="study-plan-task-check" aria-hidden="true">{task.done && <Check size={14} />}</span>
            <div><strong>{task.title}</strong><p>{task.detail}</p></div>
            <small className="study-plan-task-value">{task.value}</small>
            <span className="study-plan-sr-only">{task.done ? 'Bajarildi' : 'Bajarilmagan'}</span>
          </li>)}
        </ol>
      </section>
      <NextSteps plan={plan} busy={busy} onPractice={onPractice} />
    </div>
  </>;
}

function PlanProgress({ label, value, max, unit, positive = false }: {
  label: string; value: number; max: number; unit?: string; positive?: boolean;
}) {
  return <div className="study-plan-track" data-positive={positive}>
    <div><span>{label}</span><span>{value} / {max}{unit ? ' ' + unit : ''}</span></div>
    <progress max={max} value={Math.min(value, max)} aria-label={label} />
  </div>;
}

function NextSteps({ plan, busy, onPractice }: { plan: Plan } & Pick<PlanActions, 'busy' | 'onPractice'>) {
  const upcoming = plan.forecast.find((day) => day.count > 0);
  return <section className="study-plan-card study-plan-next" aria-labelledby="study-plan-next-title">
    <header><h2 id="study-plan-next-title">Keyingi qadamlar</h2><p>Yaqin mashg‘ulotlar</p></header>
    <ul className="study-plan-next-list">
      <li><button type="button" disabled={busy} onClick={() => onPractice('word_dictation')}>
        <span className="study-plan-next-icon"><Headphones size={16} aria-hidden="true" /></span>
        <span><strong>Tinglash mashqi</strong><small>So‘z diktanti · Istalgan vaqtda</small></span>
      </button></li>
      <li><button type="button" disabled={busy} onClick={() => onPractice('build_sentence')}>
        <span className="study-plan-next-icon"><ListOrdered size={16} aria-hidden="true" /></span>
        <span><strong>Gap tuzish</strong><small>Grammatika mashqi · Istalgan vaqtda</small></span>
      </button></li>
      <li><Link className="study-plan-next-item" href={routes.learningSessions}>
        <span className="study-plan-next-icon"><RotateCcw size={16} aria-hidden="true" /></span>
        <span><strong>Haftalik takrorlash</strong><small>{upcoming ? <>
          <time dateTime={upcoming.date}>{formatDay(upcoming.date)}</time> · {upcoming.count} ta karta
        </> : 'O‘quv seanslari'}</small></span>
      </Link></li>
    </ul>
    <a className="text-link study-plan-calendar-link" href="#study-plan-week">Taqvimni ochish <ArrowRight size={15} aria-hidden="true" /></a>
    {plan.difficultWords.length > 0 && <details className="study-plan-difficult">
      <summary>Qiyin so‘zlar ({plan.difficultWords.length})</summary>
      <ul>{plan.difficultWords.map((word) => <li key={word.wordId}><strong lang="en">{word.text}</strong><span>{word.againCount} marta «Qayta»</span></li>)}</ul>
    </details>}
  </section>;
}

function formatDay(date: string, short = false) {
  const day = new Date(date + 'T12:00:00Z');
  const month = uzbekMonths[day.getUTCMonth()];
  return day.getUTCDate() + '-' + (short ? month.slice(0, 3) : month);
}

function formatWeek(start: string, end: string) {
  return start.slice(0, 7) === end.slice(0, 7)
    ? Number(start.slice(8)) + ' – ' + formatDay(end)
    : formatDay(start) + ' – ' + formatDay(end);
}
