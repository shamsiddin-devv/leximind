import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { onboardingCopy, tourSteps } from './onboardingCopy';
import './OnboardingTour.css';

const seenInSession = new Set<string>();
const spotlightGap = 5;

function findVisibleAnchor(name: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-tour-anchor="${name}"]`)).find((element) => {
    if (element.closest('[inert], dialog:not([open])')) return false;
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && box.top >= 0 && box.left >= 0 &&
      box.bottom <= document.documentElement.clientHeight && box.right <= document.documentElement.clientWidth;
  });
}

export function OnboardingTour({ userId, language, canStart, request }: {
  userId: string;
  language: keyof typeof onboardingCopy;
  canStart: boolean;
  request: number;
}) {
  const [step, setStep] = useState<number | null>(null);
  const handledRequest = useRef(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const copy = onboardingCopy[language];

  useEffect(() => {
    const requested = request !== handledRequest.current;
    handledRequest.current = request;
    if (!requested && (!canStart || document.querySelector('dialog[open]'))) return;

    const key = `leximind.onboarding-tour.v1.${userId}`;
    if (!requested && seenInSession.has(key)) return;
    try {
      if (!requested && localStorage.getItem(key)) return;
      localStorage.setItem(key, 'shown');
    } catch { /* Also remember the tour when browser storage is unavailable. */ }
    seenInSession.add(key);
    setStep(0);
  }, [canStart, request, userId]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const panel = panelRef.current;
    const spotlight = spotlightRef.current;
    if (step === null || !dialog || !panel || !spotlight) return;

    if (!dialog.open) dialog.showModal();
    headingRef.current?.focus({ preventScroll: true });
    const definition = tourSteps[step];
    let anchor: HTMLElement | undefined;
    let frame = 0;
    const observer = new ResizeObserver(scheduleMeasure);

    const measure = () => {
      const next = findVisibleAnchor(definition.anchor) ??
        ('menuFallback' in definition ? findVisibleAnchor('menu') : undefined);
      if (next !== anchor) {
        if (anchor) observer.unobserve(anchor);
        if (next) observer.observe(next);
        anchor = next;
      }

      spotlight.hidden = !anchor;
      panel.removeAttribute('data-positioned');
      panel.removeAttribute('data-above');
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      spotlight.style.left = `${rect.left - spotlightGap}px`;
      spotlight.style.top = `${rect.top - spotlightGap}px`;
      spotlight.style.width = `${rect.width + 2 * spotlightGap}px`;
      spotlight.style.height = `${rect.height + 2 * spotlightGap}px`;

      const viewportWidth = dialog.clientWidth;
      const viewportHeight = dialog.clientHeight;
      const { offsetWidth: width, offsetHeight: height } = panel;
      const margin = 14;
      const gap = 19;
      const fitsRight = rect.right + gap + width <= viewportWidth - margin;
      const fitsLeft = rect.left - gap - width >= margin;
      const fitsAbove = rect.top - gap - height >= margin;
      panel.toggleAttribute('data-above', fitsAbove && rect.bottom + height + gap > viewportHeight - margin);
      if (viewportWidth <= 760) return;

      const beside = fitsRight || fitsLeft;
      const left = fitsRight ? rect.right + gap : fitsLeft ? rect.left - gap - width : rect.left;
      const top = beside ? rect.top + (rect.height - height) / 2
        : fitsAbove ? rect.top - gap - height : rect.bottom + gap;
      panel.style.setProperty('--tour-left', `${Math.max(margin, Math.min(left, viewportWidth - width - margin))}px`);
      panel.style.setProperty('--tour-top', `${Math.max(margin, Math.min(top, viewportHeight - height - margin))}px`);
      panel.setAttribute('data-positioned', '');
    };

    function scheduleMeasure() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }

    measure();
    observer.observe(panel);
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('scroll', scheduleMeasure, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('scroll', scheduleMeasure, true);
    };
  }, [step]);

  const close = () => dialogRef.current?.close();
  const total = tourSteps.length;
  const current = step ?? 0;
  const Icon = tourSteps[current].icon;
  const [title, description] = copy.steps[current];
  const last = current === total - 1;

  return <dialog ref={dialogRef} className="onboarding-tour" aria-labelledby={titleId} aria-describedby={descriptionId}
    onClose={() => setStep(null)}>
    {step !== null && <>
      <div className="onboarding-tour-spotlight" ref={spotlightRef} hidden aria-hidden="true" />
      <div className="onboarding-tour-panel" ref={panelRef}>
        <div className="onboarding-tour-art" style={{ '--tour-stage': current } as CSSProperties}>
          <div key={current} className="onboarding-tour-symbol"><Icon size={32} strokeWidth={1.65} aria-hidden="true" /></div>
          <button type="button" className="onboarding-tour-close" aria-label={copy.close} onClick={close}>
            <X size={19} aria-hidden="true" />
          </button>
        </div>
        <div className="onboarding-tour-body">
          <div className="onboarding-tour-progress" role="img" aria-label={copy.step(current + 1, total)}>
            <span aria-hidden="true">{current + 1} / {total}</span>
            {tourSteps.map(({ anchor }, index) => <i key={anchor} data-reached={index <= current || undefined} aria-hidden="true" />)}
          </div>
          <div key={current} className="onboarding-tour-copy">
            <h2 id={titleId} ref={headingRef} tabIndex={-1}>{title}</h2>
            <p id={descriptionId}>{description}</p>
          </div>
          <div className="onboarding-tour-actions">
            <button type="button" className="onboarding-tour-quiet" onClick={close}>{copy.skip}</button>
            {current > 0 && <button type="button" className="onboarding-tour-back" aria-label={copy.back} title={copy.back}
              onClick={() => setStep(current - 1)}><ArrowLeft size={17} aria-hidden="true" /></button>}
            <button type="button" className="onboarding-tour-next" onClick={() => last ? close() : setStep(current + 1)}>
              {last ? copy.finish : copy.next}
              {last ? <Check size={17} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </>}
  </dialog>;
}
