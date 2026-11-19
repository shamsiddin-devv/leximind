import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Check, ChevronsUpDown, LogOut, Plus, Settings2, UserRound, X } from 'lucide-react';
import type { SessionAccount } from '../../features/auth/hooks/useSession';
import { UserAvatar } from '../../shared/components/UserAvatar';
import { explain } from '../../shared/services/api';
import { Link, routes } from '../router';
import './SidebarAccountMenu.css';

export type AccountAccess = {
  accounts: SessionAccount[];
  addAccount: (email: string, password: string) => Promise<void>;
  switchAccount: (id: string) => Promise<void>;
};

type AccountDialog = 'add' | 'logout';
const dialogTitles: Record<AccountDialog, string> = {
  add: 'Akkaunt qo‘shish', logout: 'Akkauntdan chiqish',
};

function AccountIdentity({ account }: { account: SessionAccount }) {
  return <>
    <UserAvatar className="app-account-avatar sidebar-account-avatar" name={account.fullName} url={account.avatarUrl} />
    <span className="sidebar-account-identity">
      <strong>{account.fullName}</strong>
      <span title={account.email}>{account.email}</span>
    </span>
  </>;
}

export function SidebarAccountMenu({ user, access, path, collapsed, onSelect, loggingOut, onLogout }: {
  user: SessionAccount; access: AccountAccess; path: string; collapsed: boolean; loggingOut: boolean;
  onSelect: (event: MouseEvent<HTMLAnchorElement>, href: string) => void; onLogout: () => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const profileLink = useRef<HTMLAnchorElement>(null);
  const settingsLink = useRef<HTMLAnchorElement>(null);
  const [panel, setPanel] = useState<AccountDialog>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const accounts = [user, ...access.accounts.filter((account) => account.id !== user.id)];

  useEffect(() => { menu.current?.hidePopover(); }, [path, collapsed]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1025px)');
    function closeOnMobile() {
      if (desktop.matches) return;
      menu.current?.hidePopover();
      dialog.current?.close();
    }
    desktop.addEventListener('change', closeOnMobile);
    return () => desktop.removeEventListener('change', closeOnMobile);
  }, []);

  useEffect(() => {
    if (!panel || !dialog.current || dialog.current.open) return;
    dialog.current.showModal();
    if (panel === 'add') dialog.current.querySelector('input')?.focus({ preventScroll: true });
  }, [panel]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (panel || pending || loggingOut || event.defaultPrevented || event.repeat || event.isComposing || !trigger.current?.getClientRects().length ||
        !event.altKey || !event.shiftKey || event.metaKey || event.ctrlKey ||
        (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable], dialog'))) return;
      const link = event.code === 'KeyP' ? profileLink.current : event.code === 'KeyS' ? settingsLink.current : null;
      if (link) {
        event.preventDefault();
        link.click();
        return;
      }
      if (event.code !== 'KeyQ' || collapsed) return;
      event.preventDefault();
      menu.current?.hidePopover();
      setError('');
      setPanel('logout');
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [collapsed, panel, pending, loggingOut]);

  function openPanel(next: AccountDialog) {
    menu.current?.hidePopover();
    setError('');
    setPanel(next);
  }

  async function selectAccount(id: string) {
    if (pending) return;
    setError('');
    if (id === user.id) { menu.current?.hidePopover(); return; }
    setPending(true);
    try { await access.switchAccount(id); }
    catch (failure) { setError(explain(failure, { 401: 'Bu akkaunt seansi tugagan. Uni qayta qo‘shing.' })); }
    finally { setPending(false); }
  }

  async function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') ?? '').trim().toLowerCase();
    if (accounts.some((account) => account.email.toLowerCase() === email)) {
      setError('Bu akkaunt ro‘yxatda bor. Uni almashtirish bo‘limidan tanlang.');
      return;
    }
    setError('');
    setPending(true);
    try { await access.addAccount(email, String(fields.get('password') ?? '')); }
    catch (failure) { setError(explain(failure, { 401: 'Email yoki parol noto‘g‘ri.' })); }
    finally { setPending(false); }
  }

  return <div className="sidebar-account">
    <button type="button" className="sidebar-account-trigger" ref={trigger} popoverTarget="sidebar-account-menu"
      aria-label="Yon menyudagi akkaunt boshqaruvi" title={user.fullName}>
      <AccountIdentity account={user} />
      <ChevronsUpDown size={15} aria-hidden="true" />
    </button>
    <div id="sidebar-account-menu" popover="auto" className="sidebar-account-menu" ref={menu}>
      <nav className="sidebar-account-group" aria-label="Akkauntga o‘tish">
        <Link ref={profileLink} className="sidebar-account-action" href={routes.profile} aria-keyshortcuts="Alt+Shift+P"
          aria-current={path === routes.profile ? 'page' : undefined} onClick={(event) => onSelect(event, routes.profile)}>
          <UserRound size={16} aria-hidden="true" /><span>Profilni ko‘rish</span><kbd aria-hidden="true">⇧ Alt P</kbd>
        </Link>
        <Link ref={settingsLink} className="sidebar-account-action" href={routes.settingsAccount} aria-keyshortcuts="Alt+Shift+S"
          aria-current={path === routes.settingsAccount ? 'page' : undefined} onClick={(event) => onSelect(event, routes.settingsAccount)}>
          <Settings2 size={16} aria-hidden="true" /><span>Akkaunt sozlamalari</span><kbd aria-hidden="true">⇧ Alt S</kbd>
        </Link>
      </nav>
      <div className="sidebar-account-group sidebar-account-switch" role="group" aria-labelledby="sidebar-account-switch-title">
        <p id="sidebar-account-switch-title">Akkauntni almashtirish</p>
        {accounts.map((account) => <button key={account.id} type="button" className="sidebar-account-choice"
          aria-current={account.id === user.id ? 'true' : undefined} disabled={pending || loggingOut}
          onClick={() => void selectAccount(account.id)}>
          <AccountIdentity account={account} />
          <span className="sidebar-account-choice-mark" aria-hidden="true">{account.id === user.id && <Check size={12} />}</span>
        </button>)}
        {error && !panel && <p className="sidebar-account-error" role="alert">{error}</p>}
        <button type="button" className="sidebar-account-action sidebar-account-add" aria-haspopup="dialog" disabled={pending || loggingOut}
          onClick={() => openPanel('add')}><Plus size={17} aria-hidden="true" />Akkaunt qo‘shish</button>
      </div>
      <div className="sidebar-account-group">
        <button type="button" className="sidebar-account-action sidebar-account-signout" aria-haspopup="dialog" aria-keyshortcuts="Alt+Shift+Q"
          disabled={pending || loggingOut} onClick={() => openPanel('logout')}>
          <LogOut size={16} aria-hidden="true" /><span>{loggingOut ? 'Chiqilmoqda…' : 'Chiqish'}</span><kbd aria-hidden="true">⇧ Alt Q</kbd>
        </button>
      </div>
    </div>
    <dialog ref={dialog} className="sidebar-account-dialog" aria-labelledby="sidebar-account-dialog-title"
      onCancel={(event) => { if (pending) event.preventDefault(); }}
      onClose={() => { setPanel(undefined); setError(''); trigger.current?.focus({ preventScroll: true }); }}>
      {panel && <>
        <header>
          <h2 id="sidebar-account-dialog-title">{dialogTitles[panel]}</h2>
          <button type="button" className="icon-button" aria-label="Yopish" disabled={pending} onClick={() => dialog.current?.close()}><X size={18} /></button>
        </header>
        {panel === 'add' && <form className="account-form" onSubmit={(event) => void addAccount(event)}>
          <p>Boshqa LexiMind akkauntingizga kiring. Joriy seans ham shu brauzer varag‘ida saqlanadi.</p>
          <label>Email manzili<input type="email" name="email" autoComplete="username" required maxLength={255} disabled={pending} /></label>
          <label>Parol<input type="password" name="password" autoComplete="current-password" required maxLength={72} disabled={pending} /></label>
          {error && <p className="sidebar-account-error" role="alert">{error}</p>}
          <div className="sidebar-account-dialog-actions">
            <button type="button" className="button secondary" disabled={pending} onClick={() => dialog.current?.close()}>Bekor qilish</button>
            <button type="submit" className="button primary" disabled={pending}>{pending ? 'Kirilmoqda…' : 'Kirish'}</button>
          </div>
        </form>}
        {panel === 'logout' && <>
          <p>Joriy akkaunt seansi yakunlanadi.</p>
          <div className="sidebar-account-dialog-actions">
            <button type="button" className="button secondary" onClick={() => dialog.current?.close()}>Bekor qilish</button>
            <button type="button" className="button primary" onClick={() => { dialog.current?.close(); onLogout(); }}>Chiqish</button>
          </div>
        </>}
      </>}
    </dialog>
  </div>;
}
