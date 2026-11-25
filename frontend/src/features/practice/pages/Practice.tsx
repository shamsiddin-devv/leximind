import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleX, Clock3, PartyPopper, Sparkles } from 'lucide-react';
import { api, explain } from '../../../shared/services/api';
import type { Attempt, Result, Round } from '../../../shared/types/api';
import { activities } from '../activities';
import { Notice, Speak } from '../../../shared/components/UI';
import { playFeedbackAudio, repeatedWrongAnswerSound } from '../feedbackAudio';
import { MemoryRound } from '../components/MemoryRound';

export type ActiveRound = Round & { demoAnswers?: string[] };

export function Practice({ round, token, onDone, onClose, soundEnabled, autoplayPronunciation = false }: {
  round: ActiveRound; token?: string; onDone: (result: Result) => void; onClose: () => void; soundEnabled: boolean; autoplayPronunciation?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [tokens, setTokens] = useState<number[]>([]);
  const [assessmentAnswers, setAssessmentAnswers] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Attempt>();
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const stopSound = useRef<(() => void) | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const request = useRef<AbortController | null>(null);
  const question = round.payload.questions?.[index];
  const length = round.payload.questions?.length ?? round.payload.stimulus?.length ?? 0;
  const isAssessment = round.kind === 'assessment';
  const multipleChoice = Boolean(question && !question.input && question.options.length);
  const activity = activities.find((item) => item.id === round.kind);
  const timed = round.kind === 'word_rush' && Boolean(round.expiresAt);
  const expired = timed && seconds === 0;
  const stimulus = round.payload.stimulus;
  const selected = question?.input === 'tokens'
    ? tokens.map((tokenIndex) => question.options[tokenIndex]).join(' ')
    : answer;
  const practiceSteps = Math.max(1, length);

  useEffect(() => () => { request.current?.abort(); stopSound.current?.(); }, []);
  useEffect(() => { if (!soundEnabled) { stopSound.current?.(); stopSound.current = null; } }, [soundEnabled]);
  useEffect(() => {
    if (!timed || !round.expiresAt) return;
    const end = new Date(round.expiresAt).valueOf();
    const update = () => setSeconds(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [timed, round.expiresAt]);
  useEffect(() => {
    if (feedback) nextButton.current?.focus();
    else heading.current?.focus();
  }, [index, feedback, result]);

  function finish(value: Result) { setResult(value); onDone(value); }
  function sound(url?: string) {
    if (!soundEnabled || !url) return;
    stopSound.current?.();
    stopSound.current = playFeedbackAudio(url);
  }
  function advance() {
    if (feedback?.result) { finish(feedback.result); return; }
    if (round.demoAnswers && index + 1 === length) {
      const correctCount = [...assessmentAnswers, feedback?.feedback.correct ? '1' : '0'].filter((x) => x === '1').length;
      finish({ correctCount, totalQuestion: length, score: correctCount * 10 });
      return;
    }
    if (round.demoAnswers) setAssessmentAnswers((current) => [...current, feedback?.feedback.correct ? '1' : '0']);
    stopSound.current?.();
    stopSound.current = null;
    setIndex((n) => n + 1); setFeedback(undefined); setAnswer(''); setTokens([]);
  }
  async function submit(value: string, memoryAnswers?: string[]) {
    if (request.current || busy || feedback || expired) return;
    setError('');
    if (round.demoAnswers) {
      const expectedAnswer = round.demoAnswers[index];
      setFeedback({ expectedAnswer, feedback: { correct: value.trim().toLowerCase() === expectedAnswer.toLowerCase() } });
      return;
    }
    const abort = new AbortController();
    request.current = abort;
    setBusy(true);
    try {
      if (memoryAnswers || isAssessment) {
        const answers = memoryAnswers
          ? Array.from({ length }, (_, position) => memoryAnswers[position] ?? '')
          : [...assessmentAnswers, value];
        if (!memoryAnswers && answers.length < length) {
          setAssessmentAnswers(answers); setIndex(index + 1); setAnswer('');
          return;
        }
        const data = await api<Result & { sound?: { url: string } }>(`/${isAssessment ? 'assessments' : 'games'}/${round.id}/submit`, {
          token, method: 'POST', body: { answers }, signal: abort.signal,
        });
        sound(data.sound?.url); finish(data);
      } else {
        const data = await api<Attempt>(`/games/${round.id}/attempts`, { token, method: 'POST', body: { index, answer: value }, signal: abort.signal });
        sound(data.sound?.url); setFeedback(data);
      }
    } catch (failure) {
      if (!abort.signal.aborted) setError(explain(failure, { 409: 'Mashq muddati tugagan yoki u allaqachon yakunlangan.' }));
    } finally {
      if (request.current === abort) request.current = null;
      if (!abort.signal.aborted) setBusy(false);
    }
  }

  if (result) return <div className={`container screen practice-screen${stimulus ? ' memory-screen' : ''}`}>
    <section className={`panel result-card${stimulus ? ' memory-result' : ''}`}><div className="result-medal"><PartyPopper size={42} /><Sparkles size={20} /></div>
      <h1 ref={heading} tabIndex={-1}>Mashq yakunlandi!</h1>
      <p>{result.correctCount} / {result.totalQuestion} ta to‘g‘ri javob</p>
      <div className="score-chip">{result.resultingLevel ? 'Lug‘at darajasi · ' + result.resultingLevel : '+' + result.score + ' ball'}</div>
      <button className="button primary" onClick={onClose}>Davom etish <ArrowRight size={18} /></button>
    </section>
  </div>;

  if (stimulus && activity?.category === 'memory') return <MemoryRound
    activity={activity} stimulus={stimulus} gridSize={round.payload.gridSize} previewMs={round.payload.previewMs ?? 5000}
    busy={busy} error={error} onClose={onClose} onSubmit={(answers) => void submit('', answers)} />;

  return <div className="container screen practice-screen">
    <div className="practice-top">
      <button className="icon-button" aria-label="Mashqdan chiqish" onClick={onClose}><ArrowLeft size={22} /></button>
      <progress aria-label="Mashqdagi jarayon" max={practiceSteps} value={index + (feedback ? 1 : 0)} />
      <span className="step-counter">{index + 1 + ' / ' + length}</span>
    </div>
    <form className="panel question-card" onSubmit={(event: FormEvent) => { event.preventDefault(); if (!multipleChoice) void submit(selected); }}>
      <span className="question-kind">{activity?.title}{round.demoAnswers && ' · Namuna'}</span>
      {timed && <span className={`timer ${seconds <= 10 ? 'urgent' : ''}`}><Clock3 size={16} /> {seconds} s</span>}
      {multipleChoice && <p className="question-instruction">So‘zning o‘zbekcha ma’nosini tanlang.</p>}
      <h1 ref={heading} tabIndex={-1} key={index} lang={multipleChoice ? "en" : undefined}>
        {question?.prompt}
      </h1>
      {question?.hint && <p className="question-hint">{question.hint}</p>}
      {question?.definition && <p className="question-hint" lang="en">{question.definition}</p>}
      {question?.audioUrl && <audio key={index} controls preload="none" autoPlay={autoplayPronunciation} src={question.audioUrl} aria-label="Diktant audiosi" />}
      {question && (round.kind === 'meaning_match' || round.kind === 'word_rush') &&
        <div className="practice-pronunciation"><Speak key={index} text={question.prompt} autoplay={autoplayPronunciation} /></div>}
      {question?.input === 'tokens' && <>
        <div className="token-answer" aria-label="Tanlangan so‘zlar">{tokens.map((item) => <button type="button" key={item} className="filter active" disabled={!!feedback || busy}
          onClick={() => setTokens((current) => current.filter((entry) => entry !== item))}>{question.options[item]}</button>)}</div>
        <div className="stimulus">{question.options.map((option, optionIndex) => <button type="button" key={optionIndex} className="filter"
          disabled={tokens.includes(optionIndex) || !!feedback || busy} onClick={() => setTokens((current) => [...current, optionIndex])}>{option}</button>)}</div>
      </>}
      {question && multipleChoice && <div className="choices" aria-busy={busy} key={'choices-' + index}>{question.options.map((option, optionIndex) => {
        const wrong = Boolean(feedback && answer === option && !feedback.feedback.correct);
        const canReplay = wrong && soundEnabled && !round.demoAnswers && (round.kind === 'meaning_match' || round.kind === 'word_rush');
        const correct = feedback && option === feedback.expectedAnswer;
        return <button type="button" key={option}
          className={`choice ${answer === option ? 'selected' : ''} ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`}
          aria-description={canReplay ? 'Ovozni qayta eshitish uchun bosing' : undefined}
          aria-pressed={answer === option} disabled={busy || (feedback ? !canReplay : expired)}
          onClick={() => {
            if (canReplay) { sound(repeatedWrongAnswerSound); return; }
            setAnswer(option);
            void submit(option);
          }}>
          <span className="choice-key" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>{option}
          {correct && <Check className="choice-result" size={21} aria-hidden="true" />}
          {wrong && <CircleX className="choice-result" size={20} aria-hidden="true" />}
        </button>;
      })}</div>}
      {question && (question.input === 'text' || question.input === 'sentence') && <label className="answer-label">Javobingiz
        <input value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={255}
          autoComplete="off" spellCheck={false} placeholder="Inglizcha yozing…" disabled={!!feedback || busy || expired} />
      </label>}
      {expired && !feedback && <Notice error>Vaqt tugadi. Yangi raund boshlashingiz mumkin.</Notice>}
      {error && <Notice error>{error}</Notice>}
      {multipleChoice && busy && <p className="choice-pending" role="status">Javob tekshirilmoqda…</p>}
      {feedback && <div className={`answer-feedback ${feedback.feedback.correct ? 'success' : 'failure'}`} role="status">
        {feedback.feedback.correct ? <Check size={21} /> : <CircleX size={21} />}
        {feedback.feedback.correct ? 'To‘g‘ri javob!' : `To‘g‘ri javob: ${feedback.expectedAnswer}`}
      </div>}
      {question && <div className="question-actions">
        {feedback ? <button className="button primary" ref={nextButton} key="next" type="button" onClick={advance}>Davom etish <ArrowRight size={18} /></button>
          : <><button type="button" className="button quiet" disabled={busy || expired} onClick={() => void submit('')}>O‘tkazib yuborish</button>
            {!multipleChoice && <button type="submit" key="submit" className="button primary" disabled={busy || expired || !selected.trim()}>
              {busy ? 'Tekshirilmoqda…' : isAssessment ? 'Keyingi' : 'Tekshirish'} <ArrowRight size={18} />
            </button>}</>}
      </div>}
    </form>
  </div>;
}
