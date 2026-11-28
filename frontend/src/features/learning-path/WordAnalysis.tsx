import { ArrowRight, BookOpen, Lightbulb, WandSparkles } from 'lucide-react';
import { Speak } from '../../shared/components/UI';
import type { StudyWord } from '../vocabulary/studyVocabulary';
import { lessons } from './course';
import { wordTokens } from './lessonVocabulary';
import { findWord, type Word } from './words';
import './course-workspace.css';

const partNames: Record<string, string> = { n: 'Ot', v: 'Fe’l', a: 'Sifat', s: 'Sifat', r: 'Ravish' };

type Phrase = { phrase: string; piece: string; meaning: string };

const coursePhrases: Partial<Record<string, readonly Phrase[]>> = {
  say: [
    { phrase: 'say that she is ready', piece: 'that', meaning: 'That keyingi gapni aytilgan xabar bilan bog‘laydi.' },
    { phrase: 'say hello', piece: 'hello', meaning: 'Salom bermoq.' },
    { phrase: 'say something', piece: 'something', meaning: 'Biror narsa aytmoq.' },
  ],
  work: [
    { phrase: 'work at home', piece: 'at home', meaning: 'Uyda ishlamoq.' },
    { phrase: 'work on a project', piece: 'on a project', meaning: 'Loyiha ustida ishlamoq.' },
  ],
  report: [
    { phrase: 'write a report', piece: 'write', meaning: 'Hisobot yozmoq.' },
    { phrase: 'submit a report', piece: 'submit', meaning: 'Hisobotni topshirmoq.' },
  ],
  moment: [
    { phrase: 'at the moment', piece: 'at the', meaning: 'Hozir, ayni paytda.' },
    { phrase: 'wait a moment', piece: 'wait a', meaning: 'Bir oz kutmoq.' },
  ],
  suggest: [
    { phrase: 'suggest taking a break', piece: 'taking a break', meaning: 'Harakat taklif qilinganda suggest dan keyin -ing shakli kelishi mumkin.' },
    { phrase: 'suggest that we wait', piece: 'that', meaning: 'That taklif qilingan harakatni ifodalovchi gapni boshlab beradi.' },
  ],
};

export function ChangedForm({ text, change, stem }: { text: string; change?: string; stem?: string }) {
  const index = change ? text.lastIndexOf(change) : -1;
  const before = index >= 0 ? text.slice(0, index) : text;
  const root = stem?.replace(/-$/, '');
  const start = root ? before.toLowerCase().lastIndexOf(root.toLowerCase()) : -1;
  return <>
    {start >= 0 && root ? <>{before.slice(0, start)}<mark className="word-root">{before.slice(start, start + root.length)}</mark>{before.slice(start + root.length)}</> : before}
    {index >= 0 && change && <><mark className="word-affix">{change}</mark>{text.slice(index + change.length)}</>}
  </>;
}

function grammarGroups(entry: Word) {
  const forms = entry.forms ?? [];
  if (entry.id === 'rabotat') return [
    { title: 'Hozirgi zamon', note: 'Fe’l oxiri kim ishlayotganini bildiradi.', forms: forms.slice(0, 7) },
    { title: 'O‘tgan zamon', note: 'Oxir shaxsning jinsi yoki soniga moslashadi.', forms: forms.slice(7) },
  ];
  if (entry.id === 'work' || entry.id === 'be') return [
    { title: 'Hozirgi zamon', note: 'Shaxsga va harakatning davom etishiga mos shaklni tanlang.', forms: forms.slice(0, entry.id === 'work' ? 4 : 3) },
    { title: 'O‘tgan va kelasi zamon', note: 'Vaqtni fe’lning shakli yoki yordamchi so‘z bildiradi.', forms: forms.slice(entry.id === 'work' ? 4 : 3) },
  ];
  return [{ title: 'Qo‘shimchalar va shakllar', note: 'Ajratilgan bo‘lak har bir shakl qanday yasalishini ko‘rsatadi.', forms }];
}

function dictionaryPhrases(word: StudyWord) {
  if (!/^[a-z]+(?:-[a-z]+)*$/i.test(word.text)) return [];
  const parts = new Set(word.sense.map((sense) => sense.part));
  if (parts.has('v')) return [
    { piece: 'will', phrase: 'will ' + word.text, meaning: 'Kelajakdagi harakatni ifodalaydi.' },
    { piece: 'can', phrase: 'can ' + word.text, meaning: 'Qobiliyat yoki imkoniyatni bildiradi.' },
  ];
  if (parts.has('n')) return [
    { piece: 'the', phrase: 'the ' + word.text, meaning: 'Gap muayyan narsa yoki tushuncha haqida ketayotganini ko‘rsatadi.' },
  ];
  return [];
}

