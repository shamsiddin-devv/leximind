import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, routes } from '../../../app/router';
import { Brand } from '../../../shared/components/Brand';

export function AuthLayout({ children, title, description, login = false }: { children: ReactNode; title: string; description: string; login?: boolean }) {
  return <div className="welcome-site welcome-login">
    <main id="main" tabIndex={-1}>
      <div className="welcome-login-content">
        <div className="welcome-login-mobile-brand"><Brand wordmark /></div>
        <Link className="welcome-login-back" href={login ? routes.home : routes.login}><ArrowLeft size={13} />{login ? 'Bosh sahifa' : 'Kirish sahifasi'}</Link>
        <h1 id="welcome-login-title">{title}</h1>
        <p>{description}</p>
        {children}
        {login && <>
          <div className="welcome-login-divider">yoki</div>
          <Link className="welcome-button welcome-login-register" href={routes.register}>Yangi hisob yaratish</Link>
          <Link className="welcome-login-recover" href={routes.recover}>Parolni unutdingizmi?</Link>
        </>}
      </div>
    </main>
    <aside className="welcome-login-aside" aria-label="LexiMind haqida">
      <Brand wordmark />
      <div className="welcome-login-pitch">
        <p>Daraja — taxmin emas,<br /><em>aniq o‘lchov.</em></p>
        <p>Har kuni o‘n daqiqa. Har hafta ko‘rinadigan natija. Sizning darajangiz, sizning tezligingiz.</p>
        <ul aria-label="Boshlang‘ich test darajalari">{['A1', 'A2', 'B1', 'B2', 'C1'].map(level => <li key={level} data-highlight={level === 'B1' || undefined}>{level}</li>)}</ul>
      </div>
      <dl>{[['6 ta', 'Test savoli'], ['5–20 daq', 'Kunlik maqsad'], ['3 daq', 'Daraja testi']].map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </aside>
  </div>;
}
