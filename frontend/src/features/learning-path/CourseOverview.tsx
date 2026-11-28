import { useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronRight, Flame, Layers3, LockKeyhole, Map, Play, Sparkles, Target, Trophy } from 'lucide-react';
import { Link } from '../../app/router';
import { levels, type Level } from '../../shared/types/api';
import { course, lessons, type CourseLesson } from './course';
import { taughtWords } from './lessonVocabulary';
import { pathLinks } from './pathLinks';
import type { CourseProgress } from './useCourseProgress';
import './course-workspace.css';

const levelNames: Record<Level, string> = {
  A1: 'Boshlang‘ich', A2: 'Oddiy muloqot', B1: 'O‘rta', B2: 'O‘rta yuqori', C1: 'Ilg‘or', C2: 'Mukammal',
};

const filters = [
  ['all', 'Barchasi'], ['current', 'Joriy'], ['done', 'Bajarilgan'], ['review', 'Takrorlash'], ['locked', 'Qulflangan'],
] as const;
type Filter = (typeof filters)[number][0];

export function CourseNavigation({ active }: { active: 'overview' | 'lessons' | 'lab' }) {
  return <nav className="course-nav" aria-label="O‘quv yo‘li bo‘limlari">
    <Link href={pathLinks.root} aria-current={active === 'overview' ? 'page' : undefined}><Map size={16} aria-hidden="true" /> O‘quv yo‘li</Link>
    <Link href={pathLinks.lessons} aria-current={active === 'lessons' ? 'page' : undefined}><BookOpen size={16} aria-hidden="true" /> Darslar</Link>
    <Link href={pathLinks.lab} aria-current={active === 'lab' ? 'page' : undefined}><Sparkles size={16} aria-hidden="true" /> So‘z laboratoriyasi</Link>
  </nav>;
}

export function CourseHeader({ progress, title, children }: { progress?: CourseProgress; title: string; children?: React.ReactNode }) {
  const required = progress ? lessons.filter((lesson) => levels.indexOf(lesson.level) >= levels.indexOf(progress.startLevel)) : [];
  const finished = progress ? required.filter((lesson) => progress.completed.includes(lesson.id)).length : 0;
  return <header className="course-heading">
    {progress && <div className="course-heading-meta"><span className="course-pill"><BookOpen size={14} aria-hidden="true" />{progress.activeLevel} · {levelNames[progress.activeLevel]}</span>
      <small>{finished} / {required.length} dars bajarildi</small></div>}
    <h1>{title}</h1>
    {children}
  </header>;
}

function lessonStatus(lesson: CourseLesson, progress: CourseProgress): Exclude<Filter, 'all'> {
  if (progress.completed.includes(lesson.id)) return 'done';
  if (progress.nextLessonId === lesson.id) return 'current';
  return levels.indexOf(lesson.level) < levels.indexOf(progress.startLevel) ? 'review' : 'locked';
}

function UnitList({ progress, filter, selectedLevel, showDescription }: {
  progress: CourseProgress; filter: Filter; selectedLevel?: Level; showDescription: boolean;
}) {
  const units = course.flatMap((unit, index) => {
    if (selectedLevel && unit.level !== selectedLevel) return [];
    const visible = unit.lessons.filter((lesson) => filter === 'all' || lessonStatus({ ...lesson, level: unit.level }, progress) === filter);
    return visible.length ? [{ ...unit, visible, index }] : [];
  });

  return <section className="course-unit-list" aria-label="Birliklar va darslar">
    {units.map((unit) => {
      const done = unit.lessons.filter((lesson) => progress.completed.includes(lesson.id)).length;
      return <section className="course-panel course-unit" key={unit.level}>
        <header><span className="course-unit-number">{unit.index + 1}</span><div>
          <h3>{unit.title} <span className="course-chip">{unit.level}</span></h3>
          {showDescription && <p>{unit.description}</p>}
        </div>
          <div className="course-unit-progress"><small>{done} / {unit.lessons.length} dars</small>
            {showDescription && <progress value={done} max={unit.lessons.length} aria-label={unit.title + ' natijasi'} />}</div></header>
        <ul>{unit.visible.map((item) => {
          const lesson = { ...item, level: unit.level };
          const state = lessonStatus(lesson, progress);
          const Icon = state === 'done' ? Check : state === 'locked' ? LockKeyhole : Play;
          const action = state === 'done' || state === 'review' ? 'Takrorlash' : state === 'current' ? 'Davom etish' : 'Qulflangan';
          const content = <><span className="course-unit-icon"><Icon size={17} aria-hidden="true" /></span>
            <div className="course-row-main"><strong>{item.title}</strong>
              {state === 'done' && <span className="course-pill">Bajarildi</span>}
              {state === 'current' && <span className="course-pill current">Joriy</span>}
              <small>Dars {lessons.findIndex((candidate) => candidate.id === item.id) + 1}
                <span><BookOpen size={13} aria-hidden="true" />{taughtWords.get(item.id)?.length ?? 0} yangi so‘z va ibora</span></small>
            </div>
            <span className="course-row-action">{action}{state === 'locked' ? <LockKeyhole size={14} aria-hidden="true" /> : <ChevronRight size={15} aria-hidden="true" />}</span></>;
          return <li key={item.id} data-state={state}>{state === 'locked' ? <div className="course-row">{content}</div>
            : <Link className="course-row" href={pathLinks.lesson(item.id)}>{content}</Link>}</li>;
        })}</ul>
      </section>;
    })}
    {!units.length && <p className="course-panel course-empty" role="status">Bu holatda dars topilmadi.</p>}
  </section>;
}

