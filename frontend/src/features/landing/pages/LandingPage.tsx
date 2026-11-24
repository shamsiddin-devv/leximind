import { ArrowDown, ArrowRight, ArrowUpRight, Award, CalendarCheck, Check, Clock3, Layers, Target, TrendingUp, Zap } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Brand } from '../../../shared/components/Brand';
import { LanguagePicker } from '../../../shared/components/LanguagePicker';
import { LandingPreview } from '../components/LandingPreview';
import { landingCopy } from '../copy';
import type { InterfaceLanguage } from '../../../app/language';
import './LandingPage.css';

const sectionIds = ['#platforma', '#darajalar', '#afzalliklar'];
const stepIcons = [Target, CalendarCheck, Zap];
const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
const benefitIcons = [Clock3, TrendingUp, Layers, Award];

export function LandingPage({ signedIn, language }: { signedIn: boolean; language: InterfaceLanguage }) {
  const copy = landingCopy[language];
  const start = signedIn ? routes.dashboard : routes.register;
  const secondary = signedIn ? routes.demo : routes.login;
  const secondaryLabel = signedIn ? copy.tryPractice : copy.haveAccount;
  return <div className="welcome-site" lang={language}>
    <header className="welcome-header">
      <div className="welcome-header-inner">
        <Brand wordmark label={copy.homeLabel} />
        <nav className="welcome-nav" aria-label={copy.navigation}>
          {copy.sections.map(([label], index) => <a key={sectionIds[index]} href={sectionIds[index]}>{label}</a>)}
        </nav>
        <div className="welcome-header-actions">
          <LanguagePicker />
          {!signedIn && <Link className="welcome-header-login" href={routes.login}>{copy.login}</Link>}
          <Link className="welcome-button welcome-primary" href={start}>{signedIn ? copy.dashboard : copy.start} <ArrowUpRight size={14} aria-hidden="true" /></Link>
        </div>
      </div>
    </header>
    <main id="main" tabIndex={-1}>
      <section className="welcome-hero" aria-labelledby="welcome-title">
        <div className="welcome-bound">
          <div className="welcome-intro">
            <span className="welcome-tag"><i /> {copy.levelBadge}</span>
            <h1 id="welcome-title">{copy.hero[0]} <em>{copy.hero[1]}</em>{copy.hero[2] ? ' ' + copy.hero[2] : ''}</h1>
            <p>{copy.description}</p>
            <div className="welcome-intro-actions">
              <Link className="welcome-button welcome-primary" href={start}>{signedIn ? copy.resume : copy.freeStart} <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link className="welcome-button" href={secondary}>{secondaryLabel}</Link>
            </div>
            <small>{copy.heroNote}</small>
          </div>
          <LandingPreview copy={copy.preview} />
          <dl className="welcome-highlights">{copy.highlights.map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </div>
      </section>
      <section className="welcome-section" id="platforma" aria-labelledby="welcome-platform">
        <div className="welcome-bound welcome-platform">
          <div><span className="welcome-eyebrow">{copy.sections[0][0]}</span>
            <h2 id="welcome-platform">{copy.platformTitle[0]}<br />{copy.platformTitle[1]} <em>{copy.platformTitle[2]}</em></h2>
            <p>{copy.platformIntro}</p>
          </div>
          <ol className="welcome-steps">{copy.steps.map(([title, text], index) => {
            const Icon = stepIcons[index];
            return <li key={index}><span aria-hidden="true">0{index + 1}</span>
              <div><h3><Icon size={16} aria-hidden="true" />{title}</h3><p>{text}</p></div></li>;
          })}</ol>
        </div>
      </section>
      <section className="welcome-section welcome-level-section" id="darajalar" aria-labelledby="welcome-levels">
        <div className="welcome-bound">
          <div className="welcome-level-head"><div><span className="welcome-eyebrow">{copy.sections[1][0]}</span><h2 id="welcome-levels">{copy.levelTitle}</h2></div>
            <p>{copy.levelIntro}</p>
          </div>
          <ol className="welcome-levels">{levels.map((level, index) => <li key={level} data-highlight={level === 'B1' || undefined}>
            <span className="welcome-level-dot" /><h3>{level}{level === 'B1' && <small>{copy.example}</small>}</h3>
            <strong>{copy.levels[index][0]}</strong><p>{copy.levels[index][1]}</p>
          </li>)}</ol>
        </div>
      </section>
      <section className="welcome-section" id="afzalliklar" aria-labelledby="welcome-benefits">
        <div className="welcome-bound"><span className="welcome-eyebrow">{copy.sections[2][0]}</span><h2 id="welcome-benefits">{copy.benefitsTitle}</h2>
          <div className="welcome-benefits">{copy.benefits.map(([title, text], index) => {
            const Icon = benefitIcons[index];
            return <article key={index}><span className="welcome-tile-icon"><Icon size={18} aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p></article>;
          })}</div>
        </div>
      </section>
      <section className="welcome-section" id="boshlash" aria-labelledby="welcome-start">
        <div className="welcome-bound">
          <div className="welcome-start">
            <div className="welcome-start-copy"><span className="welcome-eyebrow">{copy.start}</span><h2 id="welcome-start">{copy.startTitle[0]}<br /><em>{copy.startTitle[1]}</em></h2>
              <p>{copy.startIntro}</p>
              <ul>{copy.checklist.map((item) => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul>
            </div>
            <div className="welcome-start-actions">
              <Link href={start}><span><strong>{signedIn ? copy.openDashboard : copy.createAccount}</strong><small>{copy.testDetails}</small></span><ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href={secondary}><span><strong>{secondaryLabel}</strong><small>{signedIn ? copy.interactive : copy.credentials}</small></span><ArrowRight size={18} aria-hidden="true" /></Link>
              <small>{copy.privacyNote}</small>
            </div>
          </div>
        </div>
      </section>
    </main>
    <footer className="welcome-footer"><div className="welcome-bound">
      <div className="welcome-footer-grid">
        <div><Brand wordmark label={copy.homeLabel} /><p>{copy.footerAbout}</p></div>
        <div><span className="welcome-eyebrow">{copy.sections[0][0]}</span>{copy.sections.map(([, label], index) => <a key={sectionIds[index]} href={sectionIds[index]}>{label}</a>)}</div>
        <div><span className="welcome-eyebrow">{copy.account}</span>{signedIn ? <Link href={routes.dashboard}>{copy.dashboard}</Link> : <><Link href={routes.register}>{copy.register}</Link><Link href={routes.login}>{copy.login}</Link></>}
          <Link href={routes.leaderboard}>{copy.leaderboard}</Link><Link href={routes.demo}>{copy.tryPractice} <ArrowDown size={12} aria-hidden="true" /></Link></div>
      </div>
      <div className="welcome-footer-note"><span>© {new Date().getFullYear()} LexiMind. {copy.rights}</span><span>{copy.cefr}</span></div>
    </div></footer>
  </div>;
}
