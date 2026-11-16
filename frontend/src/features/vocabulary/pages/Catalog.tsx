import { useEffect, useId, useState } from 'react';
import { BookOpen, Check, Plus, Search } from 'lucide-react';
import { api, explain } from '../../../shared/services/api';
import { levels, type Level, type Page, type Word } from '../../../shared/types/api';
import { Notice, Speak } from '../../../shared/components/UI';

export function Catalog({ token, onChange }: { token: string; onChange: () => void }) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<Level | ''>('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<Word>>();
  const [error, setError] = useState('');
  const [added, setAdded] = useState<Record<string, 'saving' | 'saved'>>({});
  const [message, setMessage] = useState('');
  const [refresh, retry] = useState(0);
  const searchId = useId();

  useEffect(() => {
    const abort = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (query.trim()) params.set('search', query.trim());
      if (level) params.set('cefrLevel', level);
      void api<Page<Word>>('/words?' + params, { token, signal: abort.signal }).then(setResult)
        .catch((failure) => { if (!abort.signal.aborted) setError(explain(failure)); });
    }, 200);
    return () => { window.clearTimeout(timer); abort.abort(); };
  }, [token, query, level, page, refresh]);

  function reset(nextPage = 1) { setPage(nextPage); setError(''); setResult(undefined); }
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
    <div className="page-intro"><span className="tile-icon blue"><BookOpen size={26} /></span><h1>Lug‘at</h1>
      <p>Inglizcha so‘zlarni toping va takrorlash uchun kartalaringizga qo‘shing.</p></div>
    <div className="catalog-toolbar">
      <label className="search-box" htmlFor={searchId}><Search size={19} /><input id={searchId} type="search" aria-label="So‘z qidirish" placeholder="So‘z qidiring…" maxLength={80} value={query}
        onChange={(event) => { setQuery(event.target.value); reset(); }} /></label>
      <div className="filters" aria-label="CEFR darajasi">{(['', ...levels] as const).map((item) => <button key={item} className={`filter ${level === item ? 'active' : ''}`}
        aria-pressed={level === item} onClick={() => { if (level !== item) { setLevel(item); reset(); } }}>{item || 'Hammasi'}</button>)}</div>
    </div>
    {message && <Notice>{message}</Notice>}
    {error && <div className="notice-stack"><Notice error>{error}</Notice><button className="button secondary" onClick={() => { reset(page); retry((n) => n + 1); }}>Qayta urinish</button></div>}
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
    {result && result.total > 12 && <div className="pagination">
      <button className="button secondary" disabled={page === 1} onClick={() => reset(page - 1)}>Oldingi</button>
      <span>{page} / {Math.ceil(result.total / 12)}</span>
      <button className="button secondary" disabled={page * 12 >= result.total} onClick={() => reset(page + 1)}>Keyingi</button>
    </div>}
  </div>;
}
