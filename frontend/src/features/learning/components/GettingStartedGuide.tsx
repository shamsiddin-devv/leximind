import { useId, type RefObject } from 'react';
import { ArrowRight, BarChart3, BookOpen, Check, ClipboardList, Compass, Gamepad2, RotateCcw, X } from 'lucide-react';
import { useInterfaceLanguage } from '../../../app/language';
import { Link, routes } from '../../../app/router';
import type { Statistics } from '../../../shared/types/api';
import { gettingStartedCopy } from '../gettingStartedCopy';
import './GettingStartedGuide.css';

const steps = [
  { id: 'practice', icon: Gamepad2, href: null },
  { id: 'vocabulary', icon: BookOpen, href: routes.vocabulary },
  { id: 'review', icon: RotateCcw, href: routes.reviewCenter },
] as const;

export function gettingStartedProgress(stats: Statistics, gamesPlayed: number) {
  return {
    practice: gamesPlayed > 0,
    vocabulary: stats.cards > 0 || stats.reviews > 0,
    review: stats.reviews > 0,
  };
}

type Progress = ReturnType<typeof gettingStartedProgress>;
type GuideActions = { busy: boolean; onPractice: () => void };
const completedCount = (progress: Progress) => steps.filter(({ id }) => progress[id]).length;

function StepAction({ step, className, onNavigate, busy, onPractice }: GuideActions & {
  step: typeof steps[number]; className: string; onNavigate?: () => void;
}) {
  const copy = gettingStartedCopy[useInterfaceLanguage()];
  const content = <>{copy.steps[step.id][2]} <ArrowRight size={15} aria-hidden="true" /></>;
  return step.href
    ? <Link className={className} href={step.href} onClick={onNavigate}>{content}</Link>
    : <button className={className} type="button" disabled={busy} onClick={onPractice}>{content}</button>;
}

export function GettingStartedPrompt({ progress, onDismiss, ...actions }: GuideActions & {
  progress: Progress; onDismiss: () => void;
}) {
  const titleId = useId();
  const copy = gettingStartedCopy[useInterfaceLanguage()];
  const next = steps.find(({ id }) => !progress[id]);
  if (!next) return null;
  const done = completedCount(progress);

  return <section className="getting-started-prompt" aria-labelledby={titleId}>
    <span className="getting-started-prompt-icon"><Compass size={22} aria-hidden="true" /></span>
    <div className="getting-started-prompt-copy">
      <h2 id={titleId}>{copy.title}</h2>
      <p>{copy.steps[next.id][0]}</p>
    </div>
    <div className="getting-started-progress">
      <progress max={steps.length} value={done} aria-label={copy.progress(done, steps.length)} />
      <span aria-hidden="true">{done} / {steps.length}</span>
    </div>
    <StepAction step={next} className="getting-started-action" {...actions} />
    <button type="button" className="getting-started-dismiss" aria-label={copy.dismiss} onClick={onDismiss}>
      <X size={17} aria-hidden="true" />
    </button>
  </section>;
}

export function GettingStartedDialog({ dialog, progress, busy, onPractice }: GuideActions & {
  dialog: RefObject<HTMLDialogElement | null>; progress?: Progress;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const language = useInterfaceLanguage();
  const copy = gettingStartedCopy[language];
  const close = () => dialog.current?.close();

  return <dialog ref={dialog} className="app-dialog getting-started-dialog" lang={language}
    aria-labelledby={titleId} aria-describedby={descriptionId} onClick={(event) => {
      if (event.currentTarget !== event.target) return;
      const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
      if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) close();
    }}>
    <header className="app-dialog-heading">
      <div>
        <h2 id={titleId}>{copy.title}</h2>
        <p id={descriptionId}>{copy.intro}</p>
      </div>
      <button type="button" className="app-dialog-close" aria-label={copy.close} onClick={close}><X size={17} aria-hidden="true" /></button>
    </header>
    <ol className="getting-started-steps">
      {steps.map((step) => {
        const [title, detail] = copy.steps[step.id];
        const done = progress?.[step.id];
        const Icon = done ? Check : step.icon;
        return <li key={step.id} data-completed={done || undefined}>
          <span className="getting-started-step-icon"><Icon size={19} aria-hidden="true" /></span>
          <div><h3>{title}</h3><p>{detail}</p>
            {done && <span className="getting-started-done">{copy.done}</span>}
          </div>
          <StepAction step={step} className="app-dialog-button" busy={busy} onNavigate={close}
            onPractice={() => { close(); onPractice(); }} />
        </li>;
      })}
    </ol>
    <footer className="getting-started-links">
      <Link href={routes.studyPlan} className="text-link" onClick={close}><ClipboardList size={16} aria-hidden="true" />{copy.studyPlan}</Link>
      <Link href={routes.statistics} className="text-link" onClick={close}><BarChart3 size={16} aria-hidden="true" />{copy.statistics}</Link>
    </footer>
  </dialog>;
}
