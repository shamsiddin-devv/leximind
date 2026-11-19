import { ArrowRight, CalendarDays, Layers3, RotateCcw, Target } from 'lucide-react';
import type { Plan, Profile } from '../../../shared/types/api';
import { uzbekMonths } from '../../../shared/utils/date';
import { describeDailySession } from '../dailySession';
import './StudyPlanPage.css';

const weekdays = ['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

export function StudyPlanPage({ profile, plan, busy, planFailed, onStart }: {
  profile?: Profile; plan?: Plan; busy: boolean; planFailed: boolean; onStart: () => void;
}) {
  const [, detail, action] = describeDailySession(profile, plan);

  return <div className="container screen study-plan-page">
    <header className="study-plan-heading">
      <div>
        <h1 lang="en">Study Plan</h1>
        <p role={!plan && !planFailed ? 'status' : undefined}>
          {planFailed && !plan ? 'O‘quv rejasini yuklab bo‘lmadi.' : detail}
        </p>
      </div>
      <button className="button primary" type="button" disabled={busy || !plan} onClick={onStart}>
        {busy ? 'Yuklanmoqda…' : action}<ArrowRight size={16} aria-hidden="true" />
      </button>
    </header>

    {plan && <>
      <section className="study-plan-metrics" aria-label="Bugungi reja">
        <article className="panel study-plan-card study-plan-metric">
          <div className="study-plan-card-heading">
            <span className="study-plan-icon"><Layers3 size={19} aria-hidden="true" /></span>
            <h2>Takrorlashga tayyor kartalar</h2>
          </div>
          <p className="study-plan-value">{plan.availableNow} <span>karta</span></p>
        </article>

        <article className="panel study-plan-card study-plan-metric">
          <div className="study-plan-card-heading">
            <span className="study-plan-icon"><Target size={19} aria-hidden="true" /></span>
            <h2 id="study-plan-goal-title">Kunlik yangi so‘zlar maqsadi</h2>
          </div>
          <p className="study-plan-value">{plan.dailyNewReviewed} <span>/ {plan.dailyNewLimit} so‘z</span></p>
          <progress className="study-plan-progress" max={plan.dailyNewLimit}
            value={Math.min(plan.dailyNewReviewed, plan.dailyNewLimit)} aria-labelledby="study-plan-goal-title" />
        </article>
      </section>

      <div className="study-plan-grid">
        <WeeklyPlan forecast={plan.forecast} />
        <DifficultWords words={plan.difficultWords} />
      </div>
    </>}
  </div>;
}

function WeeklyPlan({ forecast }: { forecast: Plan['forecast'] }) {
  const total = forecast.reduce((sum, day) => sum + day.count, 0);
  const peak = Math.max(1, ...forecast.map((day) => day.count));

  return <section className="panel study-plan-card study-plan-week" aria-labelledby="study-plan-week-title">
    <header className="study-plan-card-heading">
      <span className="study-plan-icon"><CalendarDays size={19} aria-hidden="true" /></span>
      <div>
        <h2 id="study-plan-week-title">7 kunlik takrorlash</h2>
        <p>Takrorlash vaqti keladigan kartalar</p>
      </div>
      <span className="study-plan-total">{total} karta</span>
    </header>
    <ul className="study-plan-days" aria-label="Kunlar bo‘yicha takrorlash rejasi">
      {forecast.map(({ date, count }, index) => {
        const day = new Date(date + 'T12:00:00Z');
        const month = uzbekMonths[day.getUTCMonth()];
        return <li key={date} aria-current={index === 0 ? 'date' : undefined}>
          <span className="study-plan-day-name">{index === 0 ? 'Bugun' : weekdays[day.getUTCDay()]}</span>
          <time dateTime={date} title={day.getUTCDate() + '-' + month}>{day.getUTCDate()}-{month.slice(0, 3)}</time>
          <span className="study-plan-day-value"><strong>{count}</strong> <span>karta</span></span>
          <span className="study-plan-day-track" aria-hidden="true">
            <span style={{ inlineSize: (100 * count / peak) + '%' }} />
          </span>
        </li>;
      })}
    </ul>
  </section>;
}

function DifficultWords({ words }: { words: Plan['difficultWords'] }) {
  return <section className="panel study-plan-card study-plan-words" aria-labelledby="study-plan-words-title">
    <header className="study-plan-card-heading">
      <span className="study-plan-icon"><RotateCcw size={19} aria-hidden="true" /></span>
      <div>
        <h2 id="study-plan-words-title">Qiyin so‘zlar</h2>
        <p>Oxirgi 30 kunda «Qayta» tanlanganlar</p>
      </div>
    </header>
    {words.length ? <ul className="study-plan-word-list">
      {words.map(({ wordId, text, againCount }) => <li key={wordId}>
        <strong lang="en">{text}</strong><span>{againCount} marta</span>
      </li>)}
    </ul> : <p className="study-plan-empty">Hozircha qiyin so‘zlar yo‘q.</p>}
  </section>;
}
