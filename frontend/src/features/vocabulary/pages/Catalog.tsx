import { useEffect, useId, useState } from 'react';
import { ArrowRight, BookOpen, Check, LockKeyhole, Plus, Search, Sparkles, X } from 'lucide-react';
import { Link, navigate, useRoute } from '../../../app/router';
import { api, ApiError, explain } from '../../../shared/services/api';
import { levels, type Page } from '../../../shared/types/api';
import { Notice, Speak } from '../../../shared/components/UI';
import { wordSearchLength } from '../wordSearch';
import { topicDefinition } from '../topics';
import { pathLinks } from '../../learning-path/pathLinks';
import type { CourseProgress } from '../../learning-path/useCourseProgress';
import { catalogHref, listStudyVocabulary, statusLabels, vocabularyFilter, vocabularyStatuses, wordDetailHref, type StudyWord } from '../studyVocabulary';
import '../../learning-path/course-workspace.css';

const pageSize = 12;
type Lookup = { key: string; result?: Page<StudyWord> & { progress: CourseProgress }; error?: string };

export function Catalog({ token, progress, onChange }: { token: string; progress?: CourseProgress; onChange: () => void }) {
  const { searchParams } = useRoute();
  const filter = vocabularyFilter(searchParams);
  const { query, scope, page, topic, status, fromLessons } = filter;
  const [lookup, setLookup] = useState<Lookup>();
  const [saving, setSaving] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const [revision, refresh] = useState(0);
  const searchId = useId();
  const key = JSON.stringify([query, scope, page, topic, status, fromLessons, revision, progress?.activeLevel, progress?.completed.length]);
  const result = lookup?.key === key ? lookup.result : undefined;
  const error = lookup?.key === key ? lookup.error : undefined;
  const course = result?.progress ?? progress;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void listStudyVocabulary({ query, scope, page, topic, status, fromLessons }, pageSize, token, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setLookup({ key, result: data }); })
        .catch((failure: unknown) => { if (!controller.signal.aborted) setLookup({ key, error: explain(failure) }); });
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [token, query, scope, page, topic, status, fromLessons, key]);

  async function add(word: StudyWord) {
    setMessage(undefined);
    setSaving((current) => [...current, word.id]);
    try {
      await api('/cards', { token, method: 'POST', body: { wordId: word.id } });
      setMessage({ text: '“' + word.text + '” kartalaringizga qo‘shildi.' });
      onChange();
    } catch (failure) {
      if (!(failure instanceof ApiError && failure.status === 409)) setMessage({ text: explain(failure), error: true });
    } finally {
      refresh((value) => value + 1);
      setSaving((current) => current.filter((id) => id !== word.id));
    }
  }

  function update(change: Partial<typeof filter>) {
    navigate(catalogHref({ ...filter, page: 1, ...change }), true);
  }

  return <div className="container screen inner-screen course-workspace study-vocabulary">
    <header className="course-header-row">
      <div className="course-heading">
        {course && <div className="course-heading-meta"><span className="course-pill"><BookOpen size={14} aria-hidden="true" />{course.activeLevel} · Asosiy daraja</span>
          <small>{course.unlockedLevel} gacha ochiq</small></div>}
        <h1 lang="en">Vocabulary</h1>
        <p>Darajangizga mos so‘zlarni o‘rganing va oldingi darajalarni takrorlang.</p>
      </div>
      <Link className="course-button" href={pathLinks.root}>O‘quv yo‘li <ArrowRight size={16} aria-hidden="true" /></Link>
    </header>
    <div className="course-panel vocabulary-toolbar">
      <label className="course-search" htmlFor={searchId}><Search size={17} aria-hidden="true" />
        <input id={searchId} type="search" aria-label="So‘z yoki tarjimani qidirish" placeholder="So‘z yoki tarjimani qidiring"
          maxLength={wordSearchLength} value={query} onChange={(event) => update({ query: event.target.value, scope: scope === 'current' ? 'all' : scope })} />
      </label>
      <div className="course-filters vocabulary-levels" role="group" aria-label="CEFR darajasi">
        <button type="button" aria-pressed={scope === 'current'} onClick={() => update({ scope: 'current' })}>Sizga mos</button>
        <button type="button" aria-pressed={scope === 'all'} onClick={() => update({ scope: 'all' })}>Barchasi</button>
        {levels.map((item, index) => {
          const locked = !course || index > levels.indexOf(course.unlockedLevel);
          return <button type="button" key={item} aria-pressed={scope === item} disabled={locked}
            title={locked && course ? 'Bu daraja darslar yakunlangach ochiladi' : undefined} onClick={() => update({ scope: item })}>
            {item}{locked && <LockKeyhole size={12} aria-hidden="true" />}
          </button>;
        })}
      </div>
      <div className="vocabulary-secondary-filters">
        <label>So‘z holati <select value={status} onChange={(event) => update({ status: vocabularyStatuses.find((item) => item === event.target.value) ?? '' })}>
          <option value="">Barcha holatlar</option>
          {vocabularyStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
        </select></label>
        <button className="course-button" data-selected={fromLessons} type="button" aria-pressed={fromLessons}
          onClick={() => update({ fromLessons: !fromLessons, scope: !fromLessons ? 'all' : scope })}><Sparkles size={15} aria-hidden="true" /> Darslardan qo‘shilgan</button>
        {topic && <Link className="course-button" href={catalogHref({ ...filter, topic: '', page: 1 })} aria-label={topicDefinition(topic).title + ' filtrini olib tashlash'}>
          {topicDefinition(topic).title} <X size={14} aria-hidden="true" />
        </Link>}
      </div>
    </div>
    {message && <Notice error={message.error}>{message.text}</Notice>}
    {error && <div className="notice-stack"><Notice error>{error}</Notice><button type="button" className="course-button" onClick={() => refresh((value) => value + 1)}>Qayta urinish</button></div>}
    {!error && !result && <p className="course-empty" role="status">Lug‘at yuklanmoqda…</p>}
    {result && <>
      <div className="course-section-top"><h2>{scope === 'current' ? course?.activeLevel + ' darajadagi so‘zlar' : 'So‘zlar'}</h2><small role="status">{result.total} ta natija</small></div>
      {!result.data.length && <p className="course-panel course-empty" role="status">
        {scope !== 'current' && scope !== 'all' && course && levels.indexOf(scope) > levels.indexOf(course.unlockedLevel)
          ? 'Bu daraja hali ochilmagan. O‘quv yo‘lidagi darslarni davom ettiring.' : 'Mos so‘z topilmadi.'}
      </p>}
      <div className="vocabulary-study-grid">
        {result.data.map((word) => <article className="course-panel vocabulary-study-word" key={word.id}>
          <header className="vocabulary-card-header">
            <Speak url={word.audioUrl} text={word.text} label={'Talaffuzni tinglash · ' + word.text} />
            <div className="vocabulary-word-badges">
              <span className="course-chip">CEFR {word.cefrLevel}</span>
              <span className="word-state" data-state={word.status}>{statusLabels[word.status]}</span>
            </div>
          </header>
          <div className="vocabulary-card-body">
            <h3 lang="en">{word.text}</h3>
            <p>{word.sense[0]?.translationUz}</p>
            <p className="vocabulary-card-example" lang="en">{word.sense[0]?.exampleSentence || word.sense[0]?.definition}</p>
            {word.fromLesson && <small className="vocabulary-card-origin"><Sparkles size={13} aria-hidden="true" /> O‘tilgan darsdan</small>}
          </div>
          <footer className="vocabulary-card-footer">
            <button type="button" className="vocabulary-card-add" data-added={Boolean(word.cardId)}
              disabled={Boolean(word.cardId) || saving.includes(word.id)} onClick={() => void add(word)}>
              {word.cardId ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
              {word.cardId ? 'Kartada' : saving.includes(word.id) ? 'Saqlanmoqda…' : 'Karta qo‘shish'}
            </button>
            <Link className="vocabulary-word-link" href={wordDetailHref(word.id, catalogHref(filter))} aria-label={'So‘z tahlili · ' + word.text}>
              So‘z tahlili <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </footer>
        </article>)}
      </div>
      {result.total > pageSize && <div className="pagination">
        <button type="button" className="course-button" disabled={page === 1} onClick={() => update({ page: page - 1 })}>Oldingi</button>
        <span>{page} / {Math.ceil(result.total / pageSize)}</span>
        <button type="button" className="course-button" disabled={page * pageSize >= result.total} onClick={() => update({ page: page + 1 })}>Keyingi</button>
      </div>}
    </>}
    <a className="vocabulary-sources" href="/vocabulary-sources.txt" target="_blank" rel="noopener">Lug‘at manbalari</a>
  </div>;
}
