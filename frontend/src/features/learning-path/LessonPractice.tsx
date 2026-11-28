import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Headphones, ListOrdered, RotateCcw, SpellCheck } from 'lucide-react';
import { Speak } from '../../shared/components/UI';
import type { CourseLesson } from './course';

const steps = ['To‘g‘ri shaklni tanlang', 'Gap tuzing', 'Tinglab tarjimasini toping'] as const;
const icons = [SpellCheck, ListOrdered, Headphones];

function shuffleIndices(length: number) {
  const indices = Array.from({ length }, (_, index) => index);
  for (let index = length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[other]] = [indices[other], indices[index]];
  }
  if (indices.every((value, index) => value === index)) indices.push(indices.shift()!);
  return indices;
}

export function LessonPractice({ lesson, onBack, onComplete, saving }: { lesson: CourseLesson; onBack: () => void; onComplete: () => void; saving: boolean }) {
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<number>();
  const [feedback, setFeedback] = useState<'correct' | 'retry'>();
  const [picked, setPicked] = useState<number[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const sentence = lesson.examples[0][0];
  const parts = sentence.split(/\s+/);
  const [order] = useState(() => shuffleIndices(parts.length));
  const [translations] = useState(() => shuffleIndices(lesson.examples.length));
  const Icon = icons[step];
  const options = step === 0 ? [...lesson.question.options] : translations.map((index) => lesson.examples[index][1]);
  const target = step === 0 ? lesson.question.answer : translations.indexOf(1);
  const explanation = step === 0 ? lesson.question.explanation
    : step === 1 ? sentence + ' · ' + lesson.examples[0][1] : lesson.examples[1][0] + ' · ' + lesson.examples[1][1];
  const canCheck = feedback !== 'correct' && (step === 1 ? picked.length === parts.length : choice !== undefined);

  function check() {
    const correct = step === 1
      ? picked.every((index, position) => parts[index].toLowerCase() === parts[position].toLowerCase())
      : choice === target;
    setFeedback(correct ? 'correct' : 'retry');
  }

  function advance() {
    if (step === steps.length - 1) { onComplete(); return; }
    setStep(step + 1);
    setChoice(undefined);
    setFeedback(undefined);
    heading.current?.focus();
  }

  function chooseTile(index: number, spent: boolean) {
    setPicked((previous) => spent ? previous.filter((item) => item !== index) : [...previous, index]);
    setFeedback(undefined);
  }

  return <section className="course-panel analysis-section path-practice" aria-labelledby="path-exercise-heading">
    <div className="path-practice-step"><span className="path-icon"><Icon size={21} aria-hidden="true" /></span><span>Mashq {step + 1} / {steps.length}</span></div>
    <progress className="path-progress" value={step + Number(feedback === 'correct')} max={steps.length} aria-label="Mashqlar natijasi" />
    <h2 id="path-exercise-heading" tabIndex={-1} ref={heading}>{steps[step]}</h2>
    {step === 0 && <p className="path-question" lang="en">{lesson.question.prompt}</p>}
    {step === 1 && <div className="path-build">
      <p>{lesson.examples[0][1]}</p>
      <div className="path-tiles path-built" role="group" aria-label="Tuzilayotgan gap" lang="en">
        {picked.map((index) => <button type="button" key={index} onClick={() => chooseTile(index, true)} disabled={feedback === 'correct'}>{parts[index]}</button>)}
        {!picked.length && <span lang="uz">So‘zlarni pastdan tartib bilan tanlang.</span>}
      </div>
      <div className="path-tiles" role="group" aria-label="Tanlanadigan so‘zlar" lang="en">{order.map((index) =>
        <button type="button" key={index} disabled={picked.includes(index) || feedback === 'correct'} onClick={() => chooseTile(index, false)}>{parts[index]}</button>)}</div>
      <button type="button" className="button quiet" onClick={() => { setPicked([]); setFeedback(undefined); }}
        disabled={!picked.length || feedback === 'correct'}><RotateCcw size={15} aria-hidden="true" /> Qayta tuzish</button>
    </div>}
    {step === 2 && <div className="path-listen">
      <Speak text={lesson.examples[1][0]} label="Mashqdagi gapni tinglash" />
      <button type="button" className="button quiet" aria-expanded={showTranscript} onClick={() => setShowTranscript(!showTranscript)}>
        {showTranscript ? 'Matnni yashirish' : 'Matnni ko‘rsatish'}
      </button>
      {showTranscript && <p lang="en">{lesson.examples[1][0]}</p>}
    </div>}
    {step !== 1 && <div className="path-options" role="group" aria-label="Javob variantlari">
      {options.map((option, index) => <button type="button" key={index} aria-pressed={choice === index} lang={step === 0 ? 'en' : 'uz'}
        disabled={feedback === 'correct'} onClick={() => { setChoice(index); setFeedback(undefined); }}>{option}</button>)}
    </div>}
    <div className="path-feedback" role="status" data-result={feedback}>
      {feedback === 'correct' && <><Check size={17} aria-hidden="true" /><span>{explanation}</span></>}
      {feedback === 'retry' && <span>{step === 0 ? lesson.question.explanation : step === 1
        ? 'So‘z tartibini tekshirib, qayta urinib ko‘ring.' : 'Gapni yana tinglab, boshqa tarjimani sinab ko‘ring.'}</span>}
    </div>
    <div className="path-actions">
      <button type="button" className="course-button" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Darsga qaytish</button>
      {feedback === 'correct' ? <button type="button" className="course-button filled" onClick={advance} disabled={saving}>
        {saving ? 'Saqlanmoqda…' : step === steps.length - 1 ? 'Darsni yakunlash' : 'Keyingi mashq'} <ArrowRight size={16} aria-hidden="true" />
      </button> : <button type="button" className="course-button filled" disabled={!canCheck} onClick={check}>Javobni tekshirish</button>}
    </div>
  </section>;
}
