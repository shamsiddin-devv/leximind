import { BookOpen, Brain, Gamepad2, Languages } from 'lucide-react';
import type { Activity, GameScore } from '../../../shared/types/api';
import { activities } from '../activities';
import { ActivityTile } from '../components/ActivityTile';

const groups = [
  { id: 'vocabulary', title: 'So‘z o‘yinlari', description: 'Tarjima, imlo, gap tuzish va tinglab yozish mashqlari.', icon: Languages, color: 'blue' },
  { id: 'memory', title: 'Xotira o‘yinlari', description: 'So‘zlar, raqamlar va kataklarning tartibini eslab qoling.', icon: Brain, color: 'violet' },
  { id: 'assessment', title: 'Darajani aniqlash', description: 'Inglizcha so‘z boyligingizni CEFR bo‘yicha sinang.', icon: BookOpen, color: 'amber' },
] as const;

export function GamesPage({ busy, scores, onActivity }: { busy: boolean; scores: GameScore[]; onActivity: (kind: Activity) => void }) {
  return <div className="container screen inner-screen games-page">
    <div className="page-intro"><span className="tile-icon violet"><Gamepad2 size={27} /></span><h1>O‘yinlar va mashqlar</h1>
      <p>So‘z boyligingizni kengaytiring yoki xotirangizni sinab ko‘ring.</p></div>
    <nav className="game-jump" aria-label="O‘yin bo‘limlari">
      {groups.map(({ id, title, icon: Icon }) => <a className="filter" href={'#games-' + id} key={id}><Icon size={16} />{title}</a>)}
    </nav>
    <div className="game-groups" aria-busy={busy}>
      {groups.map(({ id, title, description, icon: Icon, color }) => <section className="game-group" key={id} id={'games-' + id} aria-labelledby={'heading-' + id}>
        <header className="game-group-heading">
          <span className={'mini-icon ' + color}><Icon size={20} /></span>
          <div><h2 id={'heading-' + id}>{title}</h2><p>{description}</p></div>
        </header>
        <div className={'activity-grid all-games group-' + id}>
          {activities.filter((activity) => activity.category === id).map((activity) => <ActivityTile key={activity.id} activity={activity} onSelect={onActivity} />)}
        </div>
      </section>)}
    </div>
    {scores.length > 0 && <section className="panel score-history"><h2>Oxirgi natijalar</h2>
      {scores.map((score) => <div key={score.id}><span>{activities.find(({ id }) => id === score.gameType)?.title}</span><strong>{score.score} ball</strong></div>)}
    </section>}
  </div>;
}
