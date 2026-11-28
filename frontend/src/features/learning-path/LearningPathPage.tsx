import { useId, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Layers3, Sparkles, Target } from 'lucide-react';
import { Link, routes } from '../../app/router';
import { Notice, Speak } from '../../shared/components/UI';
import { course, lessons, type Sentence, type CourseLesson } from './course';
import { CourseNavigation, CourseOverview } from './CourseOverview';
import { LessonPractice } from './LessonPractice';
import { taughtWords, wordTokens } from './lessonVocabulary';
import { pathLinks } from './pathLinks';
import { courseState } from './progress';
import { type CourseProgress, type useCourseProgress } from './useCourseProgress';
import { WordLab } from './WordLab';
import { findWord, wordsById } from './words';
import './learning-path.css';

const tabs = ['Kirish', 'Lug‘at', 'Grammatika', 'So‘z tahlili', 'Mashqlar'] as const;
const descriptions = ['Talaffuz va ma’no', 'Qoidalar sodda tilda', 'O‘zak, qo‘shimcha va shakllar', '3 ta interaktiv mashq'] as const;

function InteractiveSentence({ text, lessonId }: { text: string; lessonId: string }) {
  return <span className="path-example-text" lang="en">{text.split(wordTokens).map((part, index) => {
    const entry = findWord(part);
    return entry ? <Link key={index} href={pathLinks.word(entry.id, lessonId)} aria-label={part + ' so‘zining tahlili'}>{part}</Link> : part;
  })}</span>;
}

function Examples({ examples, lessonId }: { examples: readonly Sentence[]; lessonId: string }) {
  return <ul className="analysis-examples">{examples.map(([text, meaning]) => <li key={text}>
    <div><strong><InteractiveSentence text={text} lessonId={lessonId} /></strong><p>{meaning}</p></div>
    <Speak text={text} label="Gap talaffuzini tinglash" />
  </li>)}</ul>;
}

function LessonView({ lesson, progress, replay, complete }: {
  lesson: CourseLesson; progress: CourseProgress; replay: boolean; complete: (id: string) => Promise<boolean>;
}) {
  const id = useId();
  const [tab, setTab] = useState(replay ? 4 : 0);
  const [practiceVisited, setPracticeVisited] = useState(replay);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const unit = course.find((item) => item.level === lesson.level);
  const fresh = taughtWords.get(lesson.id) ?? [];
  const analyses = new Set([...fresh.map((word) => word.id), ...lesson.expressions ?? []]);
  const done = progress.completed.includes(lesson.id);
  const openStatus = done ? 'Bajarilgan' : lesson.id === progress.nextLessonId ? 'Joriy dars' : 'Takrorlash';

  function changeTab(index: number) {
    setTab(index);
    if (index === 4) setPracticeVisited(true);
  }

  function tabKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const target = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (target === null) return;
    event.preventDefault();
    changeTab(target);
    document.getElementById(id + '-tab-' + target)?.focus();
  }

  async function finish() {
    if (saving) return;
    setSaving(true);
    const success = await complete(lesson.id);
    setSaving(false);
    if (!success) return;
    setFinished(true);
    requestAnimationFrame(() => document.getElementById(id + '-finished')?.focus());
  }

  return <>
    <Link className="course-back" href={pathLinks.lessons}><ArrowLeft size={16} aria-hidden="true" /> Darslar</Link>
    {finished ? <section className="course-panel path-completion">
      <span className="path-success-icon"><Check size={32} aria-hidden="true" /></span>
      <h1 id={id + '-finished'} tabIndex={-1}>Dars yakunlandi!</h1>
      <p>Uchala mashqni to‘g‘ri bajardingiz. Yangi so‘zlarni lug‘atda qayta ko‘rishingiz mumkin.</p>
      <div className="course-actions">
        <Link className="course-button" href={routes.vocabulary + '?level=all&from=lesson'}>Dars so‘zlarini ko‘rish</Link>
        {progress.nextLessonId ? <Link className="course-button filled" href={pathLinks.lesson(progress.nextLessonId)}>Navbatdagi dars <ArrowRight size={16} aria-hidden="true" /></Link>
          : <Link className="course-button filled" href={pathLinks.root}>O‘quv yo‘li</Link>}
      </div>
    </section> : <>
      <header className="course-heading">
        <div className="course-heading-meta"><span className="course-pill">{lesson.level}</span><small>{unit?.title}</small><span className="course-chip">{openStatus}</span></div>
        <h1>{lesson.title}</h1>
        <p>{unit?.description}</p>
        <small className="course-lesson-meta"><BookOpen size={15} aria-hidden="true" />{fresh.length} yangi so‘z va ibora</small>
      </header>
      <div className="course-panel course-lesson-tabs" role="tablist" aria-label="Dars mazmuni">
        {tabs.map((label, index) => <button key={label} id={id + '-tab-' + index} role="tab" type="button" aria-selected={tab === index}
          aria-controls={id + '-panel-' + index} tabIndex={tab === index ? 0 : -1}
          onClick={() => changeTab(index)} onKeyDown={(event) => tabKeys(event, index)}>{label}</button>)}
      </div>
      {tabs.map((label, index) => <div key={label} className="course-lesson-panel" id={id + '-panel-' + index}
        role="tabpanel" aria-labelledby={id + '-tab-' + index} tabIndex={0} hidden={tab !== index}>
        {index === 0 && tab === index && <>
          <div className="course-lesson-intro">
            <section className="course-panel analysis-section">
              <h2><Target size={17} aria-hidden="true" /> Bu darsda nimalarni o‘rganasiz</h2>
              <ul className="course-objectives">
                <li><Check size={16} aria-hidden="true" />{lesson.takeaway}</li>
                <li><Check size={16} aria-hidden="true" />Gaplardagi yangi so‘zlarni tahlil qilasiz.</li>
                <li><Check size={16} aria-hidden="true" />Gap tuzish va tarjima mashqlarini bajarasiz.</li>
              </ul>
              <button className="course-button filled" type="button" onClick={() => changeTab(1)}>Lug‘atdan boshlash <ArrowRight size={16} aria-hidden="true" /></button>
            </section>
            <section className="course-panel analysis-section"><h2><Layers3 size={17} aria-hidden="true" /> Dars tarkibi</h2>
              <ol className="course-lesson-outline">{descriptions.map((description, position) => <li key={description}>
                <button type="button" onClick={() => changeTab(position + 1)}><span className="course-pill">{position + 1}</span>
                  <span><strong>{tabs[position + 1]}</strong><small>{description}</small></span><ArrowRight size={16} aria-hidden="true" /></button>
              </li>)}</ol>
            </section>
          </div>
          <div className="course-panel analysis-section">
            <div className="course-section-top"><h2>Dars so‘zlari</h2><small>So‘zni bosib, tahlilni ko‘ring</small></div>
            <div className="course-lesson-words">{fresh.map((word) => <Link key={word.id} href={pathLinks.word(word.id, lesson.id)}>
              <span><strong lang="en">{word.original}</strong><small>{word.translation}</small></span><Sparkles size={16} aria-hidden="true" />
            </Link>)}</div>
          </div>
        </>}
        {index === 1 && tab === index && <section className="course-panel analysis-section">
          <h2>Misollar va talaffuz</h2><Examples examples={lesson.examples} lessonId={lesson.id} />
          <div className="course-actions"><button className="course-button filled" type="button" onClick={() => changeTab(2)}>Grammatikaga o‘tish <ArrowRight size={16} aria-hidden="true" /></button></div>
        </section>}
        {index === 2 && tab === index && <>
          <section className="course-panel analysis-section"><h2>Qoida qanday ishlaydi?</h2><p>{lesson.rule}</p><p className="analysis-note">{lesson.takeaway}</p></section>
          <section className="course-panel analysis-section"><h2>Ko‘p uchraydigan xato</h2>
            <del lang="en">{lesson.mistake[0]}</del><p><InteractiveSentence text={lesson.mistake[1]} lessonId={lesson.id} /></p><p>{lesson.mistake[2]}</p>
          </section>
        </>}
        {index === 3 && tab === index && <section className="course-panel analysis-section">
          <h2>So‘z va iboralar</h2><p>Qo‘shimcha yoki birikmaning vazifasini ko‘rish uchun so‘zni oching.</p>
          <div className="course-lesson-words">{[...analyses].map((wordId) => {
            const word = wordsById.get(wordId);
            return word && <Link key={wordId} href={pathLinks.word(wordId, lesson.id)}><span><strong lang="en">{word.original}</strong><small>{word.role}</small></span><Sparkles size={16} aria-hidden="true" /></Link>;
          })}</div>
          <Examples examples={lesson.examples} lessonId={lesson.id} />
        </section>}
        {index === 4 && practiceVisited && <LessonPractice lesson={lesson} onBack={() => changeTab(0)} onComplete={() => void finish()} saving={saving} />}
      </div>)}
    </>}
  </>;
}

