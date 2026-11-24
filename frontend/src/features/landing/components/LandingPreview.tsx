import { BookOpen, ChevronRight, Flame, Headphones, Layers, LockKeyhole, Settings, Sun, Target, Trophy } from 'lucide-react';
import type { LandingCopy } from '../copy';

const menuIcons = [Sun, BookOpen, Layers, Trophy, Settings];
const lessons = [
  { icon: BookOpen, name: 'Present Perfect', progress: 80 },
  { icon: Headphones, name: 'Daily conversation', progress: 35 },
];
const stats = [{ icon: Flame, value: '12' }, { icon: Layers, value: '1 240' }, { icon: Target, value: '86%' }];
const activity = [45, 70, 35, 86, 58, 96, 73];

export function LandingPreview({ copy }: { copy: LandingCopy['preview'] }) {
  return <div className="welcome-preview" role="img" aria-label={copy.label}>
    <div aria-hidden="true">
      <div className="welcome-preview-bar">
        <span className="welcome-preview-dots"><i /><i /><i /></span>
        <span className="welcome-preview-address"><LockKeyhole size={11} /> app.leximind.uz/dashboard</span>
        <small>{copy.streak}</small>
      </div>
      <div className="welcome-preview-layout">
        <div className="welcome-preview-nav">
          <div className="welcome-preview-course"><span>B1</span><div>{copy.course}<small>{copy.duration}</small></div></div>
          <ul>{menuIcons.map((Icon, index) => <li key={index}><Icon size={15} />{copy.menu[index]}</li>)}</ul>
          <div className="welcome-preview-week"><small>{copy.weekly}</small><strong>+412 XP</strong><div className="welcome-preview-progress"><span style={{ width: '68%' }} /></div></div>
        </div>
        <div className="welcome-preview-main">
          <small>{copy.date}</small>
          <div className="welcome-preview-title"><h2>{copy.greeting}</h2><span><i /> {copy.target} · 12 / 15 XP</span></div>
          <div className="welcome-preview-plan">
            <div className="welcome-preview-plan-header"><span>{copy.plan}</span><small>{copy.lessons}</small></div>
            {lessons.map(({ icon: Icon, name, progress }, index) => <div className="welcome-preview-lesson" key={name}>
              <span className="welcome-preview-icon"><Icon size={15} /></span>
              <div><strong lang="en">{name}</strong><small>{copy.lessonTypes[index]}</small><div className="welcome-preview-progress"><span style={{ width: progress + '%' }} /></div></div>
              <ChevronRight size={14} />
            </div>)}
          </div>
          <div className="welcome-preview-stats">{stats.map(({ icon: Icon, value }, index) => <div key={value}><Icon size={13} /><strong>{value}</strong><small>{copy.stats[index]}</small></div>)}</div>
        </div>
        <div className="welcome-preview-activity">
          <small>{copy.chart}</small>
          <div className="welcome-preview-chart">{copy.days.map((day, index) => <div key={day}><div><span style={{ height: activity[index] + '%' }} /></div><small>{day}</small></div>)}</div>
          <div className="welcome-preview-next"><small>{copy.next}</small><strong>{copy.remaining}</strong></div>
        </div>
      </div>
    </div>
  </div>;
}
