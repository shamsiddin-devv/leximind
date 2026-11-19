import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChevronDown, Clock3, History, Layers3, Target } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { Page, Plan, Profile, Session, SessionStatus, SessionSummary } from '../../../shared/types/api';
import { uzbekMonths } from '../../../shared/utils/date';
import { describeDailySession } from '../dailySession';
import './LearningSessionsPage.css';

const pageSize = 9;
const statuses = {
  in_progress: 'Davom etmoqda',
  completed: 'Tugallangan',
  cancelled: 'Bekor qilingan',
} satisfies Record<SessionStatus, string>;

const filters = [
  { value: '', label: 'Barchasi' },
  { value: 'in_progress', label: 'Faol' },
  { value: 'completed', label: statuses.completed },
  { value: 'cancelled', label: statuses.cancelled },
] as const;

type Filter = (typeof filters)[number]['value'];
type RequestResult = { key: string; data: Page<SessionSummary> } | { key: string; error: string };

export function LearningSessionsPage({ token, profile, plan, busy, planFailed, onStart }: {
  token: string; profile?: Profile; plan?: Plan; busy: boolean; planFailed: boolean; onStart: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('');
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<RequestResult>();
  const query = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (filter) query.set('status', filter);
  const endpoint = '/sessions?' + query;
  const requestKey = endpoint + ':' + retry;
  const current = result?.key === requestKey ? result : undefined;
  const history = current && 'data' in current ? current.data : undefined;
  const error = current && 'error' in current ? current.error : undefined;
  const totalPages = Math.max(1, Math.ceil((history?.total ?? 0) / pageSize));
  const [, detail, action] = describeDailySession(profile, plan);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: profile?.timezone,
  });

  useEffect(() => {
    const controller = new AbortController();
    void api<Page<SessionSummary>>(endpoint, { token, signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setResult({ key: requestKey, data });
    }).catch((failure) => {
      if (!controller.signal.aborted) setResult({ key: requestKey, error: explain(failure) });
    });
    return () => controller.abort();
  }, [endpoint, requestKey, token]);

  function selectFilter(value: Filter) {
    setFilter(value);
    setPage(1);
  }

  return <div className="container screen learning-sessions-page">
    <header className="learning-sessions-heading">
      <div>
        <h1 lang="en">Learning Sessions</h1>
        <p>{planFailed && !plan ? 'Bugungi mashq rejasini yuklab bo‘lmadi.' : detail}</p>
      </div>
      <button className="button primary" type="button" disabled={busy || !plan} onClick={onStart}>
        {busy ? 'Yuklanmoqda…' : action}<ArrowRight size={16} aria-hidden="true" />
      </button>
    </header>
    {plan && <dl className="learning-sessions-metrics" aria-label="Bugungi mashq">
      <div><dt><Layers3 size={16} aria-hidden="true" /> Tayyor kartalar</dt><dd>{plan.availableNow}</dd></div>
      <div><dt><Target size={16} aria-hidden="true" /> Kunlik yangi so‘zlar</dt><dd>{plan.dailyNewReviewed} <span>/ {plan.dailyNewLimit}</span></dd></div>
    </dl>}

    <section className="learning-sessions-history" aria-labelledby="learning-history-title">
      <div className="learning-history-toolbar">
        <h2 id="learning-history-title">Seanslar tarixi</h2>
        <div className="learning-history-filters" role="group" aria-label="Seans holati">
          {filters.map(({ value, label }) => <button type="button" key={value} aria-pressed={filter === value}
            onClick={() => selectFilter(value)}>{label}</button>)}
        </div>
      </div>

      {error ? <div className="learning-history-empty">
        <Notice error>{error}</Notice>
        <button className="button secondary" type="button" onClick={() => setRetry((count) => count + 1)}>Qayta urinish</button>
      </div> : !history ? <div className="learning-history-empty" role="status">Seanslar yuklanmoqda…</div>
        : history.data.length ? <div className="learning-history-grid">
          {history.data.map((session) => <SessionCard key={session.id} session={session} token={token} formatter={formatter} />)}
        </div> : <div className="learning-history-empty">
          <History size={23} aria-hidden="true" />
          <h3>{filter ? 'Bu holatda seanslar yo‘q' : 'Hali seanslar yo‘q'}</h3>
          <p>{filter ? 'Boshqa holatni tanlab ko‘ring.' : 'Birinchi mashqni boshlaganingizdan so‘ng seans shu yerda ko‘rinadi.'}</p>
          {filter && <button className="button secondary" type="button" onClick={() => selectFilter('')}>Barcha seanslar</button>}
          {!filter && page > 1 && <button className="button secondary" type="button" onClick={() => setPage(1)}>Birinchi sahifaga</button>}
        </div>}

      {history && (totalPages > 1 || page > 1) && <nav className="learning-history-pagination" aria-label="Seanslar tarixi sahifalari">
        <button className="button secondary" type="button" disabled={page <= 1} onClick={() => setPage((currentPage) => currentPage - 1)}>
          <ArrowLeft size={16} aria-hidden="true" />Oldingi
        </button>
        <span role="status">{page} / {totalPages}</span>
        <button className="button secondary" type="button" disabled={page >= totalPages} onClick={() => setPage((currentPage) => currentPage + 1)}>
          Keyingi<ArrowRight size={16} aria-hidden="true" />
        </button>
      </nav>}
    </section>
  </div>;
}

