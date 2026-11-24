import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bookmark, FolderHeart, Languages, MessageSquare, Plus, Quote, Search, X } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import { explain } from '../../../shared/services/api';
import { uzbekMonths } from '../../../shared/utils/date';
import {
  addCollectionEntries, collectionKinds, collectionStorageKey, deleteCollectionEntry,
  editCollectionEntry, loadCatalogCollection, loadPersonalCollection, migrateBrowserCollection, readCollection, searchKey, setCollectionPin,
  type CollectionDraft, type CollectionEntry, type CollectionKind, type PersonalEntry,
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
type CollectionLookup<T> = { token: string; entries?: T[]; error?: string };

export function CollectionsPage({ token, userId }: { token: string; userId: string }) {
  const storageKey = collectionStorageKey(userId);
  const [saved, setSaved] = useState(() => readCollection(storageKey));
  const [catalog, setCatalog] = useState<CollectionLookup<CollectionEntry>>();
  const [personal, setPersonal] = useState<CollectionLookup<PersonalEntry>>();
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editor, setEditor] = useState<Editor>();
  const [pinError, setPinError] = useState('');
  const [pinPending, setPinPending] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    async function load() {
      const migrationError = await migrateBrowserCollection(token, storageKey, signal);
      signal.throwIfAborted();
      setSaved(readCollection(storageKey));
      await Promise.allSettled([
        loadPersonalCollection(token, signal).then((entries) => {
          if (!signal.aborted) setPersonal({ token, entries, error: migrationError });
        }).catch((error: unknown) => {
          if (!signal.aborted) setPersonal({ token, error: explain(error) });
        }),
        loadCatalogCollection(token, signal).then((entries) => {
          if (!signal.aborted) setCatalog({ token, entries });
        }).catch((error: unknown) => {
          if (!signal.aborted) setCatalog({ token, error: explain(error) });
        }),
      ]);
    }
    void load().catch((error: unknown) => {
      if (!signal.aborted) {
        setPersonal({ token, error: explain(error) });
        setCatalog({ token, error: explain(error) });
      }
    });
    return () => controller.abort();
  }, [token, storageKey, revision]);

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) setSaved(readCollection(storageKey));
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [storageKey]);

  const current = catalog?.token === token ? catalog : undefined;
  const authored = personal?.token === token ? personal : undefined;
  const editable = Boolean(authored?.entries);
  const legacyPins = new Set(saved.pinned);
  const serverEntries = new Map((authored?.entries ?? []).map((entry) => [entry.id, entry]));
  // Local entries remain visible until their batch is durably imported.
  const pendingEntries = authored?.entries && !authored.error ? [] : saved.entries.filter(({ id }) => !serverEntries.has(id));
  const entries = [
    ...[...serverEntries.values(), ...pendingEntries].map((entry) => ({ ...entry, personal: true, mastered: entry.progress >= 80 })),
    ...(current?.entries ?? []),
  ].map((entry) => ({ ...entry, pinned: entry.pinned ?? legacyPins.has(entry.id) }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));
  const term = searchKey(query);
  const visible = entries.filter((entry) =>
    (filter === 'all' || (filter === 'mastered' ? entry.mastered : filter === entry.kind)) &&
    (!term || searchKey(entry.text).includes(term) || searchKey(entry.translation).includes(term)));
  const mastered = entries.filter((entry) => entry.mastered).length;
  const average = entries.length ? Math.round(entries.reduce((sum, entry) => sum + entry.progress, 0) / entries.length) : null;

  async function saveEntry(input: CollectionDraft, identity: Pick<PersonalEntry, 'id' | 'createdAt'>) {
    const entry = editor?.entry
      ? await editCollectionEntry(token, identity.id, input)
      : (await addCollectionEntries(token, [{ ...input, ...identity }]))[0];
    if (!entry) throw new Error('Collection entry was already removed.');
    setPersonal((previous) => ({
      token,
      error: previous?.error,
      entries: [entry, ...(previous?.entries ?? []).filter(({ id }) => id !== entry.id)],
    }));
    if (!editor?.entry) { setQuery(''); setFilter('all'); }
  }

  async function removeEntry(id: string) {
    await deleteCollectionEntry(token, id);
    setPersonal((previous) => ({ token, error: previous?.error, entries: previous?.entries?.filter((entry) => entry.id !== id) ?? [] }));
  }

  async function togglePin(entry: CollectionEntry) {
    if (pinPending) return;
    setPinPending(entry.id);
    setPinError('');
    try {
      const pinned = !entry.pinned;
      await setCollectionPin(token, entry, pinned);
      const update = <T extends PersonalEntry>(lookup?: CollectionLookup<T>) => lookup && ({
        ...lookup,
        entries: lookup.entries?.map((item) => item.id === entry.id ? { ...item, pinned } : item),
      });
      if (entry.personal) setPersonal(update);
      else setCatalog(update);
    } catch (error) {
      setPinError(explain(error));
    } finally {
      setPinPending(undefined);
    }
  }

  return <div className="container screen collections-page">
    <header className="collections-heading">
      <div>
        <p className="collections-kicker">To‘plam</p>
        <h1 lang="en">My Collection</h1>
        <p>Saqlangan so‘zlar, iboralar va gaplar — shaxsiy lug‘atingiz.</p>
      </div>
      <button type="button" className="collections-primary" disabled={!editable} onClick={() => setEditor({})}>
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

    {pinError && <Notice error>{pinError}</Notice>}
    {(current?.error || authored?.error) && <div className="collections-notice">
      <Notice error>{authored?.error ?? current?.error}</Notice>
      <button type="button" className="button secondary" onClick={() => {
        setCatalog(undefined);
        setPersonal(undefined);
        setRevision((value) => value + 1);
      }}>Qayta urinish</button>
    </div>}

    <section aria-label="Saqlangan yozuvlar" aria-busy={!current || !authored}>
      {(!current || !authored) && <p className="collections-loading" role="status">To‘plam yuklanmoqda…</p>}
      {visible.length > 0 && <div className="collections-grid">
        {visible.map((entry) => <CollectionCard key={(entry.personal ? 'own-' : 'card-') + entry.id} entry={entry}
          pinDisabled={Boolean(pinPending) || (entry.personal && !serverEntries.has(entry.id))}
          onPin={() => void togglePin(entry)} onEdit={entry.personal && serverEntries.has(entry.id) ? () => setEditor({ entry }) : undefined} />)}
      </div>}
      {current && authored && visible.length === 0 && (
        entries.length ? <div className="collections-empty"><p>Qidiruv va filtrga mos yozuv topilmadi.</p>
          <button type="button" className="button secondary" onClick={() => { setQuery(''); setFilter('all'); }}>Filtrlarni tozalash</button>
        </div> : !current.error && !authored.error && <div className="collections-empty">
          <FolderHeart size={24} aria-hidden="true" />
          <strong>To‘plamingiz hali bo‘sh</strong>
          <p>Yozuv qo‘shing yoki lug‘atdan saqlash uchun so‘z tanlang.</p>
          <Link className="text-link" href={routes.vocabulary}>Lug‘atni ochish</Link>
        </div>
      )}
    </section>

    {editor && <CollectionEditor initial={editor.entry} onClose={() => setEditor(undefined)} onSave={saveEntry}
      onRemove={removeEntry} />}
  </div>;
}