export function CourseOverview({ progress, streak, listing }: { progress: CourseProgress; streak?: number; listing: boolean }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedLevel, setSelectedLevel] = useState<Level>();
  const required = lessons.filter((lesson) => levels.indexOf(lesson.level) >= levels.indexOf(progress.startLevel));
  const done = required.filter((lesson) => progress.completed.includes(lesson.id)).length;
  const percent = required.length ? Math.round(done / required.length * 100) : 0;
  const next = lessons.find((lesson) => lesson.id === progress.nextLessonId);
  const unit = course.find((item) => item.level === progress.activeLevel);
  const goal = levels[levels.indexOf(progress.activeLevel) + 1];

  return <>
    <CourseNavigation active={listing ? 'lessons' : 'overview'} />
    <div className="course-header-row">
      <CourseHeader progress={progress} title={listing ? 'Darslar' : 'O‘quv yo‘li'}>
        <p>{listing ? 'Har bir darsda lug‘at, grammatika, so‘z tahlili va mashqlar bor.' : 'Darajangizga mos darslar ketma-ket ochiladi. Yangi so‘zlarni darsda o‘rganing va lug‘atda mustahkamlang.'}</p>
      </CourseHeader>
      {!listing && next && <Link className="course-button filled" href={pathLinks.lesson(next.id)}>Davom ettirish <ArrowRight size={16} aria-hidden="true" /></Link>}
    </div>
    {listing ? <div className="course-section-top">
      <div className="course-filters" role="group" aria-label="Dars holati">
        {filters.map(([id, name]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{name}</button>)}
      </div>
      <small><Layers3 size={16} aria-hidden="true" />{course.length} birlik · {lessons.length} dars</small>
    </div> : <>
      <div className="course-dashboard">
        <section className="course-panel course-current">
          <div className="course-tagline">{next ? 'Joriy dars' : 'Kurs yakunlandi'}{unit && <span> · {unit.title}</span>}</div>
          <h2>{next?.title ?? 'O‘rganganlaringizni mustahkamlang'}</h2>
          <p>{next?.rule ?? 'O‘tilgan darslarni oching yoki so‘zlarni qayta tahlil qiling.'}</p>
          {next && <div className="course-current-meta"><span className="course-chip"><BookOpen size={14} aria-hidden="true" />{taughtWords.get(next.id)?.length ?? 0} yangi so‘z va ibora</span></div>}
          <div className="course-progress-label"><span>Umumiy progress</span><span>{percent}% · {done}/{required.length} dars</span></div>
          <progress value={done} max={required.length || 1} aria-label="Kursning umumiy progressi" />
          <div className="course-actions">
            {next && <Link className="course-button filled" href={pathLinks.lesson(next.id)}>Darsni ochish <ArrowRight size={16} aria-hidden="true" /></Link>}
            <Link className="course-button" href={pathLinks.lab}><Sparkles size={16} aria-hidden="true" /> So‘z laboratoriyasi</Link>
          </div>
        </section>
        <section className="course-panel course-progress-panel" aria-label="O‘quv natijalari">
          <div className="course-progress-summary">
            <div className="course-ring"><svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="43" /><circle cx="50" cy="50" r="43" pathLength="100" strokeDasharray={percent + ' 100'} />
            </svg><div><strong>{percent}%</strong><small>yo‘l bosildi</small></div></div>
            <dl>
              <div><dt><Trophy size={16} aria-hidden="true" />Bajarilgan</dt><dd>{done} dars</dd></div>
              <div><dt><LockKeyhole size={16} aria-hidden="true" />Qolgan</dt><dd>{required.length - done} dars</dd></div>
              {streak !== undefined && <div><dt><Flame size={16} aria-hidden="true" />Seriya</dt><dd>{streak} kun</dd></div>}
            </dl>
          </div>
          {goal && <div className="course-target"><strong><Target size={15} aria-hidden="true" /> Maqsad · {goal} daraja</strong>
            <p>Joriy darajadagi darslar tugagach, navbatdagi daraja ochiladi.</p></div>}
        </section>
      </div>
      <section className="course-panel course-ladder">
        <div className="course-section-top"><h2>Daraja zinapoyasi</h2><small>A1 dan C2 gacha</small></div>
        <div className="course-levels" role="group" aria-label="Birliklarni daraja bo‘yicha ko‘rish">
          {levels.map((level, index) => {
            const state = level === progress.activeLevel ? 'Joriy' : index > levels.indexOf(progress.unlockedLevel) ? 'Qulflangan'
              : course[index].lessons.every((lesson) => progress.completed.includes(lesson.id)) ? 'Bajarilgan' : 'Takrorlash';
            return <button key={level} type="button" aria-pressed={selectedLevel === level} data-current={state === 'Joriy'}
              onClick={() => setSelectedLevel(selectedLevel === level ? undefined : level)}>
              <strong>{level}</strong><span>{levelNames[level]}</span><small>{state}</small>
            </button>;
          })}
        </div>
        <p>Darajani bosib, unga tegishli darslar ro‘yxatini ko‘ring.</p>
      </section>
      <div className="course-section-top"><h2>Birliklar va darslar</h2>
        {selectedLevel && <button className="course-button" type="button" onClick={() => setSelectedLevel(undefined)}>Barcha darajalar</button>}
      </div>
    </>}
    <UnitList progress={progress} filter={listing ? filter : 'all'} selectedLevel={listing ? undefined : selectedLevel} showDescription={!listing} />
  </>;
}