export function LearningPathPage({ path, course: state, streak }: { path: string; course: ReturnType<typeof useCourseProgress>; streak?: number }) {
  const [, section, id, ...extra] = path.slice(pathLinks.root.length).split('/');
  const lesson = section === 'lesson' && !extra.length ? lessons.find((item) => item.id === id) : undefined;
  const word = section === 'word' && id && !extra.length ? wordsById.get(id) : undefined;
  const { progress, error, retry, complete } = state;
  let content;
  if ((section === 'word' && !id) || word) content = progress ? <WordLab entry={word} unlockedLevel={progress.unlockedLevel} />
    : <><CourseNavigation active="lab" />{!error && <p role="status">So‘z laboratoriyasi yuklanmoqda…</p>}</>;
  else if (section && !lesson && !(section === 'lessons' && !id)) content = <><CourseNavigation active="overview" /><h1>Sahifa topilmadi</h1></>;
  else if (!progress) content = <><CourseNavigation active={section === 'lessons' || lesson ? 'lessons' : 'overview'} />
    {!error && <p role="status">O‘quv yo‘li yuklanmoqda…</p>}</>;
  else if (!lesson) content = <CourseOverview key={section ?? 'overview'} progress={progress} listing={section === 'lessons'} streak={streak} />;
  else if (courseState(progress.startLevel, progress.completed).isOpen(lesson)) {
    const replay = progress.completed.includes(lesson.id) && new URLSearchParams(location.search).get('practice') === '1';
    content = <LessonView key={lesson.id + String(replay)} lesson={lesson} progress={progress} replay={replay} complete={complete} />;
  } else content = <><CourseNavigation active="lessons" /><h1>Dars qulflangan</h1><p>Bu dars ochilishi uchun navbatdagi darsni yakunlang.</p></>;

  return <div className="container screen inner-screen course-workspace learning-path">
    {error && <div className="notice-stack"><Notice error>{error}</Notice>
      {!progress && <button type="button" className="course-button" onClick={retry}>Qayta urinish</button>}</div>}
    {content}
  </div>;
}
