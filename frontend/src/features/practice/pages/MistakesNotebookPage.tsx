import { useEffect, useState } from 'react';
import { Check, CirclePlay, Filter, Lightbulb, NotebookPen, Repeat2, Undo2 } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import { uzbekMonths } from '../../../shared/utils/date';
import { activities } from '../activities';
import { MistakeRetryDialog } from '../components/MistakeRetryDialog';
import { categoryLabel, loadNotebook, mistakeCategories, mistakeTip, type MistakeCategory,
  type MistakeEntry, type MistakeSummary, type NotebookResponse } from '../notebook';
import './MistakesNotebookPage.css';

const pageSize = 12;
const number = new Intl.NumberFormat('uz-UZ');
type Lookup = { key: string; response?: NotebookResponse; error?: string };

export function MistakesNotebookPage({ token }: { token: string }) {
  const [category, setCategory] = useState<MistakeCategory | ''>('');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [lookup, setLookup] = useState<Lookup>();
  const [selected, setSelected] = useState<MistakeEntry>();
  const [pending, setPending] = useState<string>();
  const [feedback, setFeedback] = useState('');
  const key = JSON.stringify([category, onlyOpen, page]);
  const current = lookup?.key === key ? lookup : undefined;
  const summary = lookup?.response?.summary ?? [];

  useEffect(() => {
    const controller = new AbortController();
    void loadNotebook(token, page, pageSize, category, onlyOpen, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      const lastPage = Math.max(1, Math.ceil(response.total / pageSize));
      if (page > lastPage) setPage(lastPage);
      else setLookup({ key, response });
    }).catch((failure) => {
      if (!controller.signal.aborted) setLookup({ key, error: explain(failure) });
    });
    return () => controller.abort();
  }, [token, page, category, onlyOpen, key, revision]);

  const count = summary.reduce((total, item) => total + item.total, 0);
  const resolved = summary.reduce((total, item) => total + item.resolved, 0);
  const pageCount = Math.max(1, Math.ceil((current?.response?.total ?? 0) / pageSize));
  const entries = current?.response?.data ?? [];
  const refresh = () => setRevision((value) => value + 1);

  function selectCategory(next: MistakeCategory | '') {
    setCategory(next);
    setPage(1);
  }

  async function resolve(entry: MistakeEntry) {
    if (pending) return;
    setPending(entry.id);
    setFeedback('');
    try {
      await api('/mistakes-notebook/' + entry.id, { token, method: 'PATCH', body: { resolved: !entry.resolvedAt } });
      refresh();
    } catch (failure) {
      setFeedback(explain(failure));
    } finally {
      setPending(undefined);
    }
  }

  async function startPractice() {
    if (pending || count === resolved) return;
    const available = entries.find((entry) => !entry.resolvedAt);
    if (available) { setSelected(available); return; }
    setPending('practice');
    setFeedback('');
    try {
      const result = await api<NotebookResponse>('/mistakes-notebook?onlyOpen=true&limit=1', { token });
      if (result.data[0]) setSelected(result.data[0]);
      else refresh();
    } catch (failure) {
      setFeedback(explain(failure));
    } finally {
      setPending(undefined);
    }
  }

  return <div className="container screen mistakes-page">
    <header className="mistakes-heading">
      <div>
        <p className="mistakes-kicker">Xatolar</p>
        <h1 lang="en">Mistakes Notebook</h1>
        <p>Har bir xato — keyingi yaxshilanish imkoniyati. Xatolarni tahlil qiling va bilimingizni mustahkamlang.</p>
      </div>
      <button type="button" className="mistake-button" data-variant="primary" disabled={count === resolved || Boolean(pending)}
        onClick={() => void startPractice()}><CirclePlay size={16} aria-hidden="true" /> Mashq qilish</button>
    </header>

    <NotebookOverview summary={summary} count={count} resolved={resolved} />
    <div className="mistakes-toolbar">
      <div className="mistakes-filters" role="group" aria-label="Xato toifasi">
        <button type="button" aria-pressed={!category} onClick={() => selectCategory('')}>Barchasi <span>{number.format(count)}</span></button>
        {mistakeCategories.map(({ id, label }) => <button type="button" key={id} aria-pressed={category === id} onClick={() => selectCategory(id)}>
          {label} <span>{number.format(summary.find((item) => item.category === id)?.total ?? 0)}</span>
        </button>)}
      </div>
      <button type="button" className="mistake-button mistakes-open-toggle" data-variant="outline" aria-pressed={onlyOpen} onClick={() => {
        setOnlyOpen((value) => !value);
        setPage(1);
      }}><Filter size={14} aria-hidden="true" /> Faqat ochiq xatolar</button>
    </div>

    {feedback && <Notice error>{feedback}</Notice>}
    {current?.error && <div className="mistakes-error">
      <Notice error>{current.error}</Notice>
      <button type="button" className="mistake-button" data-variant="outline" onClick={refresh}>Qayta urinish</button>
    </div>}
    <section className="mistakes-list" aria-label="Xatolar ro‘yxati" aria-busy={!current}>
      {!current && <p role="status" className="mistakes-muted">Xatolar yuklanmoqda…</p>}
      {entries.map((entry) => <MistakeCard key={entry.id} entry={entry} disabled={Boolean(pending)}
        onResolve={() => void resolve(entry)} onRetry={() => setSelected(entry)} />)}
      {current?.response && !entries.length && <div className="mistakes-empty">
        <NotebookPen size={24} aria-hidden="true" />
        <strong>{count ? 'Bu filtr bo‘yicha xato topilmadi.' : 'Daftaringizda hali xato yo‘q.'}</strong>
        {count ? <button type="button" className="mistake-button" data-variant="outline" onClick={() => {
          selectCategory(''); setOnlyOpen(false);
        }}>Filtrlarni tozalash</button> : <Link className="text-link" href={routes.games}>Mashqlarni ochish</Link>}
      </div>}
    </section>
    {pageCount > 1 && <nav className="mistake-pagination" aria-label="Xatolar sahifalari">
      <button type="button" className="mistake-button" data-variant="outline" disabled={page < 2} onClick={() => setPage(page - 1)}>Oldingi</button>
      <span>{page} / {pageCount}</span>
      <button type="button" className="mistake-button" data-variant="outline" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Keyingi</button>
    </nav>}
    {selected && <MistakeRetryDialog entry={selected} token={token} onClose={() => setSelected(undefined)} onResolved={refresh} />}
  </div>;
}

