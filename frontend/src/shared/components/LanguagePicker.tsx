import { useId, useRef, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { interfaceLanguages, setInterfaceLanguage, useInterfaceLanguage } from '../../app/language';
import './LanguagePicker.css';

const labels = { uz: 'Interfeys tili', en: 'Interface language', ru: 'Язык интерфейса' };

export function LanguagePicker({ compact = false, triggerId }: { compact?: boolean; triggerId?: string }) {
  const language = useInterfaceLanguage();
  const selected = interfaceLanguages.find(({ id }) => id === language) ?? interfaceLanguages[0];
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const label = labels[language];

  function placePopover() {
    const anchor = trigger.current?.getBoundingClientRect();
    if (!anchor || !menu.current) return;
    menu.current.style.setProperty('--language-top', `${anchor.bottom + 8}px`);
    menu.current.style.setProperty('--language-right', `${Math.max(8, document.documentElement.clientWidth - anchor.right)}px`);
  }

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const options = Array.from(event.currentTarget.querySelectorAll('button'));
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    const last = options.length - 1;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? last
      : event.key === 'ArrowDown' ? (index + 1) % options.length : index <= 0 ? last : index - 1;
    event.preventDefault();
    options[next]?.focus({ preventScroll: true });
  }

  return <>
    <button id={triggerId} ref={trigger} type="button" className={compact ? 'app-control app-toolbar-control language-trigger compact' : 'language-trigger'}
      lang={language} aria-label={label + ' · ' + selected.id.toUpperCase()} popoverTarget={id} onClick={placePopover}>
      <Flag code={selected.flag} /><span>{selected.id.toUpperCase()}</span><ChevronDown className="language-chevron" size={13} aria-hidden="true" />
    </button>
    <div ref={menu} id={id} className="language-popover" popover="auto" role="group" aria-label={label}
      lang={language} onKeyDown={moveFocus} onBeforeToggle={placePopover} onToggle={(event) => {
        if (event.newState === 'open') event.currentTarget.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
      }}>
      <p className="language-popover-title">{label}</p>
      {interfaceLanguages.map(({ id, flag, name }) => <button key={id} type="button" className="language-option"
        lang={id} aria-pressed={id === language} onClick={() => {
          setInterfaceLanguage(id);
          menu.current?.hidePopover();
          trigger.current?.focus({ preventScroll: true });
        }}>
        <Flag code={flag} /><span className="language-code">{id.toUpperCase()}</span><span>{name}</span>
        {id === language && <Check size={15} aria-hidden="true" />}
      </button>)}
    </div>
  </>;
}

function Flag({ code }: { code: string }) {
  return <svg className="language-flag" viewBox="0 0 512 512" aria-hidden="true">
    <use href={import.meta.env.BASE_URL + 'profile-geo/flags.svg#flag-' + code} />
  </svg>;
}
