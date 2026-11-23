import { useEffect, useState } from 'react';
import { BookOpen, Flame, Gamepad2, Target } from 'lucide-react';
import { ActivityHeatmap } from '../../learning/components/StatisticsCharts';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { LearningAnalytics, Statistics } from '../../../shared/types/api';

const number = new Intl.NumberFormat('uz-UZ');

export function ProfileActivitySummary({ token, statistics, streak, gamesPlayed }: {
  token: string; statistics?: Statistics; streak?: number; gamesPlayed?: number;
}) {
  const [activity, setActivity] = useState<Pick<LearningAnalytics, 'days' | 'today'>>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void api<LearningAnalytics>('/statistics/analytics', { token, signal: controller.signal })
      .then(({ days, today }) => { if (!controller.signal.aborted) setActivity({ days, today }); })
      .catch((failure) => { if (!controller.signal.aborted) setError(explain(failure)); });
    return () => controller.abort();
  }, [token, attempt]);

  const metrics = [
    { label: 'O‘rganilgan so‘zlar', icon: BookOpen, value: statistics?.learnedWords, tone: 'accent' },
    { label: 'Ketma-ket kunlar', icon: Flame, value: streak, tone: 'amber' },
    { label: 'Aniqlik', icon: Target, value: statistics?.accuracy, suffix: '%', tone: 'green' },
    { label: 'O‘yinlar', icon: Gamepad2, value: gamesPlayed, tone: 'accent' },
  ];

  return <div className="profile-activity-summary">
    <section className="profile-summary-panel" aria-labelledby="profile-statistics-title">
      <h2 id="profile-statistics-title">Statistika</h2>
      <dl className="profile-statistics-grid">
        {metrics.map(({ label, icon: Icon, value, suffix, tone }) => <div className="profile-statistic" key={label}>
          <dt>{label}</dt>
          <dd>
            <span className="profile-statistic-icon" data-tone={tone}><Icon size={17} aria-hidden="true" /></span>
            {value == null ? '—' : number.format(value) + (suffix ?? '')}
          </dd>
        </div>)}
      </dl>
    </section>
    <section className="profile-summary-panel profile-activity-panel" aria-labelledby="profile-activity-title">
      <header>
        <h2 id="profile-activity-title">Faollik</h2>
        <p>So‘nggi 12 hafta</p>
      </header>
      {activity ? <ActivityHeatmap {...activity} /> : error ? <>
        <Notice error>{error}</Notice>
        <button className="button secondary" type="button" onClick={() => { setError(''); setAttempt((value) => value + 1); }}>Qayta urinish</button>
      </> : <p className="profile-activity-loading" role="status">Faollik yuklanmoqda…</p>}
    </section>
  </div>;
}