export function WordAnalysis({ entry, word }: { entry?: Word; word?: StudyWord }) {
  if (!entry && !word) return null;
  const title = word?.text ?? entry?.original ?? '';
  const translation = word?.sense[0]?.translationUz ?? entry?.translation;
  const language = entry?.language ?? 'en';
  const part = entry?.role ?? (word?.sense[0]?.part ? partNames[word.sense[0].part] : undefined);
  const stem = entry?.stem;
  const simple = stem?.replace(/-$/, '');
  const attached = simple && entry?.original.toLowerCase().startsWith(simple.toLowerCase()) ? entry.original.slice(simple.length) : '';
  const groups = entry ? grammarGroups(entry).filter((group) => group.forms.length) : [];
  const phrases = (entry && coursePhrases[entry.id]) ?? (word && !entry ? dictionaryPhrases(word) : []);
  const examples = new Map<string, { translation?: string; audio?: string | null }>();
  if (entry) {
    examples.set(entry.example[0], { translation: entry.example[1] });
    for (const lesson of lessons) for (const [text, meaning] of lesson.examples) {
      if (examples.size >= 4) break;
      if ((text.match(wordTokens) ?? []).some((token) => findWord(token)?.id === entry.id)) examples.set(text, { translation: meaning });
    }
  }
  if (word) for (const sense of word.sense) {
    if (sense.exampleSentence && !examples.has(sense.exampleSentence)) examples.set(sense.exampleSentence, { audio: sense.exampleAudioUrl });
  }
  const shownExamples = [...examples].slice(0, 6);

  return <div className="word-analysis">
    <section className="course-panel analysis-intro">
      <div className="vocabulary-word-badges"><span className="course-pill">{language.startsWith('ru') ? 'Rus tili' : 'Ingliz tili'}</span>
        {part && <span className="course-chip">{part}</span>}</div>
      <h2 lang={language}>{title}</h2>
      <div className="analysis-meaning"><Speak text={title} url={word?.audioUrl} language={entry?.language} />
        {translation && <span>Ma’nosi <strong>{translation}</strong></span>}</div>
      {entry && <p>{entry.explanation}</p>}
      {(stem || entry?.contractions?.length) && <div className="analysis-construction">
        <div className="course-tagline"><WandSparkles size={15} aria-hidden="true" /> So‘z qurilishi</div>
        {stem ? <div className="analysis-formula" lang={language}><mark className="word-root">{stem}</mark>
          {attached && <><span>+</span><mark className="word-affix">{attached}</mark><span>=</span><strong>{entry?.original}</strong></>}</div>
          : <div className="analysis-formula" lang="en"><strong>{entry?.contractions?.[0].full}</strong><ArrowRight size={16} aria-hidden="true" />
            <mark className="word-affix">{entry?.contractions?.[0].short}</mark></div>}
        {stem && <div className="analysis-legend"><span><i />O‘zak</span><span><i />O‘zgargan bo‘lak</span></div>}
      </div>}
    </section>
    {groups.map((group) => <section className="course-panel analysis-section" key={group.title}>
      <h3>{group.title}</h3><p>{group.note}</p>
      <ul className="analysis-forms">{group.forms.map((form) => <li key={form.text}>
        <strong lang={language}><ChangedForm text={form.text} change={form.change} stem={stem} /></strong><p>{form.explanation}</p>
      </li>)}</ul>
    </section>)}
    {entry?.contractions?.length ? <section className="course-panel analysis-section">
      <h3>To‘liq va qisqa shakllar</h3><p>Apostrof tushirilgan harflar o‘rnini bildiradi.</p>
      <ul className="analysis-forms">{entry.contractions.map((form) => <li key={form.short}>
        <strong lang="en">{form.full} <ArrowRight size={14} aria-hidden="true" /> <mark className="word-affix">{form.short}</mark></strong><p>{form.use}</p>
      </li>)}</ul>
    </section> : null}
    {phrases.length > 0 && <section className="course-panel analysis-section">
      <h3>Birga ishlatiladigan so‘zlar</h3>
      <ul className="analysis-forms">{phrases.map((item) => <li key={item.phrase}>
        <strong lang="en"><ChangedForm text={item.phrase} change={item.piece} /></strong><p>{item.meaning}</p>
      </li>)}</ul>
    </section>}
    {shownExamples.length > 0 && <section className="course-panel analysis-section">
      <h3>Kundalik misollar</h3>
      <ul className="analysis-examples">{shownExamples.map(([text, detail]) => <li key={text}>
        <div><strong lang={language}>{text}</strong>{detail.translation && <p>{detail.translation}</p>}</div>
        <Speak text={text} url={detail.audio} language={entry?.language} label="Misolni tinglash" />
      </li>)}</ul>
    </section>}
    {word && <section className="course-panel analysis-section">
      <h3>Lug‘atdagi ma’nolari</h3>
      <ol className="analysis-examples">{word.sense.map((sense, index) => <li key={index}>
        <div><strong>{sense.translationUz}</strong><p>{sense.definition}</p></div>
      </li>)}</ol>
    </section>}
    {!entry && !phrases.length && <p className="analysis-note"><Lightbulb size={16} aria-hidden="true" /> Bu so‘z uchun qo‘shimchalar tahlili tayyorlanmagan. Lug‘atdagi ma’nolari yuqorida.</p>}
    {entry && entry.role === 'Olmosh' && <p className="analysis-note"><BookOpen size={16} aria-hidden="true" /> Olmoshning shakli gapdagi vazifasiga qarab tanlanadi.</p>}
  </div>;
}
