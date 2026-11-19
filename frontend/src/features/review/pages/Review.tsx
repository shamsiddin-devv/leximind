import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye, RotateCcw } from 'lucide-react';
import { api, explain } from '../../../shared/services/api';
import type { Rating, Session } from '../../../shared/types/api';
import { Notice, Speak } from '../../../shared/components/UI';

const ratings: [Rating, string][] = [['AGAIN', 'Qayta'], ['HARD', 'Qiyin'], ['GOOD', 'Yaxshi'], ['EASY', 'Oson']];

export function Review({ initial, token, onDone, onClose, autoplayPronunciation = false, doneActionLabel = 'Bosh sahifaga' }: {
  initial: Session; token: string; onDone: () => void; onClose: () => void; autoplayPronunciation?: boolean; doneActionLabel?: string;
}) {
  const [session, setSession] = useState(initial);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const started = useRef(Date.now());
  const task = session.tasks.find((item) => !item.completed);
  const progress = session.tasks.filter((item) => item.completed).length;

  async function act(rating?: Rating) {
    setBusy(true); setError('');
    try {
      if (task && rating) {
        try {
          await api(`/sessions/${session.id}/tasks/${task.id}/review`, { token, method: 'POST', body: {
            rating, responseMs: Math.min(3_600_000, Date.now() - started.current),
          } });
        } catch (failure) {
          const latest = await api<Session>('/sessions/' + session.id, { token });
          if (!latest.tasks.find((item) => item.id === task.id)?.completed) throw failure;
          setSession(latest);
        }
        setSession((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, completed: true } : item) }));
        setRevealed(false); started.current = Date.now();
      } else if (!task) {
        await api(`/sessions/${session.id}/complete`, { token, method: 'POST' });
        setDone(true); onDone();
      }
    } catch (failure) { setError(explain(failure)); }
    finally { setBusy(false); }
  }
  return <div className="container screen practice-screen">
    <div className="practice-top"><button className="icon-button" aria-label="Mashqdan chiqish" onClick={onClose}><ArrowLeft size={22} /></button>
      <progress aria-label="Takrorlash jarayoni" max={Math.max(1, session.tasks.length)} value={progress} /><span className="step-counter">{progress} / {session.tasks.length}</span></div>
    <section className="panel question-card">
      <span className="question-kind"><RotateCcw size={16} /> Kartalarni takrorlash</span>
      {done ? <><h1>Bugungi sessiya yakunlandi!</h1><button className="button primary" onClick={onClose}>{doneActionLabel} <ArrowRight size={18} /></button></>
        : !task ? <><h1>Kartalar takrorlandi!</h1><button className="button primary" disabled={busy} onClick={() => void act()}>Sessiyani yakunlash <Check size={18} /></button></>
          : <div className="review-content" key={task.id}>
            <div className="practice-pronunciation"><h1 lang="en">{task.text}</h1><Speak text={task.text} url={task.audioUrl} autoplay={autoplayPronunciation} /></div>
            {revealed ? <><p className="review-answer">{task.translationUz}</p><p className="question-hint" lang="en">{task.definition}</p>
              <div className="ratings">{ratings.map(([rating, label]) => <button className="button secondary" type="button" disabled={busy} key={rating}
                onClick={() => void act(rating)}>{label}</button>)}</div></>
              : <button className="button primary" onClick={() => setRevealed(true)}><Eye size={18} /> Javobni ko‘rish</button>}
          </div>}
      {error && <Notice error>{error}</Notice>}
    </section>
  </div>;
}
