import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { Link, navigate } from '../../../app/router';
import { explain } from '../../../shared/services/api';
import type { Word } from '../../../shared/types/api';
import { listWords, vocabularyHref, wordSearchLength } from '../wordSearch';
import './VocabularySearch.css';

type SearchPreview = { term: string; words?: Word[]; total?: number; error?: string };

function isBackdropPress(event: MouseEvent<HTMLDialogElement>) {
  if (event.target !== event.currentTarget) return false;
  const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
  return event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom;
}

export function VocabularySearch({ token, onNavigate }: { token: string; onNavigate: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLUListElement>(null);
  const pressedBackdrop = useRef(false);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<SearchPreview>();
  const term = query.trim();
  const current = preview?.term === term ? preview : undefined;

  const openSearch = useCallback(() => {
    if (!dialog.current || dialog.current.open) return;
    dialog.current.showModal();
    input.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function shortcut(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing ||
        (event.code !== 'KeyK' && event.key.toLowerCase() !== 'k')) return;
      const commandShortcut = event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
      const windowsRemap = !event.metaKey && event.ctrlKey && event.altKey && event.shiftKey;
      if ((!commandShortcut && !windowsRemap) || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      openSearch();
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [openSearch]);

  useEffect(() => {
    if (!term) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void listWords({ query: term, limit: 6, page: 1, token, signal: controller.signal })
        .then(({ data, total }) => {
          if (!controller.signal.aborted) setPreview({ term, words: data, total });
        }).catch((error) => {
          if (!controller.signal.aborted) setPreview({ term, error: explain(error) });
        });
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [term, token]);

  function chooseResult(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    dialog.current?.close();
    onNavigate();
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!term) return;
    dialog.current?.close();
    onNavigate();
    navigate(vocabularyHref(term));
  }

  function moveFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'Escape' && event.target === input.current && query) {
      event.preventDefault();
      dialog.current?.close();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const links = Array.from(results.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []);
    const active = links.findIndex((link) => link === event.target);
    if (!links.length || (active === -1 && event.target !== input.current)) return;
    event.preventDefault();
    const next = event.key === 'ArrowDown' ? active + 1 : active === -1 ? links.length - 1 : active - 1;
    (links[next] ?? input.current)?.focus();
  }

  return <>
    <button type="button" className="app-search-trigger" aria-label="Lug‘atdan qidirish"
      aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+Alt+Shift+K" aria-controls="app-vocabulary-search"
      title="Lug‘atdan qidirish (⌘K)" onClick={openSearch}>
      <Search size={18} strokeWidth={1.6} aria-hidden="true" />
      <span>Qidirish</span>
    </button>
    <dialog ref={dialog} id="app-vocabulary-search" className="app-search-dialog" aria-labelledby="app-vocabulary-search-title" closedby="any"
      onPointerDown={(event) => {
        if (!('closedBy' in HTMLDialogElement.prototype)) pressedBackdrop.current = event.button === 0 && isBackdropPress(event);
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && isBackdropPress(event)) event.currentTarget.close();
        pressedBackdrop.current = false;
      }}
      onKeyDown={moveFocus} onClose={() => { pressedBackdrop.current = false; setQuery(''); setPreview(undefined); }}>
      <div className="app-search-heading">
        <h2 id="app-vocabulary-search-title">Lug‘atdan qidirish</h2>
        <button type="button" className="app-control app-search-close" aria-label="Qidiruvni yopish" onClick={() => dialog.current?.close()}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <form role="search" aria-label="Qidiruv oynasi" className="app-search-form" onSubmit={submitSearch}>
        <label className="app-search-field">
          <Search size={19} aria-hidden="true" />
          <input ref={input} type="search" name="search" aria-label="So‘z qidiring" placeholder="Qidirish" autoComplete="off"
            maxLength={wordSearchLength} value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button type="submit" className="button primary" disabled={!term}>Qidirish</button>
      </form>
      {term && <div className="app-search-results">
        <p className="app-search-status" role="status">
          {current?.error ?? (current?.words ? (current.total ? current.total + ' ta mos natija' : 'Mos so‘z topilmadi.') : 'Qidirilmoqda…')}
        </p>
        {!!current?.words?.length && <ul ref={results} aria-label="Lug‘at natijalari">
          {current.words.map((word) => <li key={word.id}>
            <Link className="app-search-result" href={vocabularyHref(word.text)} onClick={chooseResult}>
              <span className="app-search-word"><strong lang="en">{word.text}</strong>{word.sense[0]?.translationUz && <small>{word.sense[0].translationUz}</small>}</span>
              <span className="level">{word.cefrLevel}</span><ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </li>)}
        </ul>}
      </div>}
      <div className="app-search-keys">
        <span><kbd>↑</kbd> <kbd>↓</kbd> Tanlash</span><span><kbd>Enter</kbd> Ochish</span><span><kbd>Esc</kbd> Yopish</span>
      </div>
    </dialog>
  </>;
}
