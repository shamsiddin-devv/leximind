import { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import Delta, { type Op } from 'quill-delta';
import { AlignCenter, AlignLeft, Bold, Italic, List, Underline } from 'lucide-react';
import 'quill/dist/quill.core.css';
import '@fontsource-variable/dm-sans/wght-italic.css';
import { BioColorPicker } from './BioColorPicker';

export type BioValue = { text: string; format: string | null };

const maxLength = 280;
const formats = ['bold', 'italic', 'underline', 'color', 'align', 'list'];
const emptyFormat: Record<string, unknown> = {};
type TextRange = { index: number; length: number };

function textLength(text: string) {
  return Array.from(text.replace(/\n$/, '')).length;
}

function supportedOperations(operations: Op[]) {
  return operations.flatMap<Op>(({ insert, attributes }) => {
    if (typeof insert !== 'string' || !insert) return [];
    const accepted: NonNullable<Op['attributes']> = {};
    if (/^\n+$/.test(insert)) {
      if (attributes?.align === 'center') accepted.align = 'center';
      if (attributes?.list === 'bullet') accepted.list = 'bullet';
    } else {
      if (attributes?.bold === true) accepted.bold = true;
      if (attributes?.italic === true) accepted.italic = true;
      if (attributes?.underline === true) accepted.underline = true;
      if (typeof attributes?.color === 'string' && /^#[a-f0-9]{6}$/i.test(attributes.color)) accepted.color = attributes.color;
    }
    return Object.keys(accepted).length ? [{ insert, attributes: accepted }] : [{ insert }];
  });
}

function initialContent({ text, format }: BioValue) {
  if (format) {
    try {
      return new Delta(supportedOperations(JSON.parse(format) as Op[]));
    } catch {
      return new Delta().insert(text + '\n');
    }
  }

  const result = new Delta();
  for (const line of text.split('\n')) {
    const bullet = line.startsWith('- ');
    const body = bullet ? line.slice(2) : line;
    for (const [index, part] of body.split(/(\*{3}[^*]+\*{3}|\*{2}[^*]+\*{2}|\*[^*]+\*)/g).entries()) {
      if (!part) continue;
      if (index % 2 === 0) result.insert(part);
      else if (part.startsWith('***')) result.insert(part.slice(3, -3), { bold: true, italic: true });
      else if (part.startsWith('**')) result.insert(part.slice(2, -2), { bold: true });
      else result.insert(part.slice(1, -1), { italic: true });
    }
    result.insert('\n', bullet ? { list: 'bullet' } : undefined);
  }
  return result;
}

export default function BioEditor({ id, value, disabled, onChange }: {
  id: string; value: BioValue; disabled: boolean; onChange: (value: BioValue) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<Quill>(null);
  const selection = useRef<TextRange>(null);
  const colorSelection = useRef<TextRange>(null);
  const lastSent = useRef<BioValue>(null);
  const lastChange = useRef(onChange);
  const [active, setActive] = useState(emptyFormat);
  const [remaining, setRemaining] = useState(maxLength - Array.from(value.text).length);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => { lastChange.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    const quill = new Quill(container, {
      formats,
      placeholder: 'O‘zingiz haqingizda yozing…',
      modules: { toolbar: false, history: { userOnly: true } },
    });
    editor.current = quill;
    lastSent.current = null;
    quill.root.id = id;
    quill.root.setAttribute('role', 'textbox');
    quill.root.setAttribute('aria-multiline', 'true');
    quill.root.setAttribute('aria-labelledby', id + '-label');
    quill.root.setAttribute('aria-describedby', id + '-description ' + id + '-count');

    function rememberSelection(range: TextRange | null) {
      if (!range) return;
      selection.current = range;
      setActive(quill.getFormat(range.index, range.length));
    }

    function onTextChange(_delta: Delta, previous: Delta) {
      const text = quill.getText();
      const length = textLength(text);
      if (length > maxLength && length >= textLength(previous.ops.map(({ insert }) => String(insert)).join(''))) {
        const selection = quill.getSelection();
        quill.setContents(previous, 'silent');
        if (selection) quill.setSelection(Math.min(selection.index, quill.getLength() - 1), 'silent');
        setLimitReached(true);
        return;
      }
      const ops = supportedOperations(quill.getContents().ops);
      const plain = text.trim();
      const snapshot = {
        text: plain,
        format: plain && ops.some(({ attributes }) => attributes) ? JSON.stringify(ops) : null,
      };
      setLimitReached(false);
      setRemaining(Math.max(0, maxLength - length));
      lastSent.current = snapshot;
      lastChange.current(snapshot);
      rememberSelection(quill.getSelection());
    }

    quill.on('text-change', onTextChange);
    quill.on('selection-change', rememberSelection);
    return () => {
      quill.off('text-change', onTextChange);
      quill.off('selection-change', rememberSelection);
      container.replaceChildren();
      editor.current = null;
    };
  }, [id]);

  useEffect(() => {
    const quill = editor.current;
    if (!quill || (lastSent.current?.text === value.text && lastSent.current.format === value.format)) return;
    quill.setContents(initialContent(value), 'silent');
    quill.history.clear();
    selection.current = null;
    colorSelection.current = null;
    lastSent.current = value;
    setRemaining(Math.max(0, maxLength - textLength(quill.getText())));
    setActive(emptyFormat);
    setLimitReached(false);
  }, [id, value]);

  useEffect(() => {
    editor.current?.enable(!disabled);
    editor.current?.root.setAttribute('aria-disabled', String(disabled));
  }, [id, disabled]);

  function apply(name: string, next: string | boolean, savedRange?: TextRange | null) {
    const quill = editor.current;
    if (!quill || disabled) return;
    const range = savedRange ?? quill.getSelection() ?? selection.current;
    if (range) {
      const lastIndex = Math.max(0, quill.getLength() - 1);
      const index = Math.min(range.index, lastIndex);
      quill.setSelection(index, Math.min(range.length, lastIndex - index), 'silent');
    } else {
      quill.focus({ preventScroll: true });
    }
    quill.format(name, next, 'user');
    selection.current = quill.getSelection();
    setActive(quill.getFormat());
  }

  const color = typeof active.color === 'string' && /^#[a-f0-9]{6}$/i.test(active.color) ? active.color : null;

  return <div className="bio-composer">
    <div className="bio-toolbar" role="group" aria-label="Bio formatlash"
      onMouseDown={(event) => {
        const target = event.target as Element;
        if (target.closest('button') && !target.closest('.bio-color-palette')) event.preventDefault();
      }}>
      <span className="bio-toolbar-group">
        <button type="button" title="Qalin matn" aria-label="Qalin matn" aria-pressed={active.bold === true}
          disabled={disabled} onClick={() => apply('bold', active.bold !== true)}><Bold size={17} /></button>
        <button type="button" title="Kursiv matn" aria-label="Kursiv matn" aria-pressed={active.italic === true}
          disabled={disabled} onClick={() => apply('italic', active.italic !== true)}><Italic size={17} /></button>
        <button type="button" title="Tagiga chizish" aria-label="Tagiga chizish" aria-pressed={active.underline === true}
          disabled={disabled} onClick={() => apply('underline', active.underline !== true)}><Underline size={17} /></button>
      </span>
      <BioColorPicker id={id + '-palette'} color={color} disabled={disabled}
        onOpen={() => { colorSelection.current = editor.current?.getSelection() ?? selection.current; }}
        onPick={(value) => apply('color', value, colorSelection.current)} />
      <span className="bio-toolbar-group">
        <button type="button" title="Chapga tekislash" aria-label="Chapga tekislash" aria-pressed={!active.align}
          disabled={disabled} onClick={() => apply('align', false)}><AlignLeft size={17} /></button>
        <button type="button" title="Markazga tekislash" aria-label="Markazga tekislash" aria-pressed={active.align === 'center'}
          disabled={disabled} onClick={() => apply('align', 'center')}><AlignCenter size={17} /></button>
        <button type="button" title="Belgili ro‘yxat" aria-label="Belgili ro‘yxat" aria-pressed={active.list === 'bullet'}
          disabled={disabled} onClick={() => apply('list', active.list === 'bullet' ? false : 'bullet')}><List size={17} /></button>
      </span>
    </div>
    <div className="bio-writing-surface" ref={host} />
    <small id={id + '-count'}>{remaining} ta belgi qoldi</small>
    {limitReached && <small role="status">Bio uchun {maxLength} ta belgi chegarasiga yetdingiz.</small>}
  </div>;
}
