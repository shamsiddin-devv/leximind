import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bookmark, FolderHeart, Languages, MessageSquare, Plus, Quote, Search, X } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import { explain } from '../../../shared/services/api';
import { uzbekMonths } from '../../../shared/utils/date';
import {
  collectionKinds, collectionStorageKey, loadCatalogCollection, readCollection, searchKey,
  type CollectionDraft, type CollectionEntry, type CollectionKind, type PersonalEntry, type SavedCollection,
} from '../collection';
import { topicDefinition } from '../topics';
import './CollectionsPage.css';

const kindLabels = { word: 'So‘zlar', phrase: 'Iboralar', sentence: 'Gaplar' };
const kindIcons = { word: Languages, phrase: Quote, sentence: MessageSquare };
const filters = [
  { id: 'all', label: 'Barchasi' },
  ...collectionKinds.map((id) => ({ id, label: kindLabels[id] })),
  { id: 'mastered', label: 'Ustalar' },
] as const;
const number = new Intl.NumberFormat('uz-UZ');
const newEntry: CollectionDraft = { kind: 'word', text: '', translation: '', example: '', topic: '', progress: 0 };

type Filter = CollectionKind | 'all' | 'mastered';
type Editor = { entry?: PersonalEntry };
type CatalogLookup = { token: string; entries?: CollectionEntry[]; error?: string };

