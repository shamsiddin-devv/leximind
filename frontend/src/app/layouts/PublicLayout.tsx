import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Brand } from '../../shared/components/Brand';
import { Link, routes } from '../router';

export function PublicLayout({ children, signedIn = false }: { children: ReactNode; signedIn?: boolean }) {
  return <>
    <header className="site-header public-header">
      <div className="container public-header-inner">
        <Brand />
        <nav className="public-nav" aria-label="Ochiq sahifalar">
          {signedIn ? <Link className="button primary" href={routes.dashboard} lang="en">Dashboard <ArrowRight size={17} /></Link> : <>
            <Link className="public-login" href={routes.login} lang="en">Log In</Link>
            <Link className="button primary" href={routes.register} lang="en">Sign Up <ArrowRight size={16} /></Link>
          </>}
        </nav>
      </div>
    </header>
    <main id="main" tabIndex={-1}>{children}</main>
    <footer className="footer"><div className="container"><Brand /><span>Inglizcha so‘zlarni o‘rganish va takrorlash</span></div></footer>
  </>;
}
