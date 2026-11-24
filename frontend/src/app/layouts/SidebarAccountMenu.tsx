import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Check, ChevronsUpDown, LogOut, Plus, Settings2, UserRound, X } from 'lucide-react';
import type { SessionAccount } from '../../features/auth/hooks/useSession';
import { UserAvatar } from '../../shared/components/UserAvatar';
import { explain } from '../../shared/services/api';
import { useInterfaceLanguage } from '../language';
import { routeLabel, shellCopy } from '../shellCopy';
import { Link, routes } from '../router';
import './SidebarAccountMenu.css';

export type AccountAccess = {
  accounts: SessionAccount[];
  addAccount: (email: string, password: string) => Promise<void>;
  switchAccount: (id: string) => Promise<void>;
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

export function SidebarAccountMenu({ user, access, path, collapsed, onSelect, loggingOut, onRequestLogout }: {
  user: SessionAccount; access: AccountAccess; path: string; collapsed: boolean; loggingOut: boolean;
  onSelect: (event: MouseEvent<HTMLAnchorElement>, href: string) => void; onRequestLogout: () => void;
}) {
  const language = useInterfaceLanguage();
  const copy = shellCopy[language];
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const profileLink = useRef<HTMLAnchorElement>(null);
  const settingsLink = useRef<HTMLAnchorElement>(null);
  const [addingAccount, setAddingAccount] = useState(false);
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
    if (!addingAccount || !dialog.current || dialog.current.open) return;
    dialog.current.showModal();
    dialog.current.querySelector('input')?.focus({ preventScroll: true });
  }, [addingAccount]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (addingAccount || pending || loggingOut || event.defaultPrevented || event.repeat || event.isComposing || !trigger.current?.getClientRects().length ||
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
      onRequestLogout();
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [collapsed, addingAccount, pending, loggingOut, onRequestLogout]);

  function openAddAccount() {
    menu.current?.hidePopover();
    setError('');
    setAddingAccount(true);
  }

  function requestLogout() {
    menu.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
    setError('');
    onRequestLogout();
  }

  async function selectAccount(id: string) {
    if (pending) return;
    setError('');
    if (id === user.id) { menu.current?.hidePopover(); return; }
    setPending(true);
    try { await access.switchAccount(id); }
    catch (failure) { setError(explain(failure, { 401: copy.expiredAccount })); }
    finally { setPending(false); }
  }

  async function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') ?? '').trim().toLowerCase();
    if (accounts.some((account) => account.email.toLowerCase() === email)) {
      setError(copy.duplicateAccount);
      return;
    }
    setError('');
    setPending(true);
    try { await access.addAccount(email, String(fields.get('password') ?? '')); }
    catch (failure) { setError(explain(failure, { 401: copy.invalidCredentials })); }
    finally { setPending(false); }
  }

  return <div className="sidebar-account">
    <button type="button" className="sidebar-account-trigger" ref={trigger} popoverTarget="sidebar-account-menu"
      aria-label={copy.accountMenu} title={user.fullName}>
      <AccountIdentity account={user} />
      <ChevronsUpDown size={15} aria-hidden="true" />
    </button>
    <div id="sidebar-account-menu" popover="auto" className="sidebar-account-menu" ref={menu}>
      <nav className="sidebar-account-group" aria-label={copy.accountNavigation}>
        <Link ref={profileLink} className="sidebar-account-action" href={routes.profile} aria-keyshortcuts="Alt+Shift+P"
          aria-current={path === routes.profile ? 'page' : undefined} onClick={(event) => onSelect(event, routes.profile)}>
          <UserRound size={16} aria-hidden="true" /><span>{copy.viewProfile}</span><kbd aria-hidden="true">⇧ Alt P</kbd>
        </Link>
        <Link ref={settingsLink} className="sidebar-account-action" href={routes.settingsAccount} aria-keyshortcuts="Alt+Shift+S"
          aria-current={path === routes.settingsAccount ? 'page' : undefined} onClick={(event) => onSelect(event, routes.settingsAccount)}>
          <Settings2 size={16} aria-hidden="true" /><span>{routeLabel(language, routes.settingsAccount, 'Settings')}</span><kbd aria-hidden="true">⇧ Alt S</kbd>
        </Link>
      </nav>
      <div className="sidebar-account-group sidebar-account-switch" role="group" aria-labelledby="sidebar-account-switch-title">
        <p id="sidebar-account-switch-title">{copy.switchAccount}</p>
        {accounts.map((account) => <button key={account.id} type="button" className="sidebar-account-choice"
          aria-current={account.id === user.id ? 'true' : undefined} disabled={pending || loggingOut}
          onClick={() => void selectAccount(account.id)}>
          <AccountIdentity account={account} />
          <span className="sidebar-account-choice-mark" aria-hidden="true">{account.id === user.id && <Check size={12} />}</span>
        </button>)}
        {error && !addingAccount && <p className="sidebar-account-error" role="alert">{error}</p>}
        <button type="button" className="sidebar-account-action sidebar-account-add" aria-haspopup="dialog" disabled={pending || loggingOut}
          onClick={openAddAccount}><Plus size={17} aria-hidden="true" />{copy.addAccount}</button>
      </div>
      <div className="sidebar-account-group">
        <button type="button" className="sidebar-account-action sidebar-account-signout" aria-haspopup="dialog" aria-keyshortcuts="Alt+Shift+Q"
          disabled={pending || loggingOut} onClick={requestLogout}>
          <LogOut size={16} aria-hidden="true" /><span>{loggingOut ? copy.signingOut : copy.signOut}</span><kbd aria-hidden="true">⇧ Alt Q</kbd>
        </button>
      </div>
    </div>
    <dialog ref={dialog} className="app-dialog sidebar-account-dialog" aria-labelledby="sidebar-account-dialog-title"
      onCancel={(event) => { if (pending) event.preventDefault(); }}
      onClose={() => { setAddingAccount(false); setError(''); trigger.current?.focus({ preventScroll: true }); }}>
      {addingAccount && <>
        <header className="app-dialog-heading">
          <h2 id="sidebar-account-dialog-title">{copy.addAccount}</h2>
          <button type="button" className="app-dialog-close" aria-label={copy.close} disabled={pending} onClick={() => dialog.current?.close()}><X size={16} aria-hidden="true" /></button>
        </header>
        <form className="app-dialog-form" onSubmit={(event) => void addAccount(event)}>
          <p className="app-dialog-description">{copy.addAccountHint}</p>
          <label className="app-dialog-field">{copy.email}<input type="email" name="email" autoComplete="username" required maxLength={255} disabled={pending} /></label>
          <label className="app-dialog-field">{copy.pass}<input type="password" name="password" autoComplete="current-password" required maxLength={72} disabled={pending} /></label>
          {error && <p className="sidebar-account-error" role="alert">{error}</p>}
          <div className="app-dialog-actions">
            <button type="button" className="app-dialog-button" disabled={pending} onClick={() => dialog.current?.close()}>{copy.cancel}</button>
            <button type="submit" className="app-dialog-button" data-tone="accent" disabled={pending}>{pending ? copy.addingAccount : copy.addAccount}</button>
          </div>
        </form>
      </>}
    </dialog>
  </div>;
}
