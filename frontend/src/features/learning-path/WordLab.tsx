import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Link } from '../../app/router';
import { levels, type Level } from '../../shared/types/api';
import { CourseHeader, CourseNavigation } from './CourseOverview';
import { introducedLevels } from './lessonVocabulary';
import { pathLinks } from './pathLinks';
import { WordAnalysis } from './WordAnalysis';
import { words, type Word } from './words';

const languages = [['all', 'Barchasi'], ['en', 'Ingliz tili'], ['ru', 'Rus tili']] as const;

export function WordLab({ entry, unlockedLevel }: { entry?: Word; unlockedLevel: Level }) {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<(typeof languages)[number][0]>('all');
  const q = query.trim().toLowerCase().replaceAll('’', "'");
  const available = words.filter((word) => levels.indexOf(introducedLevels.get(word.id) ?? 'A1') <= levels.indexOf(unlockedLevel));
  const matches = available.filter((word) => (language === 'all' || (word.language?.startsWith('ru') ? 'ru' : 'en') === language)
    && [word.original, word.translation, ...word.aliases ?? []].some((text) => text.toLowerCase().replaceAll('’', "'").includes(q)));
  const selected = entry && available.includes(entry) ? entry : undefined;
  const active = selected && matches.includes(selected) ? selected : matches.find((word) => word.id === 'work') ?? matches[0];
  const returnId = new URLSearchParams(location.search).get('lesson');
  return <>
    <CourseNavigation active="lab" />
    {returnId && <Link className="course-button course-back" href={pathLinks.lesson(returnId)}>‹ Darsga qaytish</Link>}
    <div className="course-lab-header"><span className="course-pill"><Sparkles size={14} aria-hidden="true" />{available.length} ta tahlil</span>
      <CourseHeader title="So‘z laboratoriyasi"><p>So‘zning o‘zagi, qo‘shimchalari va gapda qanday ishlatilishini o‘zbek tilida o‘rganing.</p></CourseHeader></div>
    <div className="course-section-top course-lab-tools">
      <div className="course-filters" role="group" aria-label="Tahlil tili">
        {languages.map(([id, label]) => <button type="button" key={id} aria-pressed={language === id} onClick={() => setLanguage(id)}>{label}</button>)}
      </div>
      <label className="course-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label="So‘z bo‘yicha qidirish"
        placeholder="So‘z yoki ma’no bo‘yicha qidirish" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    </div>
    {entry && !selected && <p className="analysis-note" role="status">Bu so‘z darslar ochilgach tahlil uchun ko‘rinadi.</p>}
    <div className="course-lab-grid">
      <nav className="course-panel course-word-list" aria-label="So‘zlar">
        <header><strong>So‘zlar</strong><span role="status">{matches.length}</span></header>
        {matches.map((word) => <Link key={word.id} href={pathLinks.word(word.id, returnId ?? undefined)}
          aria-current={word.id === active?.id ? 'page' : undefined}>
          <span><strong lang={word.language ?? 'en'}>{word.original}</strong><small>{word.translation}</small></span>
          <small>{word.language ? 'RU' : 'EN'}</small>
        </Link>)}
        {!matches.length && <p>So‘z topilmadi.</p>}
      </nav>
      {active && <WordAnalysis entry={active} />}
    </div>
  </>;
}