export function CollectionsPage({ token, userId }: { token: string; userId: string }) {
  const storageKey = collectionStorageKey(userId);
  const [saved, setSaved] = useState(() => readCollection(storageKey));
  const [catalog, setCatalog] = useState<CatalogLookup>();
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editor, setEditor] = useState<Editor>();
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalogCollection(token, controller.signal).then((entries) => {
      if (!controller.signal.aborted) setCatalog({ token, entries });
    }).catch((error) => {
      if (!controller.signal.aborted) setCatalog({ token, error: explain(error) });
    });
    return () => controller.abort();
  }, [token, revision]);

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) setSaved(readCollection(storageKey));
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [storageKey]);

  const current = catalog?.token === token ? catalog : undefined;
  const pinned = new Set(saved.pinned);
  const entries = [
    ...saved.entries.map((entry) => ({ ...entry, personal: true, mastered: entry.progress >= 80 })),
    ...(current?.entries ?? []),
  ].sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)) || b.createdAt.localeCompare(a.createdAt));
  const term = searchKey(query);
  const visible = entries.filter((entry) =>
    (filter === 'all' || (filter === 'mastered' ? entry.mastered : filter === entry.kind)) &&
    (!term || searchKey(entry.text).includes(term) || searchKey(entry.translation).includes(term)));
  const mastered = entries.filter((entry) => entry.mastered).length;
  const average = entries.length ? Math.round(entries.reduce((sum, entry) => sum + entry.progress, 0) / entries.length) : null;

  function updateSaved(change: (current: SavedCollection) => SavedCollection) {
    const next = change(readCollection(storageKey));
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSaved(next);
      setStorageError('');
      return true;
    } catch {
      setStorageError('To‘plamni shu brauzerda saqlab bo‘lmadi.');
      return false;
    }
  }

  function saveEntry(input: CollectionDraft) {
    const entry = editor?.entry ? { ...editor.entry, ...input }
      : { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const committed = updateSaved((previous) => ({ ...previous, entries: [entry, ...previous.entries.filter(({ id }) => id !== entry.id)] }));
    if (committed && !editor?.entry) { setQuery(''); setFilter('all'); }
    return committed;
  }

  function removeEntry(id: string) {
    return updateSaved((previous) => ({
      entries: previous.entries.filter((entry) => entry.id !== id),
      pinned: previous.pinned.filter((item) => item !== id),
    }));
  }

  function togglePin(id: string) {
    updateSaved((previous) => ({
      ...previous,
      pinned: previous.pinned.includes(id) ? previous.pinned.filter((item) => item !== id) : [...previous.pinned, id],
    }));
  }

  return <div className="container screen collections-page">
    <header className="collections-heading">
      <div>
        <p className="collections-kicker">To‘plam</p>
        <h1 lang="en">My Collection</h1>
        <p>Saqlangan so‘zlar, iboralar va gaplar — shaxsiy lug‘atingiz.</p>
      </div>
      <button type="button" className="collections-primary" onClick={() => setEditor({})}>
        <Plus size={16} aria-hidden="true" /> Yozuv qo‘shish
      </button>
    </header>

    <div className="collections-toolbar">
      <label className="collections-search">
        <Search size={16} aria-hidden="true" />
        <input type="search" aria-label="So‘z yoki tarjimani qidirish" placeholder="So‘z yoki tarjimani qidirish..."
          maxLength={255} value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="collections-filters" role="group" aria-label="Yozuv turini filtrlash">
        {filters.map(({ id, label }) => <button type="button" key={id} aria-pressed={filter === id}
          onClick={() => setFilter(id)}>{label}</button>)}
      </div>
    </div>

    <dl className="collections-overview" aria-label="To‘plam ko‘rsatkichlari">
      <div><dt>Saqlangan</dt><dd>{number.format(entries.length)}</dd></div>
      <div><dt>O‘zlashtirilgan</dt><dd>{number.format(mastered)}</dd></div>
      <div><dt>O‘rtacha</dt><dd>{average === null ? '—' : number.format(average) + '%'}</dd></div>
    </dl>

    {storageError && !editor && <Notice error>{storageError}</Notice>}
    {current?.error && <div className="collections-notice">
      <Notice error>{current.error}</Notice>
      <button type="button" className="button secondary" onClick={() => {
        setCatalog(undefined);
        setRevision((value) => value + 1);
      }}>Qayta urinish</button>
    </div>}

    <section aria-label="Saqlangan yozuvlar" aria-busy={!current}>
      {!current && <p className="collections-loading" role="status">Lug‘at kartalari yuklanmoqda…</p>}
      {visible.length > 0 && <div className="collections-grid">
        {visible.map((entry) => <CollectionCard key={entry.id} entry={entry} pinned={pinned.has(entry.id)}
          onPin={() => togglePin(entry.id)} onEdit={() => setEditor({ entry })} />)}
      </div>}
      {current && visible.length === 0 && (
        entries.length ? <div className="collections-empty"><p>Qidiruv va filtrga mos yozuv topilmadi.</p>
          <button type="button" className="button secondary" onClick={() => { setQuery(''); setFilter('all'); }}>Filtrlarni tozalash</button>
        </div> : !current.error && <div className="collections-empty">
          <FolderHeart size={24} aria-hidden="true" />
          <strong>To‘plamingiz hali bo‘sh</strong>
          <p>Yozuv qo‘shing yoki lug‘atdan saqlash uchun so‘z tanlang.</p>
          <Link className="text-link" href={routes.vocabulary}>Lug‘atni ochish</Link>
        </div>
      )}
    </section>

    {editor && <CollectionEditor initial={editor.entry} onClose={() => setEditor(undefined)} onSave={saveEntry}
      onRemove={removeEntry} storageError={storageError} />}
  </div>;
}

function CollectionCard({ entry, pinned, onPin, onEdit }: {
  entry: CollectionEntry; pinned: boolean; onPin: () => void; onEdit: () => void;
}) {
  const Icon = kindIcons[entry.kind];
  const topic = entry.personal ? entry.topic : entry.topic && topicDefinition(entry.topic).title;
  const addedOn = new Date(entry.createdAt);
  return <article className="collection-card" data-kind={entry.kind}
    data-progress={entry.progress >= 80 ? 'high' : entry.progress >= 50 ? 'mid' : 'low'}>
    <div className="collection-card-top">
      <span className="collection-tag"><Icon size={12} aria-hidden="true" />{kindLabels[entry.kind]}</span>
      <button type="button" className="collection-pin" aria-pressed={pinned}
        aria-label={entry.text + ' yozuvini mahkamlash'} title={pinned ? 'Mahkamlashni bekor qilish' : 'Tepaga mahkamlash'}
        onClick={onPin}><Bookmark size={16} fill="currentColor" aria-hidden="true" /></button>
    </div>
    <h2 lang="en">{entry.personal ? <button className="collection-edit" type="button" onClick={onEdit}
      title="Yozuvni tahrirlash">{entry.text}</button> : entry.text}</h2>
    {entry.translation && <p className="collection-translation">{entry.translation}</p>}
    {entry.example && <p className="collection-example" lang="en">“{entry.example}”</p>}
    <footer>
      <div className="collection-card-meta">
        <span>{topic && <>{topic} · </>}<time dateTime={entry.createdAt}>{addedOn.getDate()}-{uzbekMonths[addedOn.getMonth()]}</time></span>
        <strong>{number.format(entry.progress)}%</strong>
      </div>
      <progress value={entry.progress} max={100} aria-label={entry.text + ' yozuvining o‘zlashtirish darajasi'} />
    </footer>
  </article>;
}

