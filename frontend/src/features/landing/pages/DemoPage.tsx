import { useState } from 'react';
import { ArrowRight, FlaskConical, Target } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { dateKey } from '../../../shared/utils/date';
import { Speak } from '../../../shared/components/UI';
import { activities, demoQuestions, demoWords } from '../../practice/activities';
import { ActivityTile } from '../../practice/components/ActivityTile';
import { Practice, type ActiveRound } from '../../practice/pages/Practice';

const progressKey = 'leximind.demo';

function bestToday() {
  try {
    const value = JSON.parse(localStorage.getItem(progressKey) ?? 'null') as { day: string; count: number } | null;
    return value?.day === dateKey(new Date()) && Number.isInteger(value.count) ? Math.max(0, Math.min(5, value.count)) : 0;
  } catch { return 0; }
}

export function DemoPage() {
  const [round, setRound] = useState<ActiveRound>();
  const [best, setBest] = useState(bestToday);
  if (round) return <Practice key={round.id} round={round} onDone={({ correctCount }) => {
    const count = Math.max(bestToday(), correctCount);
    setBest(count);
    try { localStorage.setItem(progressKey, JSON.stringify({ day: dateKey(new Date()), count })); } catch { /* The demo can run without storage. */ }
  }} onClose={() => setRound(undefined)} soundEnabled={false} />;
  return <div className="container screen inner-screen">
    <div className="page-intro"><span className="tile-icon violet"><FlaskConical size={24} /></span><h1>Sinov mashqlari</h1><p>Tarjima yoki imlo mashqini akkauntsiz sinab ko‘ring.</p></div>
    <section className="panel demo-progress" aria-label="Bugungi sinov natijasi">
      <span className="mini-icon blue"><Target size={19} /></span><span>Bugungi eng yaxshi natija</span>
      <strong>{best} / 5</strong>
    </section>
    <div className="activity-grid demo-options">
      {activities.filter(({ id }) => id === 'meaning_match' || id === 'type_word').map((activity) => <ActivityTile key={activity.id} activity={activity} onSelect={(kind) => {
        const { questions, answers } = demoQuestions(kind);
        setRound({ id: kind, kind, payload: { questions }, demoAnswers: answers });
        window.scrollTo(0, 0);
      }} />)}
    </div>
    <section className="demo-vocabulary">
      <div className="section-heading"><h2>Lug‘atdan namuna</h2><Link className="text-link" href={routes.register}>Akkaunt ochish <ArrowRight size={16} /></Link></div>
      <div className="catalog-grid">{demoWords.map((word) => <article className="panel catalog-word" key={word.id}>
        <div className="word-top"><span className="level">{word.cefrLevel}</span><Speak text={word.text} /></div>
        <h2 lang="en">{word.text}</h2><p>{word.sense[0].translationUz}</p><p className="example" lang="en">{word.sense[0].exampleSentence}</p>
      </article>)}</div>
    </section>
  </div>;
}