function NotebookOverview({ summary, count, resolved }: { summary: MistakeSummary[]; count: number; resolved: number }) {
  const percent = count ? Math.round(resolved / count * 100) : 0;
  const largest = summary.reduce<MistakeSummary | undefined>((max, item) =>
    item.total > (max?.total ?? 0) ? item : max, undefined);
  return <div className="mistakes-overview">
    <section className="mistakes-panel mistakes-overall" aria-label="Xatolarning umumiy holati">
      <div className="mistakes-ring" role="progressbar" aria-label="Hal qilingan xatolar ulushi"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="mistakes-ring-track" cx="50" cy="50" r="46" />
          {percent > 0 && <circle className="mistakes-ring-value" cx="50" cy="50" r="46" pathLength="100" strokeDasharray={percent + ' 100'} />}
        </svg>
        <div aria-hidden="true"><strong>{percent}%</strong><span>Hal qilindi</span></div>
      </div>
      <div><p className="mistakes-kicker">Umumiy holat</p>
        <h2>{number.format(resolved)} / {number.format(count)} xato</h2>
        <p className="mistakes-muted">{number.format(count - resolved)} ta xato ustida ishlash kerak.</p></div>
    </section>
    <section className="mistakes-panel mistakes-analysis" aria-labelledby="mistake-analysis-title">
      <h2 id="mistake-analysis-title">Tahlil</h2>
      <p className="mistakes-muted">Xatolar turlari bo‘yicha taqsimot</p>
      <dl>
        {mistakeCategories.map(({ id, label }) => <div key={id}>
          <dt>{label}</dt><dd>{number.format(summary.find((item) => item.category === id)?.total ?? 0)}</dd>
        </div>)}
      </dl>
      {largest && <p className="mistakes-analysis-insight">Eng ko‘p xato <strong>{categoryLabel(largest.category)}</strong> bo‘yicha qayd etilgan.</p>}
    </section>
  </div>;
}

function MistakeCard({ entry, disabled, onResolve, onRetry }: {
  entry: MistakeEntry; disabled: boolean; onResolve: () => void; onRetry: () => void;
}) {
  const activity = activities.find(({ id }) => id === entry.kind);
  const date = new Date(entry.occurredAt);
  const { question } = entry;
  return <article className="mistake-card" data-category={entry.category}>
    <div className="mistake-card-content">
      <div className="mistake-meta">
        <span className="mistake-tag category">{categoryLabel(entry.category)}</span>
        {activity && <span className="mistake-tag">{activity.title}</span>}
        <time dateTime={entry.occurredAt}>{date.getDate()}-{uzbekMonths[date.getMonth()]}</time>
        {entry.resolvedAt && <span className="mistake-resolved"><Check size={12} aria-hidden="true" /> Hal qilindi</span>}
      </div>
      <h2>{question.prompt}</h2>
      {question.input === 'tokens' && <p className="mistake-token-list">{question.options.join(' · ')}</p>}
      <dl className="mistake-answers">
        <div><dt>Sizning javobingiz</dt><dd>{entry.submittedAnswer ? <del>{entry.submittedAnswer}</del>
          : entry.reason === 'skipped' ? 'Javob berilmagan' : 'Javob saqlanmagan'}</dd></div>
        <div><dt>To‘g‘ri javob</dt><dd>{entry.expectedAnswer}</dd></div>
      </dl>
      <p className="mistake-tip"><Lightbulb size={14} aria-hidden="true" />{mistakeTip(entry)}</p>
    </div>
    <div className="mistake-card-actions">
      <button type="button" className="mistake-button" data-variant={entry.resolvedAt ? 'outline' : 'primary'} disabled={disabled} onClick={onResolve}>
        {entry.resolvedAt ? <><Undo2 size={14} aria-hidden="true" /> Qaytarish</> : <><Check size={14} aria-hidden="true" /> Hal qildim</>}
      </button>
      <button type="button" className="mistake-button" data-variant="quiet" onClick={onRetry}>
        <Repeat2 size={14} aria-hidden="true" /> Takrorlash
      </button>
    </div>
  </article>;
}
