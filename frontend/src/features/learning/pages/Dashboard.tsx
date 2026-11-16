import { ArrowRight, BookOpen, CalendarDays, Check, CircleHelp, Flame, Layers3, Play, RotateCcw, Sparkles, Target } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link, routes } from '../../../app/router';
import { Speak } from '../../../shared/components/UI';
import type { Activity, Plan, Profile, Session, Statistics } from '../../../shared/types/api';
import { dateKey } from '../../../shared/utils/date';
import { activities, demoWords } from '../../practice/activities';
import { ActivityTile } from '../../practice/components/ActivityTile';

type Props = {
  name: string; profile?: Profile; plan?: Plan; history: Session[]; stats?: Statistics; busy: boolean;
  onStart: () => void; onActivity: (kind: Activity) => void;
};
const days = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const weekDay = (date: Date) => (date.getUTCDay() + 6) % 7;
const dailyActions: Record<Plan['nextAction'], [string, string, string]> = {
  RESUME_SESSION: ['Mashqni davom ettiring.', 'Faol sessiyangiz bor. Qolgan kartalarni hozir takrorlashingiz mumkin.', 'Mashqni davom ettirish'],
  START_SESSION: ['Har kuni bir qadam.', 'Takrorlash kuni kelgan kartalaringizni mustahkamlang.', 'Mashqni boshlash'],
  ADD_OR_RESUME_CARDS: ['Birinchi kartangizni yarating.', 'Lug‘atdan o‘rganmoqchi bo‘lgan so‘zlaringizni tanlang.', 'So‘zlarni tanlash'],
  CAUGHT_UP: ['Bugungi kartalar tugadi.', 'Keyingi takrorlashgacha o‘yin orqali so‘z boyligingizni sinang.', 'O‘yinlarni ko‘rish'],
  DAILY_NEW_LIMIT_REACHED: ['Bugungi maqsadga yetdingiz.', 'Yangi so‘zlar limiti bajarildi. Mashqni o‘yin bilan davom ettirishingiz mumkin.', 'O‘yinlarni ko‘rish'],
};