function SessionCard({ session, token, formatter }: {
  session: SessionSummary; token: string; formatter: Intl.DateTimeFormat;
}) {
  const [expanded, setExpanded] = useState(false);
  const minutes = session.endedAt ? Math.floor(Math.max(0, Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 60_000) : null;
  const dateParts = formatter.formatToParts(new Date(session.startedAt));
  const part = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((item) => item.type === type)?.value;
  const month = uzbekMonths[Number(part('month')) - 1];
  const dateLabel = `${part('day')}-${month} ${part('year')}, ${part('hour')}:${part('minute')}`;
  return <article className="learning-session-card">
    <header className="learning-session-card-heading">
      <span className="learning-session-card-icon"><BookOpen size={18} aria-hidden="true" /></span>
      <span className="learning-session-status" data-status={session.status}>{statuses[session.status]}</span>
      <h3>Kartalarni takrorlash</h3>
    </header>
    <dl className="learning-session-card-meta">
      <div>
        <dt><CalendarDays size={15} aria-hidden="true" /> Sana</dt>
        <dd><time dateTime={session.startedAt}>{dateLabel}</time></dd>
      </div>
      <div>
        <dt><Clock3 size={15} aria-hidden="true" /> Davomiyligi</dt>
        <dd>{minutes === null ? '—' : minutes === 0 ? '1 daqiqadan kam' : minutes + ' daqiqa'}</dd>
      </div>
    </dl>
    <details className="learning-session-details" onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary aria-label={'Batafsil · ' + dateLabel}>Batafsil <ChevronDown size={16} aria-hidden="true" /></summary>
      {expanded && <SessionDetails id={session.id} token={token} />}
    </details>
  </article>;
}

function SessionDetails({ id, token }: { id: string; token: string }) {
  const [session, setSession] = useState<Session>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void api<Session>('/sessions/' + id, { token, signal: controller.signal }).then((value) => {
      if (!controller.signal.aborted) setSession(value);
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(explain(failure));
    });
    return () => controller.abort();
  }, [id, token, retry]);

  if (error) return <div className="learning-session-detail-body"><Notice error>{error}</Notice>
    <button className="button secondary" type="button" onClick={() => { setError(''); setRetry((count) => count + 1); }}>Qayta urinish</button>
  </div>;
  if (!session) return <p className="learning-session-detail-body" role="status">Tafsilotlar yuklanmoqda…</p>;

  const completed = session.tasks.filter((task) => task.completed);
  return <div className="learning-session-detail-body">
    <p><strong>{completed.length} / {session.tasks.length}</strong> karta takrorlangan</p>
    {completed.length > 0 && <ul aria-label="Takrorlangan so‘zlar">
      {completed.map((task) => <li key={task.id}><span lang="en">{task.text}</span><span>{task.translationUz}</span></li>)}
    </ul>}
  </div>;
}