function CollectionEditor({ initial, onSave, onRemove, onClose, storageError }: {
  initial?: PersonalEntry; onSave: (draft: CollectionDraft) => boolean; onRemove: (id: string) => boolean;
  onClose: () => void; storageError: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const textField = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<CollectionDraft>(initial ?? newEntry);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) {
      element.showModal();
      textField.current?.focus();
    }
  }, []);

  function change<K extends keyof CollectionDraft>(key: K, value: CollectionDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.text.trim();
    const translation = draft.translation.trim();
    if (!text || !translation) return;
    if (onSave({ ...draft, text, translation, example: draft.example.trim(), topic: draft.topic.trim() })) dialog.current?.close();
  }

  return <dialog ref={dialog} className="app-dialog collection-dialog" aria-labelledby="collection-dialog-title" onClose={onClose}>
    <header className="app-dialog-heading">
      <h2 id="collection-dialog-title">{initial ? 'Yozuvni tahrirlash' : 'Yozuv qo‘shish'}</h2>
      <button type="button" className="app-dialog-close" aria-label="Yopish" onClick={() => dialog.current?.close()}>
        <X size={16} aria-hidden="true" />
      </button>
    </header>
    <form className="app-dialog-form collection-form" onSubmit={submit}>
      <label className="app-dialog-field">Yozuv turi
        <select value={draft.kind} onChange={(event) => change('kind', event.target.value as CollectionKind)}>
          <option value="word">So‘z</option><option value="phrase">Ibora</option><option value="sentence">Gap</option>
        </select>
      </label>
      <label className="app-dialog-field">Inglizcha yozuv<input ref={textField} required maxLength={255} value={draft.text}
        onChange={(event) => change('text', event.target.value)} /></label>
      <label className="app-dialog-field">O‘zbekcha tarjima<input required maxLength={255} value={draft.translation}
        onChange={(event) => change('translation', event.target.value)} /></label>
      <label className="app-dialog-field">Misol <small>(ixtiyoriy)</small><textarea rows={2} maxLength={500} value={draft.example}
        onChange={(event) => change('example', event.target.value)} /></label>
      <label className="app-dialog-field">Mavzu <small>(ixtiyoriy)</small><input maxLength={80} value={draft.topic}
        onChange={(event) => change('topic', event.target.value)} /></label>
      {initial && <label className="app-dialog-field">O‘zlashtirish darajasi <output>{draft.progress}%</output>
        <input type="range" min={0} max={100} value={draft.progress} onChange={(event) => change('progress', event.target.valueAsNumber)} />
      </label>}
      {storageError && <Notice error>{storageError}</Notice>}
      {confirmRemove && <p role="status">Bu yozuvni to‘plamdan o‘chirmoqchimisiz?</p>}
      {initial && <div className="collection-delete-row">
        <button type="button" className="app-dialog-button" data-tone="danger" onClick={() => {
          if (!confirmRemove) setConfirmRemove(true);
          else if (onRemove(initial.id)) dialog.current?.close();
        }}>{confirmRemove ? 'O‘chirishni tasdiqlash' : 'O‘chirish'}</button>
      </div>}
      <div className="app-dialog-actions">
        <button type="button" className="app-dialog-button" onClick={() => dialog.current?.close()}>Bekor qilish</button>
        <button type="submit" className="app-dialog-button" data-tone="accent" disabled={!draft.text.trim() || !draft.translation.trim()}>Saqlash</button>
      </div>
    </form>
  </dialog>;
}
