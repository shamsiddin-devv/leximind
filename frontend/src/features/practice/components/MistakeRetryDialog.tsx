import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Notice, Speak } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { MistakeEntry } from '../notebook';

export function MistakeRetryDialog({ entry, token, onClose, onResolved }: {
  entry: MistakeEntry; token: string; onClose: () => void; onResolved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const initialFocus = useRef<HTMLHeadingElement>(null);
  const request = useRef<AbortController | null>(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'correct' | 'incorrect'>();
  const [error, setError] = useState('');
  const { question } = entry;
  const choice = !question.input && question.options.length > 0;

  useEffect(() => {
    if (dialog.current && !dialog.current.open) {
      dialog.current.showModal();
      initialFocus.current?.focus();
    }
    return () => request.current?.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim() || request.current || status === 'correct') return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ correct: boolean }>('/mistakes-notebook/' + entry.id + '/retry', {
        token, method: 'POST', body: { answer }, signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setStatus(result.correct ? 'correct' : 'incorrect');
      if (result.correct) onResolved();
    } catch (failure) {
      if (!controller.signal.aborted) setError(explain(failure));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <dialog ref={dialog} className="app-dialog mistake-dialog" aria-labelledby="mistake-dialog-title" onClose={onClose}>
    <header className="app-dialog-heading">
      <h2 id="mistake-dialog-title" tabIndex={-1} ref={initialFocus}>Xatoni takrorlash</h2>
      <button type="button" className="app-dialog-close" aria-label="Yopish" onClick={() => dialog.current?.close()}><X size={16} aria-hidden="true" /></button>
    </header>
    <div className="mistake-dialog-question">
      <p className="mistake-question">{question.prompt}</p>
      {question.hint && <p className="mistake-dialog-hint">{question.hint}</p>}
      {question.audioUrl && <Speak url={question.audioUrl} text={entry.expectedAnswer} />}
      {question.input === 'tokens' && <p className="mistake-token-list">{question.options.join(' · ')}</p>}
    </div>
    <form className="app-dialog-form" onSubmit={(event) => void submit(event)}>
      {choice ? <fieldset disabled={busy || status === 'correct'}>
        <legend>Javobni tanlang</legend>
        <div className="mistake-choice-list">
          {question.options.map((option, index) => <label key={index}><input type="radio" name="retry-answer"
            value={option} checked={answer === option} onChange={(event) => setAnswer(event.target.value)} /> {option}</label>)}
        </div>
      </fieldset> : <label className="app-dialog-field">
        Javobingiz
        <input required maxLength={255} value={answer} disabled={busy || status === 'correct'}
          onChange={(event) => setAnswer(event.target.value)} />
      </label>}
      {error && <Notice error>{error}</Notice>}
      {status && <Notice error={status === 'incorrect'}>{status === 'correct' ? 'To‘g‘ri. Xato hal qilindi.' : 'Javob mos kelmadi. Yana urinib ko‘ring.'}</Notice>}
      <footer className="app-dialog-actions">
        <button type="button" className="app-dialog-button" onClick={() => dialog.current?.close()}>Yopish</button>
        {status !== 'correct' && <button type="submit" className="app-dialog-button" data-tone="accent" disabled={busy || !answer.trim()}>Tekshirish</button>}
      </footer>
    </form>
  </dialog>;
}
