import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Plus, Sparkles } from 'lucide-react';
import { Link, routes, useRoute } from '../../../app/router';
import { api, ApiError, explain } from '../../../shared/services/api';
import { Notice } from '../../../shared/components/UI';
import { findWord } from '../../learning-path/words';
import { WordAnalysis } from '../../learning-path/WordAnalysis';
import { pathLinks } from '../../learning-path/pathLinks';
import { statusLabels, type StudyWord } from '../studyVocabulary';

export function VocabularyWordPage({ path, token, onChange }: { path: string; token: string; onChange: () => void }) {
  const id = path.slice(routes.vocabulary.length + 1);
  const { searchParams } = useRoute();
  const requestedBack = searchParams.get('back');
  const back = requestedBack?.startsWith(routes.vocabulary + '?') ? requestedBack : routes.vocabulary;
  const [word, setWord] = useState<StudyWord>();
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [revision, refresh] = useState(0);
  const valid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);

  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setError('');
    void api<StudyWord>('/learning-path/vocabulary/' + id, { token, signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setWord(result); })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setError(explain(failure, { 404: 'So‘z topilmadi yoki uning darajasi hali ochilmagan.' })); });
    return () => controller.abort();
  }, [id, revision, token, valid]);

  async function add() {
    if (saving || !word || word.cardId) return;
    setSaving(true);
    setSaveError('');
    try {
      await api('/cards', { token, method: 'POST', body: { wordId: word.id } });
      onChange();
    } catch (failure) {
      if (!(failure instanceof ApiError && failure.status === 409)) setSaveError(explain(failure));
    } finally {
      setSaving(false);
      refresh((value) => value + 1);
    }
  }

  return <div className="container screen inner-screen course-workspace vocabulary-detail">
    <div className="course-header-row">
      <Link className="course-button" href={back}><ArrowLeft size={16} aria-hidden="true" /> Lug‘atga qaytish</Link>
      {word && <div className="course-actions">
        <span className="course-chip">{word.cefrLevel}</span><span className="word-state" data-state={word.status}>{statusLabels[word.status]}</span>
        <button className="course-button" type="button" disabled={Boolean(word.cardId) || saving} onClick={() => void add()}>
          {word.cardId ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
          {word.cardId ? 'Kartada' : saving ? 'Saqlanmoqda…' : 'Karta qo‘shish'}
        </button>
      </div>}
    </div>
    <header className="course-heading"><h1><Sparkles size={23} aria-hidden="true" /> So‘z tahlili</h1></header>
    {saveError && <Notice error>{saveError}</Notice>}
    {(!valid || error) && <Notice error>{error || 'So‘z topilmadi.'}</Notice>}
    {valid && !word && !error && <p role="status">So‘z yuklanmoqda…</p>}
    {word && <>
      <WordAnalysis entry={findWord(word.text)} word={word} />
      {word.fromLesson && <p className="analysis-note"><Sparkles size={16} aria-hidden="true" /> Bu so‘z dars yakunida lug‘atingizga qo‘shilgan.
        <Link href={pathLinks.lessons}> Darslarni ko‘rish</Link></p>}
    </>}
  </div>;
}
