import { useEffect, useId, useState } from 'react';
import { BookOpen, Check, Plus, Search, X } from 'lucide-react';
import { Link, navigate, routes, useRoute } from '../../../app/router';
import { api, explain } from '../../../shared/services/api';
import { levels, type Page, type Word } from '../../../shared/types/api';
import { Notice, Speak } from '../../../shared/components/UI';
import { listWords, vocabularyHref, wordSearchLength } from '../wordSearch';
import { topicDefinition } from '../topics';

const pageSize = 12;
type CatalogLookup = { key: string; result?: Page<Word>; error?: string };

export function Catalog({ token, onChange }: { token: string; onChange: () => void }) {
  const { searchParams } = useRoute();
  const query = searchParams.get('search')?.slice(0, wordSearchLength) ?? '';
  const level = levels.find((item) => item === searchParams.get('level')) ?? '';
  const requestedTopic = searchParams.get('topic') ?? '';
  const topic = requestedTopic.length <= 60 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedTopic) ? requestedTopic : '';
  const requestedPage = Number(searchParams.get('page'));
  const page = Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 100_000 ? requestedPage : 1;
  const [lookup, setLookup] = useState<CatalogLookup>();
  const [added, setAdded] = useState<Record<string, 'saving' | 'saved'>>({});
  const [message, setMessage] = useState('');
  const [refresh, retry] = useState(0);
  const searchId = useId();
  const key = JSON.stringify([query.trim(), level, page, topic, refresh]);
  const result = lookup?.key === key ? lookup.result : undefined;
  const error = lookup?.key === key ? lookup.error : undefined;

  useEffect(() => {
    const abort = new AbortController();
    const timer = window.setTimeout(() => {
      void listWords({ query, level, page, limit: pageSize, token, signal: abort.signal, topic })
        .then((result) => { if (!abort.signal.aborted) setLookup({ key, result }); })
        .catch((failure) => { if (!abort.signal.aborted) setLookup({ key, error: explain(failure) }); });
    }, 200);
    return () => { window.clearTimeout(timer); abort.abort(); };
  }, [token, query, level, page, key, topic]);

  const words = result?.data;
  async function add(word: Word) {
    setMessage('');
    setAdded((current) => ({ ...current, [word.id]: 'saving' }));
    try {
      await api('/cards', { token, method: 'POST', body: { wordId: word.id } });
      setAdded((current) => ({ ...current, [word.id]: 'saved' }));
      setMessage(`“${word.text}” kartalaringizga qo‘shildi.`);
      onChange();
    } catch (failure) {
      setAdded((current) => { const next = { ...current }; delete next[word.id]; return next; });
      setMessage(explain(failure, { 409: 'Bu so‘z kartalaringizda bo‘lishi mumkin.' }));
    }
  }

  return <div className="container screen inner-screen">
    <div className="page-intro"><span className="tile-icon blue"><BookOpen size={26} /></span><h1 lang="en">Vocabulary</h1>
      <p>Inglizcha so‘zlarni toping va takrorlash uchun kartalaringizga qo‘shing.</p></div>
    <div className="catalog-toolbar">
      <label className="search-box" htmlFor={searchId}><Search size={19} /><input id={searchId} type="search" aria-label="So‘z qidirish" placeholder="So‘z qidiring…" maxLength={wordSearchLength} value={query}
        onChange={(event) => navigate(vocabularyHref(event.target.value, level, 1, topic), true)} /></label>
      <div className="filters" aria-label="CEFR darajasi">{(['', ...levels] as const).map((item) => <button key={item} className={`filter ${level === item ? 'active' : ''}`}
        aria-pressed={level === item} onClick={() => { if (level !== item) navigate(vocabularyHref(query, item, 1, topic), true); }}>{item || 'Hammasi'}</button>)}</div>
    </div>
    {topic && <div className="filters catalog-topic-filter">
      <Link className="filter" href={routes.topics}>Mavzularga qaytish</Link>
      <Link className="filter active" href={vocabularyHref(query, level)} aria-label={topicDefinition(topic).title + ' filtrini olib tashlash'}>
        {topicDefinition(topic).title} <X size={14} aria-hidden="true" />
      </Link>
    </div>}
    {message && <Notice>{message}</Notice>}
    {error && <div className="notice-stack"><Notice error>{error}</Notice><button className="button secondary" onClick={() => retry((n) => n + 1)}>Qayta urinish</button></div>}
    {!error && !words && <p className="empty" role="status">Lug‘at yuklanmoqda…</p>}
    {words && (words.length ? <div className="catalog-grid">{words.map((word) => <article className="panel catalog-word" key={word.id}>
      <div className="word-top"><span className="level">{word.cefrLevel}</span><Speak url={word.audioUrl} text={word.text} /></div>
      <h2 lang="en">{word.text}</h2><p>{word.sense[0]?.translationUz}</p>
      <p className="example" lang="en">{word.sense[0]?.exampleSentence || word.sense[0]?.definition}</p>
      <button className="button secondary" disabled={Boolean(added[word.id])} onClick={() => void add(word)}>
        {added[word.id] === 'saved' ? <Check size={17} /> : <Plus size={17} />}
        {added[word.id] === 'saving' ? 'Saqlanmoqda…' : added[word.id] === 'saved' ? 'Qo‘shildi' : 'Karta qo‘shish'}
      </button>
    </article>)}</div> : <p className="empty" role="status">Mos so‘z topilmadi.</p>)}
    {result && result.total > pageSize && <div className="pagination">
      <button className="button secondary" disabled={page === 1} onClick={() => navigate(vocabularyHref(query, level, page - 1, topic), true)}>Oldingi</button>
      <span>{page} / {Math.ceil(result.total / pageSize)}</span>
      <button className="button secondary" disabled={page * pageSize >= result.total} onClick={() => navigate(vocabularyHref(query, level, page + 1, topic), true)}>Keyingi</button>
    </div>}
  </div>;
}
