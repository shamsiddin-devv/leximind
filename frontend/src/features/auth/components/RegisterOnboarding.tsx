import { useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Flag, Flame, Globe, Languages, Leaf, Rocket, RotateCcw, Send, X, Zap, type LucideIcon } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import type { LearningPreferences } from '../../../shared/types/api';

export type RegistrationPreferences = Pick<LearningPreferences, 'dailyStudyMinutes' | 'dailyNewWords'> & {
  studyLevel: NonNullable<LearningPreferences['studyLevel']>;
};

const courses: { name: string; icon?: LucideIcon }[] = [
  { name: 'Ingliz tili' }, { name: 'Koreys tili', icon: Languages }, { name: 'Rus tili', icon: BookOpen },
  { name: 'Turk tili', icon: Globe }, { name: 'Nemis tili', icon: Flag }, { name: 'Yapon tili', icon: Languages },
];
const goals = [
  { minutes: 5, name: 'Yengil', icon: Leaf }, { minutes: 10, name: 'Muntazam', icon: Zap },
  { minutes: 15, name: 'Jiddiy', icon: Flame }, { minutes: 20, name: 'Intensiv', icon: Rocket },
];
const questions = [
  { level: 'A1', prompt: 'She ___ a student at the university.', choices: ['is', 'are', 'am', 'be'], answer: 0 },
  { level: 'A1', prompt: 'I ___ coffee every morning before work.', choices: ['drinks', 'drink', 'drinking', 'drank'], answer: 1 },
  { level: 'A2', prompt: 'They ___ to the cinema yesterday evening.', choices: ['go', 'gone', 'went', 'going'], answer: 2 },
  { level: 'B1', prompt: 'If I ___ more free time, I would travel around Asia.', choices: ['have', 'had', 'will have', 'having'], answer: 1 },
  { level: 'B2', prompt: 'The report ___ by the manager before the meeting started.', choices: ['reviewed', 'was reviewed', 'has review', 'reviewing'], answer: 1 },
  { level: 'C1', prompt: 'Hardly ___ the room when the phone rang.', choices: ['he had entered', 'had he entered', 'did he entered', 'he entered'], answer: 1 },
];
const placements: { level: RegistrationPreferences['studyLevel']; title: string; words: number }[] = [
  { level: 'A1', title: 'Boshlang‘ich daraja', words: 5 },
  { level: 'A2', title: 'Elementar daraja', words: 8 },
  { level: 'B1', title: 'O‘rta daraja', words: 10 },
  { level: 'B2', title: 'O‘rta yuqori daraja', words: 12 },
  { level: 'C1', title: 'Ilg‘or daraja', words: 15 },
];
const headings = [
  ['Qaysi tilni o‘rganmoqchisiz?', 'Boshlash uchun o‘rganmoqchi bo‘lgan tilingizni tanlang.'],
  ['Kuniga qancha vaqt ajratasiz?', 'Kichik maqsad uzoq davom etadi. Keyin o‘zgartirishingiz mumkin.'],
  ['Darajangizni aniqlaymiz', '6 ta qisqa savol boshlang‘ich darajangizni taxmin qilishga yordam beradi.'],
  ['Natijangiz tayyor', 'Tavsiya etilgan darajadan boshlab o‘rganishingiz mumkin.'],
  ['Hisobingizni yarating', 'Ism, email va parol — shu uchta ma’lumot kerak.'],
];

