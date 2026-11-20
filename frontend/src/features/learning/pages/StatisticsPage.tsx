import { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Clock3, LocateFixed, Zap, type LucideIcon } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { LearningAnalytics, LearningSkill } from '../../../shared/types/api';
import { uzbekMonths } from '../../../shared/utils/date';
import { ActivityHeatmap, SkillRadar, StatisticsChart, duration, skillLabels } from '../components/StatisticsCharts';
import './StatisticsPage.css';

const number = new Intl.NumberFormat('uz-UZ');
const shortDate = new Intl.DateTimeFormat('uz-UZ', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const detailSkills: LearningSkill[] = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading'];

function roundChartMaximum(peak: number, minimumStep: number) {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(minimumStep, peak) / 4));
  const step = [1, 2.5, 5, 10].map((value) => value * magnitude).find((value) => value * 4 >= peak);
  return Math.max(minimumStep * 4, (step ?? magnitude * 10) * 4);
}

export function StatisticsPage({ token }: { token: string }) {
  const [data, setData] = useState<LearningAnalytics>();
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void api<LearningAnalytics>('/statistics/analytics', { token, signal: controller.signal })
      .then((analytics) => { if (!controller.signal.aborted) setData(analytics); })
      .catch((failure) => { if (!controller.signal.aborted) setError(explain(failure)); });
    return () => controller.abort();
  }, [token, version]);

  return <div className="container screen statistics-page">
    <header className="stats-heading">
      <div>
        <p className="stats-kicker">Tahlil</p>
        <h1 lang="en">Statistics</h1>
        <p>XP o‘sishi, aniqlik dinamikasi, ko‘nikmalar balansi va kunlik faollik.</p>
      </div>
      {data && <a className="button secondary stats-calendar-link" href="#statistics-activity">
        <CalendarDays size={15} aria-hidden="true" /> Taqvim
      </a>}
    </header>
    {data ? <StatisticsContent data={data} />
      : error ? <div className="stats-load-error"><Notice error>{error}</Notice>
        <button className="button secondary" type="button" onClick={() => { setError(''); setVersion((value) => value + 1); }}>
          Qayta urinish
        </button></div>
      : <p role="status" className="stats-loading">Statistika yuklanmoqda…</p>}
  </div>;
}

