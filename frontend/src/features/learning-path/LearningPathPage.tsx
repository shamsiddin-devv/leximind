import { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Compass, Flame, LockKeyhole, Map, Play, Search, Sparkles } from 'lucide-react';
import { Link, routes } from '../../app/router';
import { Notice, Speak } from '../../shared/components/UI';
import type { Level } from '../../shared/types/api';
import { course, lessons, type Sentence, type CourseLesson } from './course';
import { LessonPractice } from './LessonPractice';
import { courseState, progressKey, readProgress } from './progress';
import { findWord, words, wordsById, type Word } from './words';
import './learning-path.css';

const root = routes.learningPath;
const lab = root + '/word';
const lessonUrl = (id: string) => root + '/lesson/' + id;
const wordUrl = (id: string, lessonId?: string) => lab + '/' + id + (lessonId ? '?lesson=' + encodeURIComponent(lessonId) : '');

function Back({ href, children }: { href: string; children: string }) {
  return <Link className="path-back" href={href}><ArrowLeft size={16} aria-hidden="true" />{children}</Link>;
}

function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  return <progress className="path-progress" value={value} max={max} aria-label={label} />;
}

function InteractiveSentence({ text, lessonId }: { text: string; lessonId?: string }) {
  return <span className="path-example-text" lang="en">{text.split(/([A-Za-z]+(?:['’][A-Za-z]+)*)/g).map((part, index) => {
    const entry = findWord(part);
    return entry ? <Link key={index} href={wordUrl(entry.id, lessonId)} aria-label={part + ' so‘zining tahlili'}>{part}</Link> : part;
  })}</span>;
}

function Overview({ level, streak, completed }: { level: Level; streak?: number; completed: string[] }) {
  const { next, required, isOpen } = courseState(level, completed);
  const [browseLevel, setBrowseLevel] = useState<Level>();
  const shownLevel = browseLevel ?? next?.level ?? level;
  const unit = course.find((item) => item.level === shownLevel) ?? course[0];
  const progress = required.filter((lesson) => completed.includes(lesson.id)).length;
  const percent = Math.round(progress / required.length * 100);

  return <>
    <header className="path-heading">
      <div className="path-kicker"><Map size={15} aria-hidden="true" /> Ingliz tili</div>
      <h1 lang="en">Learning <em>Path</em></h1>
      <p>Oddiy suhbatdan ravon ifodagacha. Har darsda yangi qoida, misollar va mashqlar.</p>
    </header>
    <div className="path-summary">
      <div className="path-card path-summary-item"><span className="path-icon"><Compass size={18} aria-hidden="true" /></span><div><p>Boshlang‘ich CEFR darajangiz</p><strong>{level}</strong></div></div>
      <div className="path-card path-summary-item"><span className="path-icon"><Check size={18} aria-hidden="true" /></span><div><p>Kurs bo‘yicha natija</p><strong>{progress} / {required.length} dars</strong><Progress value={progress} max={required.length} label="Boshlang‘ich darajadan boshlab yakunlangan darslar" /></div><span className="path-percent">{percent}%</span></div>
      <div className="path-card path-summary-item"><span className="path-icon path-warm"><Flame size={18} aria-hidden="true" /></span><div><p>O‘quv faolligi seriyasi</p><strong>{streak === undefined ? '—' : streak + ' kun'}</strong></div></div>
    </div>
    <div className="path-overview-grid">
      <div className="path-column">
        <section className="path-card path-feature">
          <div>
            <div className="path-kicker"><BookOpen size={15} aria-hidden="true" /> {next ? next.level + ' · Navbatdagi dars' : 'Kurs yakunlandi'}</div>
            <h2>{next?.title ?? 'O‘rganganlaringizni mustahkamlang'}</h2>
            <p>{next ? 'Misollarni tahlil qiling va uchta mashq bilan bilimingizni sinab ko‘ring.' : 'O‘tgan darslaringizni qayta oching yoki o‘yinlar orqali mashq qiling.'}</p>
            <Link className="button primary" href={next ? lessonUrl(next.id) : routes.games}><Play size={16} aria-hidden="true" />{next ? 'Darsni boshlash' : 'O‘yinlarni ochish'}</Link>
          </div>
          <div className="path-feature-art" aria-hidden="true"><BookOpen /><Sparkles /><i /></div>
        </section>
        <section className="path-card path-unit" aria-labelledby="path-unit-title">
          <header><span className="path-pill">{unit.level}</span><h2 id="path-unit-title">{unit.title}</h2><p>{unit.description}</p></header>
          <ol>
            {unit.lessons.map((item, index) => {
              const lesson = { ...item, level: unit.level };
              const done = completed.includes(item.id);
              const open = isOpen(lesson);
              const current = next?.id === item.id;
              const label = done ? 'Yakunlangan' : current ? 'Navbatdagi' : open ? 'Takrorlash' : 'Qulflangan';
              const Icon = done ? Check : open ? Play : LockKeyhole;
              const content = <><span className="path-step-number">{index + 1}</span><span className="path-row-title">{item.title}<small>{label}</small></span><Icon size={17} aria-hidden="true" /></>;
              return <li key={item.id} data-state={done ? 'done' : current ? 'current' : open ? 'open' : 'locked'}>
                {open ? <Link className="path-unit-row" href={lessonUrl(item.id)}>{content}</Link> : <div className="path-unit-row">{content}</div>}
              </li>;
            })}
          </ol>
        </section>
      </div>
      <aside className="path-column" aria-label="Kurs yo‘nalishlari">
        <section className="path-card path-levels">
          <h2>CEFR yo‘li</h2><p>Har darajada ikkita dars bor.</p>
          <ul>{course.map((item) => {
            const count = item.lessons.filter((lesson) => completed.includes(lesson.id)).length;
            const locked = item.lessons.every((lesson) => !isOpen({ ...lesson, level: item.level }));
            return <li key={item.level}><button type="button" aria-pressed={shownLevel === item.level} onClick={() => setBrowseLevel(item.level)}>
              <span className="path-pill">{item.level}</span><span>{item.title}<small>{locked ? 'Qulflangan' : count + ' / ' + item.lessons.length + ' dars'}</small></span>
              {count === item.lessons.length ? <Check size={15} aria-hidden="true" /> : locked ? <LockKeyhole size={14} aria-hidden="true" /> : <ChevronRight size={15} aria-hidden="true" />}
            </button></li>;
          })}</ul>
        </section>
        <section className="path-card path-lab-promo">
          <span className="path-icon"><Sparkles size={18} aria-hidden="true" /></span>
          <h2>Word Lab</h2><p>So‘zning o‘zagi, o‘zgarishi va gapdagi vazifasini ko‘ring.</p>
          <Link href={lab}>So‘zlarni tahlil qilish <ArrowRight size={15} aria-hidden="true" /></Link>
        </section>
      </aside>
    </div>
  </>;
}

function WordLab() {
  const [search, setSearch] = useState('');
  const input = search.trim().toLowerCase().replaceAll('’', "'");
  const results = words.filter((entry) => [entry.original, entry.translation, ...entry.aliases ?? []].some((text) =>
    text.toLowerCase().replaceAll('’', "'").includes(input)));
  return <>
    <Back href={root}>Learning Path</Back>
    <header className="path-heading"><h1>Word Lab</h1><p>Kursdagi so‘z va iboralarni tahlil qiling.</p></header>
    <label className="path-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="So‘z yoki tarjimani qidirish" placeholder="So‘z yoki tarjimani qidiring" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    <p className="path-result-count" role="status">{results.length} ta natija</p>
    <div className="path-word-grid">{results.map((entry) => <Link className="path-card path-word-tile" key={entry.id} href={wordUrl(entry.id)}>
      <span><strong lang={entry.language ?? 'en'}>{entry.original}</strong><small>{entry.translation}</small></span>
      <ChevronRight size={17} aria-hidden="true" />
    </Link>)}</div>
  </>;
}

function ChangedForm({ text, change }: { text: string; change?: string }) {
  const index = change ? text.lastIndexOf(change) : -1;
  if (!change || index < 0) return text;
  return <>{text.slice(0, index)}<mark>{change}</mark>{text.slice(index + change.length)}</>;
}

function WordDetail({ entry }: { entry: Word }) {
  const returnId = new URLSearchParams(location.search).get('lesson');
  const fromLesson = lessons.find((lesson) => lesson.id === returnId);
  const hasForms = Boolean(entry.forms?.length || entry.contractions?.length);
  return <>
    <Back href={fromLesson ? lessonUrl(fromLesson.id) : lab}>{fromLesson ? 'Darsga qaytish' : 'Word Lab'}</Back>
    <header className="path-heading">
      <div className="path-kicker">{entry.role}</div>
      <div className="path-title-with-audio"><h1 lang={entry.language ?? 'en'}>{entry.original}</h1><Speak text={entry.original} language={entry.language} /></div>
      <p>{entry.translation}</p>
    </header>
    <div className="path-word-detail">
      <section className="path-card path-content">
        <h2>Ma’nosi va vazifasi</h2><p>{entry.explanation}</p>
        {entry.stem && <dl className="path-stem"><dt>O‘zak <small>So‘zning asosiy ma’nosini saqlaydigan qism</small></dt><dd lang={entry.language ?? 'en'}>{entry.stem}</dd></dl>}
        <h3>Gap ichida</h3>
        <div className="path-example">
          <div>{entry.language ? <span lang={entry.language}>{entry.example[0]}</span> : <InteractiveSentence text={entry.example[0]} lessonId={fromLesson?.id} />}<p>{entry.example[1]}</p></div>
          <Speak text={entry.example[0]} language={entry.language} label="Misolni tinglash" />
        </div>
        {entry.forms && <><h3>Shakllar qanday o‘zgaradi?</h3><ul className="path-forms">{entry.forms.map((item) => <li key={item.text}>
          <strong lang={entry.language ?? 'en'}><ChangedForm text={item.text} change={item.change} /></strong><p>{item.explanation}</p>
        </li>)}</ul></>}
      </section>
      {entry.contractions && <section className="path-card path-content path-contractions">
        <h2>To‘liq va qisqa shakllar</h2><p>Qisqartmada apostrof tushirilgan harflar o‘rnini bildiradi.</p>
        <ul className="path-forms">{entry.contractions.map((item) => <li key={item.short}><strong lang="en">{item.full} <ArrowRight size={14} aria-hidden="true" /> <mark>{item.short}</mark></strong><p>{item.use}</p></li>)}</ul>
      </section>}
      {!hasForms && <section className="path-card path-content path-contractions"><h2>Keyingi so‘z</h2><Link className="path-back" href={lab}>Word Lab lug‘atiga o‘tish <ArrowRight size={16} aria-hidden="true" /></Link></section>}
    </div>
  </>;
}

function LessonExample({ example, lessonId }: { example: Sentence; lessonId: string }) {
  return <li className="path-example"><div><InteractiveSentence text={example[0]} lessonId={lessonId} /><p>{example[1]}</p></div><Speak text={example[0]} label="Gap talaffuzini tinglash" /></li>;
}

function LessonView({ lesson, completed, level, replay, onComplete }: {
  lesson: CourseLesson; completed: string[]; level: Level; replay: boolean; onComplete: (id: string) => void;
}) {
  const [stage, setStage] = useState<'study' | 'practice' | 'complete'>(replay ? 'practice' : 'study');
  const next = courseState(level, completed).next;

  function moveTo(newStage: typeof stage) {
    setStage(newStage);
    requestAnimationFrame(() => {
      document.getElementById('path-stage-title')?.focus();
    });
  }

  return <>
    <Back href={root}>Learning Path</Back>
    {stage === 'complete' ? <section className="path-card path-completion">
      <span className="path-success-icon"><Check size={32} aria-hidden="true" /></span>
      <h1 id="path-stage-title" tabIndex={-1}>Dars yakunlandi!</h1>
      <p>{lesson.title}. Uchala mashqni to‘g‘ri bajardingiz.</p>
      <div className="path-actions">
        <Link className="button secondary" href={root}>Yo‘l xaritasi</Link>
        {next ? <Link className="button primary" href={lessonUrl(next.id)}>Navbatdagi dars <ArrowRight size={16} aria-hidden="true" /></Link>
          : <Link className="button primary" href={routes.games}>O‘yinlarda mashq qilish <ArrowRight size={16} aria-hidden="true" /></Link>}
      </div>
    </section> : <>
      <header className="path-heading"><div className="path-kicker"><span className="path-pill">{lesson.level}</span>{stage === 'practice' ? 'Mashqlar' : 'Dars'}</div>
        <h1 id="path-stage-title" tabIndex={-1}>{lesson.title}</h1>
      </header>
      {stage === 'practice' ? <LessonPractice lesson={lesson} onBack={() => moveTo('study')} onComplete={() => { onComplete(lesson.id); moveTo('complete'); }} />
        : <div className="path-lesson-grid">
          <div className="path-column">
            <section className="path-card path-content"><h2>Qoida qanday ishlaydi?</h2><p>{lesson.rule}</p><p className="path-takeaway">{lesson.takeaway}</p></section>
            <section className="path-card path-content"><h2>Gaplarni tahlil qiling</h2><p>So‘z ustiga bosib uning ma’nosi va shaklini ko‘ring.</p>
              <ul className="path-sentences">{lesson.examples.map((example) => <LessonExample key={example[0]} example={example} lessonId={lesson.id} />)}</ul>
            </section>
            <section className="path-card path-content path-mistake"><h2>Ko‘p uchraydigan xato</h2>
              <del lang="en">{lesson.mistake[0]}</del><p><InteractiveSentence text={lesson.mistake[1]} lessonId={lesson.id} /></p><p>{lesson.mistake[2]}</p>
            </section>
          </div>
          <aside className="path-column">
            {lesson.expressions && <section className="path-card path-content"><h2>Foydali iboralar</h2>
              <ul className="path-expression-links">{lesson.expressions.map((id) => {
                const entry = wordsById.get(id);
                return entry && <li key={id}><Link href={wordUrl(id, lesson.id)}><span lang="en">{entry.original}</span><ChevronRight size={15} aria-hidden="true" /></Link></li>;
              })}</ul>
            </section>}
            <section className="path-card path-content path-practice-callout"><span className="path-icon"><Play size={18} aria-hidden="true" /></span><h2>Bilimingizni sinang</h2>
              <p>To‘g‘ri shaklni tanlang, gap tuzing va tinglab tarjimasini toping.</p>
              <button type="button" className="button primary" onClick={() => moveTo('practice')}>Mashqlarni boshlash <ArrowRight size={16} aria-hidden="true" /></button>
            </section>
          </aside>
        </div>}
    </>}
  </>;
}

export function LearningPathPage({ userId, path, level, streak, unavailable }: { userId: string; path: string; level?: Level; streak?: number; unavailable: boolean }) {
  const [completed, setCompleted] = useState(() => readProgress(userId));
  const [saveFailed, setSaveFailed] = useState(false);
  const [, section, id, ...extra] = path.slice(root.length).split('/');
  const lesson = section === 'lesson' && !extra.length ? lessons.find((item) => item.id === id) : undefined;
  const entry = section === 'word' && id && !extra.length ? wordsById.get(id) : undefined;

  function complete(lessonId: string) {
    const result = [...new Set([...readProgress(userId), ...completed, lessonId])];
    setCompleted(result);
    try {
      localStorage.setItem(progressKey(userId), JSON.stringify(result));
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
  }

  const replay = Boolean(lesson && completed.includes(lesson.id) && new URLSearchParams(location.search).get('practice') === '1');
  let content;
  if (section === 'word' && !id && !extra.length) content = <WordLab />;
  else if (entry) content = <WordDetail key={entry.id} entry={entry} />;
  else if (!section || lesson) {
    if (!level) content = unavailable ? <Back href={lab}>Word Lab’ni ochish</Back> : <p role="status">CEFR darajangiz yuklanmoqda…</p>;
    else if (!lesson) content = <Overview level={level} streak={streak} completed={completed} />;
    else if (courseState(level, completed).isOpen(lesson)) content = <LessonView key={lesson.id + String(replay)} lesson={lesson} completed={completed} level={level} replay={replay} onComplete={complete} />;
    else content = <><Back href={root}>Learning Path</Back><header className="path-heading"><h1>Dars qulflangan</h1><p>Bu dars ochilishi uchun navbatdagi darsni yakunlang.</p></header></>;
  } else content = <><Back href={root}>Learning Path</Back><header className="path-heading"><h1>Sahifa topilmadi</h1><p>Yo‘l xaritasidan dars yoki Word Lab’ni tanlang.</p></header></>;

  return <div className="container screen inner-screen learning-path">
    {saveFailed && <Notice error>Brauzer dars natijasini saqlay olmadi. Natija shu ochiq sahifada ko‘rinadi.</Notice>}
    {content}
  </div>;
}