export function RegisterOnboarding({ renderForm, busy, referred }: { renderForm: (preferences: RegistrationPreferences) => ReactNode; busy: boolean; referred: boolean }) {
  const [step, setStep] = useState(1);
  const [english, setEnglish] = useState(false);
  const [minutes, setMinutes] = useState(10);
  const [answers, setAnswers] = useState<number[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const question = questions[questionIndex];
  const selected = answers[questionIndex];
  const score = answers.filter((answer, index) => questions[index].answer === answer).length;
  const placement = placements[Math.max(0, score - 2)];

  function changeStep(next: number) {
    setStep(next);
    window.scrollTo(0, 0);
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }

  function restartTest() {
    setAnswers([]);
    setQuestionIndex(0);
    changeStep(3);
  }

  function goBack() {
    if (step === 3 && questionIndex > 0) changeQuestion(questionIndex - 1);
    else changeStep(step - 1);
  }

  function changeQuestion(next: number) {
    setQuestionIndex(next);
    requestAnimationFrame(() => questionHeading.current?.focus());
  }

  function nextQuestion() {
    if (questionIndex < questions.length - 1) changeQuestion(questionIndex + 1);
    else changeStep(4);
  }

  return <div className="welcome-site welcome-registration">
    <header className="welcome-register-header">
      <div className="welcome-register-track">
        {step === 1 ? <Link className="welcome-back-circle" href={routes.login} aria-label="Kirish sahifasiga"><ArrowLeft size={15} /></Link>
          : <button type="button" className="welcome-back-circle" onClick={goBack} disabled={busy} aria-label="Orqaga"><ArrowLeft size={15} /></button>}
        <div className="welcome-step-track" role="progressbar" aria-label="Ro‘yxatdan o‘tish bosqichi" aria-valuemin={0} aria-valuemax={5} aria-valuenow={step}>
          {headings.map(([title], index) => <span key={title} data-reached={index < step || undefined} />)}
        </div>
        <span>{step} / 5</span><Link className="welcome-register-exit" href={routes.home} aria-label="Chiqish"><X size={17} /></Link>
      </div>
    </header>
    <main className="welcome-register-main" id="main" tabIndex={-1}>
      <div className="welcome-register-heading">
        {referred && (step === 1 || step === 5) && <p className="welcome-referral-note"><Send size={15} aria-hidden="true" /> LexiMind’ga taklif orqali keldingiz</p>}
        <div className="welcome-eyebrow">{step}-qadam</div><h1 id="welcome-register-title" ref={heading} tabIndex={-1}>{headings[step - 1][0]}</h1><p>{headings[step - 1][1]}</p>
      </div>
      {step === 1 && <>
        <div className="welcome-options" role="group" aria-label="O‘rganiladigan til">
          {courses.map(({ name, icon: Icon }, index) => <button key={name} type="button" disabled={index !== 0}
            aria-pressed={index === 0 && english} onClick={() => setEnglish(true)}>
            <span className="welcome-tile-icon">{Icon ? <Icon size={18} /> : 'En'}</span>
            <span><strong>{name}</strong><small>{index === 0 ? 'O‘rganish mumkin' : 'Hozircha mavjud emas'}</small></span>
            {index === 0 && english && <Check size={17} className="welcome-option-check" />}
          </button>)}
        </div>
        <div className="welcome-register-actions"><small>LexiMind’da hozir ingliz tilini o‘rganish mumkin.</small>
          <button className="welcome-button welcome-primary" type="button" disabled={!english} onClick={() => changeStep(2)}>Davom etish <ArrowRight size={16} /></button>
        </div>
      </>}
      {step === 2 && <>
        <div className="welcome-options" role="group" aria-label="Kunlik maqsad">
          {goals.map(({ minutes: value, name, icon: Icon }) => <button key={value} type="button" aria-pressed={minutes === value} onClick={() => setMinutes(value)}>
            <span className="welcome-tile-icon"><Icon size={18} /></span><span><strong>{name}</strong><small>Kuniga {value} daqiqa</small></span>
            {minutes === value && <Check size={17} className="welcome-option-check" />}
          </button>)}
        </div>
        <div className="welcome-register-actions"><small>Maqsadni keyin sozlamalarda o‘zgartirish mumkin.</small>
          <button className="welcome-button welcome-primary" type="button" onClick={() => changeStep(3)}>Daraja testiga o‘tish <ArrowRight size={16} /></button>
        </div>
      </>}
      {step === 3 && <div key={questionIndex}>
        <div className="welcome-question-meta"><span>Savol <strong>{questionIndex + 1} / {questions.length}</strong></span><span>{question.level} daraja</span></div>
        <progress className="welcome-question-progress" value={questionIndex + 1} max={questions.length} aria-label="Savollar bo‘yicha holat" />
        <section className="welcome-question" aria-labelledby="welcome-question">
          <h2 id="welcome-question" lang="en" tabIndex={-1} ref={questionHeading}>{question.prompt}</h2>
          <div className="welcome-answers" role="group" aria-label="Javob variantlari">
            {question.choices.map((choice, index) => <button key={choice} type="button" lang="en" disabled={selected !== undefined}
              data-feedback={selected === undefined ? undefined : index === question.answer ? 'correct' : selected === index ? 'wrong' : undefined}
              onClick={() => setAnswers(previous => [...previous, index])}>{choice}{selected !== undefined && index === question.answer && <Check size={16} />}</button>)}
          </div>
          {selected !== undefined && <p className="welcome-answer-feedback" role="status">{selected === question.answer ? 'To‘g‘ri javob.' : 'To‘g‘ri javob — ' + question.choices[question.answer] + '.'}</p>}
        </section>
        <div className="welcome-register-actions"><small>Test 6 ta savoldan iborat, vaqt chegarasi yo‘q.</small>
          <button className="welcome-button welcome-primary" type="button" disabled={selected === undefined} onClick={nextQuestion}>
            {questionIndex === questions.length - 1 ? 'Natijani ko‘rish' : 'Keyingi savol'} <ArrowRight size={16} />
          </button>
        </div>
      </div>}
      {step === 4 && <>
        <section className="welcome-placement">
          <div className="welcome-placement-top"><div className="welcome-placement-ring"><strong>{placement.level}</strong><small>Daraja</small></div>
            <div><span className="welcome-eyebrow">{score} / {questions.length} to‘g‘ri javob</span><h2>{placement.title}</h2>
              <p>Bu qisqa test natijasiga asoslangan tavsiya. Mashq darajasini keyin sozlamalarda o‘zgartirishingiz mumkin.</p></div>
          </div>
          <dl>{[['Til', 'Ingliz tili'], ['Kunlik maqsad', minutes + ' daqiqa'], ['Yangi so‘zlar', placement.words + ' ta yangi so‘z / kun']].map(([label, value]) =>
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>
        <div className="welcome-register-actions"><button className="welcome-button" type="button" onClick={restartTest}><RotateCcw size={15} />Testni qaytadan</button>
          <button className="welcome-button welcome-primary" type="button" onClick={() => changeStep(5)}>Hisob yaratish <ArrowRight size={16} /></button>
        </div>
      </>}
      {step === 5 && renderForm({ dailyStudyMinutes: minutes, dailyNewWords: placement.words, studyLevel: placement.level })}
    </main>
  </div>;
}
