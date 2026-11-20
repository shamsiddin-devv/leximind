import { useEffect, useState } from 'react';
import { Play, Search } from 'lucide-react';
import { Link, navigate, routes, useRoute } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { TopicProgress } from '../../../shared/types/api';
import { featuredTopics, topicCategories, topicDefinition, type TopicDefinition } from '../topics';
import { vocabularyHref, wordSearchLength } from '../wordSearch';
import './TopicsExplorerPage.css';

const filters = [{ id: '', label: 'Barchasi' }, ...topicCategories] as const;
type Filter = (typeof filters)[number]['id'];
const number = new Intl.NumberFormat('uz-UZ');
const categoryLabels = new Map(topicCategories.map(({ id, label }) => [id, label]));
const featuredIds = new Set(featuredTopics.map(({ id }) => id));

function searchKey(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/['’‘ʻʼ`]/gu, '').trim();
}

function topicsHref(query: string, filter: Filter) {
  const params = new URLSearchParams();
  if (query) params.set('search', query);
  if (filter) params.set('category', filter);
  return routes.topics + (params.size ? '?' + params : '');
}

export function TopicsExplorerPage({ token, busy, onStart }: { token: string; busy: boolean; onStart: (topic: string) => void }) {
  const { searchParams } = useRoute();
  const [progress, setProgress] = useState<TopicProgress[]>();
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const query = searchParams.get('search')?.slice(0, wordSearchLength) ?? '';
  const filter = filters.find(({ id }) => id === searchParams.get('category'))?.id ?? '';
  const term = searchKey(query);
  const progressById = new Map(progress?.map((item) => [item.topic, item]));
  const topics = [...featuredTopics, ...(progress ?? []).filter(({ topic }) => !featuredIds.has(topic)).map(({ topic }) => topicDefinition(topic))];
  const shown = topics.filter((topic) => (!filter || topic.category === filter) &&
    searchKey([topic.title, topic.description, categoryLabels.get(topic.category), topic.id.replaceAll('-', ' ')].join(' ')).includes(term));
  const words = progress?.reduce((sum, item) => sum + item.total, 0);

  useEffect(() => {
    const controller = new AbortController();
    void api<TopicProgress[]>('/topics', { token, signal: controller.signal }).then((items) => {
      if (!controller.signal.aborted) setProgress(items);
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(explain(failure));
    });
    return () => controller.abort();
  }, [token, version]);

  return <div className="container screen topics-page">
    <header className="topics-heading">
      <p className="topics-kicker">Mavzular</p>
      <h1 lang="en">Topics Explorer</h1>
      <p>Qiziqishingizga mos mavzuni tanlang va lug‘atingizni yo‘naltirilgan tarzda kengaytiring.</p>
    </header>
    <div className="topics-toolbar">
      <label className="topics-search">
        <Search size={15} aria-hidden="true" />
        <input type="search" aria-label="Mavzuni qidirish" placeholder="Mavzuni qidirish..."
          maxLength={wordSearchLength} value={query} onChange={(event) => navigate(topicsHref(event.currentTarget.value, filter), true)} />
      </label>
      <div className="topics-filters" role="group" aria-label="Mavzu toifasi">
        {filters.map(({ id, label }) => <button type="button" key={id} aria-pressed={filter === id}
          onClick={() => navigate(topicsHref(query, id), true)}>{label}</button>)}
      </div>
    </div>
    {error && <div className="topics-error"><Notice error>{error}</Notice>
      <button type="button" className="button secondary" onClick={() => { setError(''); setVersion((value) => value + 1); }}>Qayta urinish</button>
    </div>}
    {!error && !progress && <p className="topics-loading" role="status">Mavzular yuklanmoqda…</p>}
    {progress && <>
      <div className="topics-summary">
        <p role="status"><strong>{number.format(shown.length)}</strong> ta mavzu topildi</p>
        <p>{number.format(topics.length)} mavzu · {number.format(words ?? 0)} so‘z</p>
      </div>
      {shown.length ? <div className="topics-grid">{shown.map((topic) => <TopicCard key={topic.id}
        topic={topic} progress={progressById.get(topic.id)} busy={busy} onStart={onStart} />)}</div>
        : <p className="topics-empty">Mos mavzu topilmadi.</p>}
    </>}
  </div>;
}

function TopicCard({ topic, progress, busy, onStart }: {
  topic: TopicDefinition; progress?: TopicProgress; busy: boolean; onStart: (topic: string) => void;
}) {
  const Icon = topic.icon;
  const level = topic.suggestedLevel ?? progress?.cefrLevel;
  const total = progress?.total ?? 0;
  const learned = progress?.learned ?? 0;
  const percent = total ? Math.round(learned / total * 100) : 0;
  return <article className="topics-card" data-tone={topic.tone} aria-labelledby={'topic-' + topic.id}>
    <header className="topics-card-heading">
      <span className="topics-card-icon"><Icon size={20} aria-hidden="true" /></span>
      {level && <span className="topics-card-level" title={topic.suggestedLevel ? 'Tavsiya etilgan daraja' : 'Mavzuda eng ko‘p uchraydigan daraja'}>CEFR {level}</span>}
      <p>{categoryLabels.get(topic.category)}</p>
    </header>
    <div className="topics-card-body">
      <h2 id={'topic-' + topic.id}>{topic.title}</h2>
      <p className="topics-card-description">{topic.description ?? 'Lug‘atdagi mavzuga oid so‘zlar.'}</p>
      <div className="topics-card-progress">
        <div><span>{number.format(learned)} / {number.format(total)} so‘z</span><strong>{percent}%</strong></div>
        <progress max={Math.max(1, total)} value={learned} aria-label={topic.title + ' · o‘rganilgan so‘zlar'}
          aria-valuetext={total ? number.format(learned) + ' / ' + number.format(total) + ' so‘z' : 'Mavzuga hali so‘z qo‘shilmagan'} />
      </div>
      <footer className="topics-card-actions">
        <Link href={vocabularyHref('', '', 1, topic.id)} aria-label={'Batafsil · ' + topic.title}>Batafsil</Link>
        <button type="button" className="button topics-start" disabled={busy || !total} onClick={() => onStart(topic.id)}
          title={total ? undefined : 'Mavzuga hali so‘z qo‘shilmagan'} aria-label={'Davom etish · ' + topic.title}>
          <Play size={13} aria-hidden="true" /> Davom etish
        </button>
      </footer>
    </div>
  </article>;
}
