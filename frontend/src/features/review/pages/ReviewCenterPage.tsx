import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, CheckCheck, Eye, Folder, History, RotateCcw, Settings, Sparkles, Sprout } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Notice, Speak } from '../../../shared/components/UI';
import { api, ApiError, explain } from '../../../shared/services/api';
import type { Rating, ReviewCenterData, ReviewQueue, Session, Statistics } from '../../../shared/types/api';
import './ReviewCenterPage.css';

const queues: { id: ReviewQueue; label: string }[] = [
  { id: 'today', label: 'Bugun' }, { id: 'new', label: 'Yangi' }, { id: 'learning', label: 'O‘rganilmoqda' },
];
const topicNames: Record<string, string> = {
  travel: 'Sayohat', work: 'Ish', food: 'Ovqat', home: 'Uy', education: 'Ta’lim',
  technology: 'Texnologiya', culture: 'Madaniyat', environment: 'Atrof-muhit',
  personality: 'Shaxsiyat', health: 'Sog‘liq', transport: 'Transport', general: 'Umumiy',
};
const count = new Intl.NumberFormat('uz-UZ');
const batchSize = 5;

function topicTitle(topic: string | null) {
  if (!topic) return 'Umumiy';
  if (Object.hasOwn(topicNames, topic)) return topicNames[topic];
  const words = topic.replaceAll('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function intervalText(minutes?: number | null) {
  if (minutes == null) return '—';
  if (minutes < 1) return '1 daq.dan kam';
  if (minutes < 60) return Math.floor(minutes) + ' daqiqa';
  return minutes < 1440 ? Math.floor(minutes / 60) + ' soat' : Math.floor(minutes / 1440) + ' kun';
}

export function ReviewCenterPage({ token, statistics, autoplayPronunciation, onReview }: {
  token: string; statistics?: Statistics; autoplayPronunciation?: boolean; onReview: () => void;
}) {
  const [data, setData] = useState<ReviewCenterData>();
  const [queue, setQueue] = useState<ReviewQueue>('today');
  const [revealedTask, setRevealedTask] = useState<string>();
  const [interval, setInterval] = useState<{ taskId: string; minutes: number }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const request = useRef<AbortController>(null);
  const submitting = useRef(false);
  const revealedAt = useRef(0);
  const session = data?.session;
  const task = session?.tasks.find((item) => !item.completed);
  const sessionId = session?.id;
  const taskId = task?.id;
  const revealed = Boolean(taskId && revealedTask === taskId);
  const preview = !session && !finished ? data?.queues[queue].first : null;
  const prompt = task ?? preview;
  const total = session ? session.tasks.length : Math.min(batchSize, data?.queues[queue].count ?? 0);
  const position = session ? Math.min(total, session.tasks.filter((item) => item.completed).length + 1) : Number(total > 0);
  const progress = total ? Math.round(position / total * 100) : 0;

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    void api<ReviewCenterData>('/review-center', { token, signal: controller.signal }).then((value) => {
      if (!controller.signal.aborted) { setData(value); setError(''); }
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(explain(failure));
    });
    return () => {
      controller.abort();
      submitting.current = false;
    };
  }, [token, loadVersion]);

  useEffect(() => {
    if (!sessionId || !taskId) return;
    const controller = new AbortController();
    void api<{ calculatedAt: string; options: { rating: Rating; due: string }[] }>(
      `/sessions/${sessionId}/tasks/${taskId}/review-preview`, { token, signal: controller.signal },
    ).then(({ calculatedAt, options }) => {
      const good = options.find((option) => option.rating === 'GOOD');
      if (good && !controller.signal.aborted) {
        setInterval({ taskId, minutes: (Date.parse(good.due) - Date.parse(calculatedAt)) / 60_000 });
      }
    }).catch(() => {
      // The summary still shows the next date already scheduled in the queue.
    });
    return () => controller.abort();
  }, [token, sessionId, taskId]);

  async function run(action: (signal: AbortSignal) => Promise<void>) {
    const signal = request.current?.signal;
    if (submitting.current || !signal || signal.aborted) return;
    submitting.current = true;
    setBusy(true); setError('');
    try { await action(signal); }
    catch (failure) {
      if (!signal.aborted) setError(explain(failure, { 409: 'Navbat o‘zgargan. Yangilab, qayta urinib ko‘ring.' }));
    } finally {
      if (!signal.aborted) { submitting.current = false; setBusy(false); }
    }
  }

  function showAnswer(id: string) {
    revealedAt.current = Date.now();
    setRevealedTask(id);
  }

  function reveal() {
    if (task) { showAnswer(task.id); return; }
    void run(async (signal) => {
      const session = await api<Session>('/sessions', { token, signal, method: 'POST', body: { limit: batchSize, queue } });
      if (signal.aborted) return;
      setData((current) => current && { ...current, session });
      onReview();
      const first = session.tasks.find((item) => !item.completed);
      // A session from another tab may have a different first card.
      if (first && first.text === preview?.text && first.cefrLevel === preview.cefrLevel) showAnswer(first.id);
    });
  }

  async function refreshOverview(signal: AbortSignal) {
    const updated = await api<ReviewCenterData>('/review-center', { token, signal });
    if (!signal.aborted) setData(updated);
  }

  function rate(rating: Rating) {
    if (!session || !task || !revealed) return;
    void run(async (signal) => {
      const path = '/sessions/' + session.id;
      try {
        await api(`${path}/tasks/${task.id}/review`, { token, signal, method: 'POST', body: {
          rating, responseMs: Math.max(0, Math.min(3_600_000, Date.now() - revealedAt.current)),
        } });
      } catch (failure) {
        if (signal.aborted || failure instanceof ApiError && failure.status === 401) throw failure;
        const latest = await api<Session>(path, { token, signal });
        if (latest.status !== 'in_progress') {
          await refreshOverview(signal);
          return;
        }
        if (!latest.tasks.some((item) => item.id === task.id && item.completed)) throw failure;
      }
      if (signal.aborted) return;
      setData((current) => current && current.session?.id === session.id ? {
        ...current, session: { ...session, tasks: session.tasks.map((item) => item.id === task.id ? { ...item, completed: true } : item) },
      } : current);
      setRevealedTask(undefined);
      onReview();
      await refreshOverview(signal);
    });
  }

  function complete() {
    if (!session || task) return;
    void run(async (signal) => {
      await api(`/sessions/${session.id}/complete`, { token, signal, method: 'POST' });
      if (signal.aborted) return;
      setData((current) => current && { ...current, session: null });
      setFinished(true); setQueue('today');
      onReview();
      await refreshOverview(signal);
    });
  }

  const accuracy = statistics?.accuracy;
  const scheduledMinutes = data?.nextDueAt ? Math.max(0, (Date.parse(data.nextDueAt) - Date.now()) / 60_000) : null;
  const nextInterval = interval && interval.taskId === taskId ? interval.minutes : scheduledMinutes;
  const masteredShare = data?.activeCards ? Math.round(data.masteredCards / data.activeCards * 100) : null;

  return <div className="container screen review-center-page">
    <header className="review-center-heading">
      <div>
        <p className="review-center-kicker">Takrorlash</p>
        <h1 lang="en">Review Center</h1>
        <p>Takrorlash navbati, oraliq intervallari va mavzular bo‘yicha yuklama.</p>
      </div>
      <Link href={routes.settingsLearning} className="button secondary review-center-settings"><Settings size={15} aria-hidden="true" /> Usulni tanlash</Link>
    </header>
    {error && <div className="review-center-error"><Notice error>{error}</Notice>
      <button type="button" className="button secondary" disabled={busy} onClick={() => setLoadVersion((value) => value + 1)}>Yangilash</button>
    </div>}
    {!data && !error && <p className="review-center-loading" role="status">Takrorlash ma’lumotlari yuklanmoqda…</p>}
    {data && <>
      <div className="review-center-metrics">
        <SummaryCard label="Bugun takrorlash" detail="Navbatda turgan so‘zlar" value={data.queues.today.count} icon={History} highlight />
        <SummaryCard label="Yangi so‘zlar" detail="Hali ko‘rilmagan" value={data.newCards} icon={Sparkles} />
        <SummaryCard label="O‘rganilmoqda" detail="Mustahkamlash bosqichi" value={data.learningCards} icon={Sprout} />
        <SummaryCard label="O‘zlashtirilgan" detail="Takrorlash bosqichidagi so‘zlar" value={data.masteredCards} icon={CheckCheck} />
      </div>
      <div className="review-center-grid">
        <section className="review-center-card review-center-session" aria-labelledby="review-center-session">
          <div className="review-center-session-header">
            <div><p className="review-center-kicker">Sessiya</p><h2 id="review-center-session">Kartochkalar</h2></div>
            <fieldset className="review-center-queues" aria-label="Kartochkalar navbati" disabled={busy || Boolean(session)}>
              {queues.map(({ id, label }) => <label key={id}>
                <input type="radio" name="review-center-queue" checked={queue === id}
                  onChange={() => { setQueue(id); setFinished(false); }} />
                <span>{label} <small>{count.format(data.queues[id].count)}</small></span>
              </label>)}
            </fieldset>
          </div>
          <div className="review-center-session-progress">
            <div><span>{position} / {total}</span><span>{progress}%</span></div>
            <progress aria-label="Takrorlash jarayoni" max={Math.max(1, total)} value={position} />
          </div>
          <div className="review-center-flashcard" aria-live="polite">
            {prompt ? <>
              <div className="review-center-tags">
                <span><Folder size={12} aria-hidden="true" /> {topicTitle(prompt.topic)}</span>
                <span>CEFR {prompt.cefrLevel}</span>
              </div>
              <h3 lang="en">{prompt.text}</h3>
              {revealed && task
                ? <div className="review-center-answer"><strong>{task.translationUz}</strong>
                  <p lang="en">{task.definition}</p>
                  <Speak key={task.id} text={task.text} url={task.audioUrl} autoplay={autoplayPronunciation} />
                </div>
                : <button type="button" className="button quiet review-center-reveal" onClick={reveal} disabled={busy}>
                  <Eye size={15} aria-hidden="true" /> {busy ? 'Ochilmoqda…' : 'Tarjimani ko‘rsatish'}
                </button>}
            </> : <div className="review-center-empty">
              {session ? <>
                <Check size={26} aria-hidden="true" /><h3>Kartochkalar takrorlandi</h3>
                <button className="button primary" type="button" onClick={complete} disabled={busy}>Sessiyani yakunlash</button>
              </> : finished ? <>
                <Check size={26} aria-hidden="true" /><h3>Sessiya yakunlandi</h3>
                <button className="button secondary" type="button" onClick={() => setFinished(false)}>Navbatga qaytish</button>
              </> : <>
                <History size={26} aria-hidden="true" /><h3>Bu navbatda tayyor kartochka yo‘q</h3>
                <Link className="text-link" href={routes.vocabulary}>Lug‘atni ochish <ArrowUpRight size={15} aria-hidden="true" /></Link>
              </>}
            </div>}
          </div>
          <div className="review-center-rating">
            <button type="button" className="button review-center-know" disabled={!revealed || busy} onClick={() => rate('GOOD')}>
              <Check size={15} aria-hidden="true" /> Bilaman
            </button>
            <button type="button" className="button secondary" disabled={!revealed || busy} onClick={() => rate('AGAIN')}>
              <RotateCcw size={15} aria-hidden="true" /> Qayta ko‘raman
            </button>
          </div>
          <p className="review-center-rating-note">{revealed ? 'Javobingizga mos bahoni tanlang.' : 'Javobni ko‘rgach baholashingiz mumkin.'}</p>
        </section>
        <div className="review-center-side">
          <section className="review-center-card" aria-labelledby="review-center-quality">
            <h2 id="review-center-quality">Takrorlash sifati</h2>
            <p className="review-center-subtitle">Intervalli takrorlash holati</p>
            <div className="review-center-quality">
              <QualityBar label="O‘rtacha aniqlik" value={accuracy ?? 0} max={100} text={accuracy == null ? '—' : accuracy + '%'} />
              <QualityBar label="Bugungi yuklama" value={data.queues.today.count} max={data.activeCards}
                text={count.format(data.queues.today.count) + ' so‘z'} tone="positive" />
              <QualityBar label="O‘zlashtirilgan ulushi" value={masteredShare ?? 0} max={100}
                text={masteredShare == null ? '—' : masteredShare + '%'} tone="muted" />
            </div>
            <div className="review-center-interval">
              <div><span>Keyingi interval</span><strong>{intervalText(nextInterval)}</strong></div>
              <p>Eng uzun interval · {intervalText(data.longestIntervalMinutes)}</p>
            </div>
          </section>
          <section className="review-center-card" aria-labelledby="review-center-topics">
            <h2 id="review-center-topics">Mavzular bo‘yicha</h2>
            <p className="review-center-subtitle">Takrorlash navbati taqsimoti</p>
            {data.topics.length ? <ul className="review-center-topics">
              {data.topics.map(({ topic, due, total }) => <li key={topic ?? ''}>
                <span className="review-center-folder"><Folder size={15} aria-hidden="true" /></span>
                <div><strong>{topicTitle(topic)}</strong><span>{count.format(total)} so‘z</span></div>
                <span className="review-center-topic-count">{count.format(due)} navbat</span>
              </li>)}
            </ul> : <p className="review-center-subtitle">Lug‘atdan karta qo‘shilganda mavzular shu yerda ko‘rinadi.</p>}
          </section>
        </div>
      </div>
    </>}
  </div>;
}

function SummaryCard({ label, detail, value, icon: Icon, highlight }: {
  label: string; detail: string; value: number; icon: typeof History; highlight?: boolean;
}) {
  return <div className="review-center-card review-center-summary-card" data-highlight={highlight}>
    <span className="review-center-summary-icon"><Icon size={15} aria-hidden="true" /></span>
    {highlight && <a className="review-center-jump" href="#review-center-session" aria-label="Kartochkalarga o‘tish"><ArrowUpRight size={15} aria-hidden="true" /></a>}
    <strong>{count.format(value)}</strong>
    <h2>{label}</h2>
    <p>{detail}</p>
  </div>;
}

function QualityBar({ label, value, max, text, tone }: { label: string; value: number; max: number; text: string; tone?: string }) {
  return <div className="review-center-quality-bar" data-tone={tone}>
    <div><span>{label}</span><span>{text}</span></div>
    <progress aria-label={label} aria-valuetext={text === '—' ? 'Hozircha ma’lumot yo‘q' : text} value={value} max={Math.max(1, max)} />
  </div>;
}