export function Dashboard({ name, profile, plan, history, stats, busy, onStart, onActivity }: Props) {
  const today = new Date(dateKey(new Date(), profile?.timezone) + 'T12:00:00Z');
  const weekday = weekDay(today);
  const featuredWord = demoWords[Math.floor(today.getTime() / 86_400_000) % demoWords.length];
  const count = plan?.dailyNewReviewed ?? 0;
  const goal = plan?.dailyNewLimit ?? profile?.dailyNewWords ?? 10;
  const ratio = Math.min(1, count / goal);
  const finishedDays = new Set(history.flatMap((session) => session.status === 'completed' && session.endedAt ? [dateKey(new Date(session.endedAt), profile?.timezone)] : []));
  if (profile?.lastSessionAt) finishedDays.add(dateKey(new Date(profile.lastSessionAt), profile.timezone));
  const [title, detail, action] = plan ? dailyActions[plan.nextAction] : ['Har kuni bir qadam.', 'Shaxsiy mashq rejangiz yuklanmoqda.', 'Mashqni boshlash'];
  const forecast = plan?.forecast ?? [];
  const maxForecast = Math.max(1, ...forecast.map((item) => item.count));

  return <div className="container screen dashboard">
    <div className="welcome">
      <div><h1>Salom, {name.split(/\s+/)[0]}! <span className="wave" aria-hidden="true">👋</span></h1>
        <p>Bugungi mashqlaringiz va o‘quv natijalaringiz.</p></div>
      <div className="dashboard-tags">
        {profile && <span className="date-pill"><BookOpen size={16} /> {profile.level} daraja</span>}
        <span className="date-pill"><CalendarDays size={16} /> {today.getUTCDate()}-{months[today.getUTCMonth()]}</span>
      </div>
    </div>
    <div className="dashboard-grid">
      <div className="main-column">
        <section className="hero daily-hero" aria-labelledby="daily-title">
          <div className="hero-orbit" aria-hidden="true" />
          <img className="hero-image" src="/learning-book.webp" width="840" height="560" alt="" fetchPriority="high" />
          <div className="hero-content">
            <span className="hero-label"><Sparkles size={14} /> KUNLIK MASHQ</span>
            <h2 id="daily-title">{title}</h2>
            <p>{plan?.nextAction === 'START_SESSION' ? `Takrorlashga tayyor ${plan.availableNow} ta kartangiz bor.` : detail}</p>
            <button className="button white hero-button" onClick={onStart} disabled={busy || !plan}>
              <Play size={16} fill="currentColor" />{busy ? 'Yuklanmoqda…' : action}<ArrowRight size={18} />
            </button>
          </div>
        </section>
        {stats && <section className="panel summary-strip" aria-label="Mashq statistikasi">
          <div><span className="mini-icon blue"><Layers3 size={19} /></span><span><strong>{stats.cards}</strong><small>So‘z kartalari</small></span></div>
          <div><span className="mini-icon violet"><RotateCcw size={19} /></span><span><strong>{stats.reviews}</strong><small>Takrorlashlar</small></span></div>
          <div><span className="mini-icon mint"><Check size={20} /></span><span><strong>{stats.sessions}</strong><small>Tugallangan sessiyalar</small></span></div>
        </section>}
        <section className="quick-section" aria-labelledby="quick-title">
          <div className="section-heading"><h2 id="quick-title">Mashqni tanlang</h2>
            <Link className="text-link" href={routes.games}>Barcha o‘yinlar <ArrowRight size={16} /></Link>
          </div>
          <div className="activity-grid quick-grid">{activities.slice(0, 3).map((activity) => <ActivityTile key={activity.id} activity={activity} onSelect={onActivity} />)}</div>
        </section>
        {plan && <section className="panel forecast" aria-labelledby="forecast-title">
          <div className="panel-label"><span className="mini-icon blue"><CalendarDays size={19} /></span><h2 id="forecast-title">Keyingi takrorlashlar</h2></div>
          {forecast.some(({ count: due }) => due > 0) ? <div className="forecast-graph">{forecast.map(({ date, count: due }) => {
            const day = days[weekDay(new Date(date + 'T12:00:00Z'))];
            return <div key={date} className="forecast-day">
              <span className="forecast-count">{due}</span>
              <span className="forecast-track"><span style={{ blockSize: Math.max(5, 100 * due / maxForecast) + '%' }} /></span>
              <span>{date === dateKey(today, 'UTC') ? 'Bugun' : day}</span>
            </div>;
          })}</div> : <p>Hozircha rejalashtirilgan takrorlash yo‘q.</p>}
        </section>}
      </div>
      <aside className="rail" aria-label="O‘quv natijalari va kun so‘zi">
        <section className="panel streak">
          <div className="panel-label"><span className="mini-icon amber"><Flame size={19} fill="currentColor" strokeWidth={1.7} /></span><h2>Faollik seriyasi</h2></div>
          <div className="streak-count"><strong>{profile?.streakDay ?? '–'}</strong><span>kun ketma-ket</span></div>
          <div className="week">{days.map((day, index) => {
            const dayDate = new Date(today);
            dayDate.setUTCDate(today.getUTCDate() + index - weekday);
            const done = finishedDays.has(dateKey(dayDate, 'UTC'));
            return <div key={day} className={`week-day ${index === weekday ? 'today' : ''} ${done ? 'done' : ''}`} aria-label={`${day}${index === weekday ? ', bugun' : ''}${done ? ', bajarildi' : ''}`}>
              <span>{day}</span><span className="day-dot">{done ? <Check size={13} strokeWidth={3} /> : <span />}</span>
            </div>;
          })}</div>
        </section>
        <section className="panel goal">
          <div><div className="panel-label"><span className="mini-icon blue"><Target size={20} /></span><h2>Kunlik maqsad</h2></div>
            <p><strong>{count}</strong><span> / {goal} yangi so‘z</span></p></div>
          <div className="goal-ring" style={{ '--fill': `${ratio * 100}%` } as CSSProperties} role="progressbar" aria-label="Kunlik maqsad" aria-valuemin={0} aria-valuenow={Math.min(count, goal)} aria-valuemax={goal}>
            <span>{Math.round(ratio * 100)}%</span></div>
        </section>
        <section className="panel word-panel">
          <div className="panel-label"><span className="mini-icon violet"><BookOpen size={19} /></span><h2>Kun so‘zi</h2><span className="level">{featuredWord.cefrLevel}</span></div>
          <div className="word-title"><strong lang="en">{featuredWord.text}</strong><Speak text={featuredWord.text} /></div>
          <p>{featuredWord.sense[0].translationUz}</p>
          <Link className="text-link" href={routes.vocabulary}>Lug‘atni ochish <ArrowRight size={15} /></Link>
        </section>
        {Boolean(plan?.difficultWords.length) && <section className="panel difficult">
          <div className="panel-label"><span className="mini-icon amber"><CircleHelp size={19} /></span><h2>Qiyin so‘zlar</h2></div>
          <ul>{plan?.difficultWords.slice(0, 3).map(({ wordId, text, againCount }) => <li key={wordId}><span lang="en">{text}</span><small>{againCount} marta</small></li>)}</ul>
        </section>}
      </aside>
    </div>
  </div>;
}