function CollectionCard({ entry, pinDisabled, onPin, onEdit }: {
  entry: CollectionEntry; pinDisabled: boolean; onPin: () => void; onEdit?: () => void;
}) {
  const pinned = Boolean(entry.pinned);
  const Icon = kindIcons[entry.kind];
  const topic = entry.personal ? entry.topic : entry.topic && topicDefinition(entry.topic).title;
  const addedOn = new Date(entry.createdAt);
  return <article className="collection-card" data-kind={entry.kind}
    data-progress={entry.progress >= 80 ? 'high' : entry.progress >= 50 ? 'mid' : 'low'}>
    <div className="collection-card-top">
      <span className="collection-tag"><Icon size={12} aria-hidden="true" />{kindLabels[entry.kind]}</span>
      <button type="button" className="collection-pin" aria-pressed={pinned} disabled={pinDisabled}
        aria-label={entry.text + ' yozuvini mahkamlash'} title={pinned ? 'Mahkamlashni bekor qilish' : 'Tepaga mahkamlash'}
        onClick={onPin}><Bookmark size={16} fill="currentColor" aria-hidden="true" /></button>
    </div>
    <h2 lang="en">{entry.personal && onEdit ? <button className="collection-edit" type="button" onClick={onEdit}
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

function CollectionEditor({ initial, onSave, onRemove, onClose }: {
  initial?: PersonalEntry;
  onSave: (draft: CollectionDraft, identity: Pick<PersonalEntry, 'id' | 'createdAt'>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const textField = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<CollectionDraft>(() => initial ? {
    kind: initial.kind,
    text: initial.text,
    translation: initial.translation,
    example: initial.example,
    topic: initial.topic,
    progress: initial.progress,
  } : newEntry);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [working, setWorking] = useState(false);
  const [operationError, setOperationError] = useState('');
  const pending = useRef(false);
  const [identity] = useState(() => initial
    ? { id: initial.id, createdAt: initial.createdAt }
    : { id: crypto.randomUUID(), createdAt: new Date().toISOString() });

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

  async function run(operation: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setWorking(true);
    setOperationError('');
    try {
      await operation();
      dialog.current?.close();
    } catch (error) {
      setOperationError(explain(error));
    } finally {
      pending.current = false;
      setWorking(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.text.trim();
    const translation = draft.translation.trim();
    if (!text || !translation) return;
    void run(() => onSave({ ...draft, text, translation, example: draft.example.trim(), topic: draft.topic.trim() }, identity));
  }

  return <dialog ref={dialog} className="app-dialog collection-dialog" aria-labelledby="collection-dialog-title" onClose={onClose}
    onCancel={(event) => { if (pending.current) event.preventDefault(); }}>
    <header className="app-dialog-heading">
      <h2 id="collection-dialog-title">{initial ? 'Yozuvni tahrirlash' : 'Yozuv qo‘shish'}</h2>
      <button type="button" className="app-dialog-close" aria-label="Yopish" disabled={working} onClick={() => dialog.current?.close()}>
        <X size={16} aria-hidden="true" />
      </button>
    </header>
    <form className="app-dialog-form collection-form" aria-busy={working} onSubmit={submit}>
      <label className="app-dialog-field">Yozuv turi
        <select value={draft.kind} disabled={working} onChange={(event) => change('kind', event.target.value as CollectionKind)}>
          <option value="word">So‘z</option><option value="phrase">Ibora</option><option value="sentence">Gap</option>
        </select>
      </label>
      <label className="app-dialog-field">Inglizcha yozuv<input ref={textField} required maxLength={255} value={draft.text} disabled={working}
        onChange={(event) => change('text', event.target.value)} /></label>
      <label className="app-dialog-field">O‘zbekcha tarjima<input required maxLength={255} value={draft.translation} disabled={working}
        onChange={(event) => change('translation', event.target.value)} /></label>
      <label className="app-dialog-field">Misol <small>(ixtiyoriy)</small><textarea rows={2} maxLength={500} value={draft.example} disabled={working}
        onChange={(event) => change('example', event.target.value)} /></label>
      <label className="app-dialog-field">Mavzu <small>(ixtiyoriy)</small><input maxLength={80} value={draft.topic} disabled={working}
        onChange={(event) => change('topic', event.target.value)} /></label>
      {initial && <label className="app-dialog-field">O‘zlashtirish darajasi <output>{draft.progress}%</output>
        <input type="range" min={0} max={100} value={draft.progress} disabled={working} onChange={(event) => change('progress', event.target.valueAsNumber)} />
      </label>}
      {operationError && <Notice error>{operationError}</Notice>}
      {confirmRemove && <p role="status">Bu yozuvni to‘plamdan o‘chirmoqchimisiz?</p>}
      {initial && <div className="collection-delete-row">
        <button type="button" className="app-dialog-button" data-tone="danger" disabled={working} onClick={() => {
          if (!confirmRemove) setConfirmRemove(true);
          else void run(() => onRemove(initial.id));
        }}>{confirmRemove ? 'O‘chirishni tasdiqlash' : 'O‘chirish'}</button>
      </div>}
      <div className="app-dialog-actions">
        <button type="button" className="app-dialog-button" disabled={working} onClick={() => dialog.current?.close()}>Bekor qilish</button>
        <button type="submit" className="app-dialog-button" data-tone="accent" disabled={working || !draft.text.trim() || !draft.translation.trim()}>Saqlash</button>
      </div>
    </form>
  </dialog>;
}