function StatisticsContent({ data }: { data: LearningAnalytics }) {
  const { today, weeks, days, months, skills } = data;
  const weeklyXp = weeks.reduce((sum, week) => sum + week.xp, 0);
  const currentWeek = weeks.at(-1), previousWeek = weeks.at(-2);
  const livedDays = days.filter((day) => day.date <= today);
  const dailyAverage = livedDays.reduce((sum, day) => sum + day.studySeconds, 0) / Math.max(1, livedDays.length);
  const weekPoints = weeks.map((week, index) => {
    const start = new Date(week.date + 'T12:00:00Z');
    const end = new Date(start.getTime() + 6 * 86_400_000);
    return { label: index + 1 + '-hafta', detail: shortDate.format(start) + ' – ' + shortDate.format(end), xp: week.xp, accuracy: week.accuracy };
  });
  const accuracies = weeks.flatMap(({ accuracy }) => accuracy === null ? [] : [accuracy]);
  const accuracyFloor = accuracies.length ? Math.max(0, Math.min(60, Math.floor(Math.min(...accuracies) / 20) * 20)) : 60;
  const timePoints = months.map(({ date, studySeconds }) => ({
    label: uzbekMonths[Number(date.slice(5, 7)) - 1], detail: uzbekMonths[Number(date.slice(5, 7)) - 1] + ' ' + date.slice(0, 4),
    value: Math.round(studySeconds / 6) / 10,
  }));

  return <>
    <div className="stats-metrics">
      <Metric label="Jami XP" value={number.format(data.totalXp)} icon={Zap} positive
        detail={'12 haftada +' + number.format(weeklyXp)} />
      <Metric label="Faol so‘zlar" value={number.format(data.activeWords)} icon={BookOpen}
        detail={'Shu hafta +' + number.format(currentWeek?.newWords ?? 0) + ' o‘rganildi'} />
      <Metric label="Aniqlik" value={data.accuracy === null ? '—' : data.accuracy + '%'} icon={LocateFixed}
        detail={'O‘tgan hafta ' + (previousWeek?.accuracy == null ? '—' : previousWeek.accuracy + '%')} />
      <Metric label="O‘rganish vaqti" value={duration(data.studySeconds)} icon={Clock3} positive
        detail={'Kuniga ≈' + number.format(Math.round(dailyAverage / 6) / 10) + ' daqiqa'} />
    </div>

    <section className="stats-panel stats-xp-section" aria-labelledby="stats-xp">
      <h2 id="stats-xp">XP o‘sishi</h2>
      <p className="stats-description">So‘nggi 12 haftada haftalar bo‘yicha to‘plangan tajriba</p>
      <StatisticsChart kind="area" unit=" XP" maximum={roundChartMaximum(Math.max(0, ...weeks.map((week) => week.xp)), 10)}
        points={weekPoints.map(({ label, detail, xp }) => ({ label, detail, value: xp }))} />
    </section>
    <section className="stats-panel stats-radar-section" aria-labelledby="stats-skills">
      <h2 id="stats-skills">Ko‘nikmalar</h2>
      <p className="stats-description">Mashq natijalari bo‘yicha ko‘nikmalar balansi</p>
      <SkillRadar skills={skills} />
    </section>
    <section className="stats-panel stats-accuracy-section" aria-labelledby="stats-accuracy">
      <h2 id="stats-accuracy">Aniqlik dinamikasi</h2>
      <p className="stats-description">Har haftadagi to‘g‘ri javoblar foizi</p>
      <StatisticsChart kind="line" unit="%" minimum={accuracyFloor} maximum={100}
        points={weekPoints.map(({ label, detail, accuracy }) => ({ label, detail, value: accuracy }))} />
    </section>
    <section className="stats-panel" aria-labelledby="stats-by-skill">
      <h2 id="stats-by-skill">Ko‘nikmalar bo‘yicha</h2>
      <p className="stats-description">Har bir yo‘nalishdagi to‘g‘ri javoblar ulushi</p>
      <div className="stats-skill-list">
        {detailSkills.map((skill, index) => {
          const value = skills[skill];
          return <div className="stats-skill" key={skill} data-tone={index % 3}>
            <div><span>{skillLabels[skill]}</span><span>{value === undefined ? '—' : value + '%'}</span></div>
            <progress max={100} value={value ?? 0} aria-label={skillLabels[skill]}
              aria-valuetext={value === undefined ? 'Ma’lumot yo‘q' : value + '%'} />
          </div>;
        })}
      </div>
    </section>
    <section className="stats-panel stats-activity-section" id="statistics-activity" aria-labelledby="stats-activity" tabIndex={-1}>
      <header>
        <div><h2 id="stats-activity">Faollik xaritasi</h2><p className="stats-description">So‘nggi 12 hafta · Har katak bir kun</p></div>
        <div className="stats-legend" aria-hidden="true"><span>Kam</span>
          {[1, 2, 3, 4].map((level) => <i key={level} data-intensity={level} />)}<span>Ko‘p</span>
        </div>
      </header>
      <ActivityHeatmap days={days} today={today} />
    </section>
    <section className="stats-panel stats-month-section" aria-labelledby="stats-month">
      <h2 id="stats-month">Oylik vaqt</h2>
      <p className="stats-description">Oylar bo‘yicha daqiqa</p>
      <StatisticsChart kind="bars" unit=" daqiqa" maximum={roundChartMaximum(Math.max(0, ...timePoints.map((point) => point.value)), 1)}
        points={timePoints} />
    </section>
  </>;
}

function Metric({ label, value, detail, icon: Icon, positive }: {
  label: string; value: string; detail: string; icon: LucideIcon; positive?: boolean;
}) {
  return <div className="stats-panel stats-metric" data-positive={positive}>
    <span className="stats-metric-icon"><Icon size={15} aria-hidden="true" /></span>
    <strong>{value}</strong><h2>{label}</h2><p>{detail}</p>
  </div>;
}
