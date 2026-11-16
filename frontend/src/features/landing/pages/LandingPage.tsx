import { ArrowRight, BookOpen, Brain, CircleCheck, Gamepad2, Play, RotateCcw, Sparkles } from 'lucide-react';
import { Link, routes } from '../../../app/router';

const benefits = [
  { icon: BookOpen, color: 'blue', title: 'Shaxsiy lug‘at', detail: 'Inglizcha so‘zlarni o‘zbekcha tarjima, misol va talaffuz bilan o‘rganing.' },
  { icon: RotateCcw, color: 'violet', title: 'O‘z vaqtida takrorlash', detail: 'LexiMind kartalarni qanday eslaganingizga qarab keyingi mashqni rejalaydi.' },
  { icon: Gamepad2, color: 'mint', title: 'O‘yin bilan mashq', detail: 'Tarjima, imlo, diktant va xotira mashqlarida bilimingizni sinab ko‘ring.' },
];

export function LandingPage({ signedIn }: { signedIn: boolean }) {
  return <div className="landing screen">
    <section className="container landing-hero">
      <div className="landing-copy">
        <span className="landing-tag"><Sparkles size={16} /> Inglizcha so‘z boyligi</span>
        <h1>Yangi so‘zlar<br />xotirangizda <em>qolsin.</em></h1>
        <p>Inglizcha so‘zlarni o‘zbekcha tarjimalar, qisqa o‘yinlar va shaxsiy takrorlash rejasi orqali o‘rganing.</p>
        <div className="landing-actions">
          <Link className="button primary" href={signedIn ? routes.dashboard : routes.register}>
            {signedIn ? 'O‘quv paneliga o‘tish' : 'O‘rganishni boshlash'} <ArrowRight size={19} />
          </Link>
          <Link className="button demo-button" href={routes.demo}><Play size={17} /> Mashqni sinash</Link>
        </div>
        <div className="landing-details"><span><CircleCheck size={16} /> O‘zbekcha tarjimalar</span><span><CircleCheck size={16} /> A1 dan C2 gacha</span></div>
      </div>
      <div className="landing-art" aria-hidden="true">
        <div className="art-rings" />
        <img src="/learning-book.webp" width="840" height="560" alt="" fetchPriority="high" />
        <div className="art-note">
          <span className="mini-icon violet"><Brain size={22} /></span>
          <span><strong lang="en">curiosity</strong><small>qiziquvchanlik</small></span>
        </div>
      </div>
    </section>
    <section className="container landing-features" aria-labelledby="landing-features">
      <h2 id="landing-features">Har bir mashqning o‘z vazifasi bor</h2>
      <div className="benefit-grid">{benefits.map(({ icon: Icon, color, title, detail }) => <article className="panel benefit" key={title}>
        <span className={'tile-icon ' + color}><Icon size={24} /></span><h3>{title}</h3><p>{detail}</p>
      </article>)}</div>
    </section>
  </div>;
}
