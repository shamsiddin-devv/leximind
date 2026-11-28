import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';
import { BookOpen, ChevronDown, CircleHelp, LayoutGrid, LogOut, Menu, MoonStar, Sparkle, Sun, UserRound, Volume2, VolumeX, X } from 'lucide-react';
import { LanguagePicker } from '../../shared/components/LanguagePicker';
import { useInterfaceLanguage } from '../language';
import { groupLabel, routeLabel, shellCopy } from '../shellCopy';
import { Brand } from '../../shared/components/Brand';
import { UserAvatar } from '../../shared/components/UserAvatar';
import type { SessionAccount } from '../../features/auth/hooks/useSession';
import { VocabularySearch } from '../../features/vocabulary/components/VocabularySearch';
import { NotificationMenu } from '../../features/notifications/NotificationMenu';
import { OnboardingTour } from '../../features/onboarding/OnboardingTour';
import { onboardingCopy } from '../../features/onboarding/onboardingCopy';
import { accountNavigation, navigation, navigationPages, settingsNavigation, type NavigationGroup, type NavigationItem } from '../navigation';
import { Link, routes, workspaceParent } from '../router';
import { getTheme, subscribeToTheme, toggleTheme } from '../theme';
import { SidebarAccountMenu, type AccountAccess } from './SidebarAccountMenu';
import './AppLayout.css';

const quickLinks = [...navigationPages.values()];

type SelectPage = (event: MouseEvent<HTMLAnchorElement>, href: string) => void;

function SidebarGroups({ selected, expanded, panelId, onSelect }: {
  selected: NavigationGroup;
  expanded: boolean;
  panelId: string;
  onSelect: (group: NavigationGroup) => void;
}) {
  const language = useInterfaceLanguage();
  return <nav className="app-rail-groups" aria-label={shellCopy[language].navigation}>
    {navigation.map((group) => <button key={group.title} type="button" lang={language === 'ru' ? 'ru' : 'en'} className="app-nav-link app-nav-group-button"
      aria-label={groupLabel(language, group.title)} title={groupLabel(language, group.title)} aria-controls={panelId}
      aria-expanded={expanded && group === selected} data-active={group === selected || undefined}
      data-tour-anchor={group.items.some((item) => item.href === routes.reviewCenter) ? 'progress' : undefined}
      onClick={() => onSelect(group)}>
      <group.icon size={20} strokeWidth={1.7} aria-hidden="true" />
    </button>)}
  </nav>;
}

function AccountNavigation({ activePath, compact = false, onSelect, loggingOut, onRequestLogout }: {
  activePath?: string;
  compact?: boolean;
  onSelect: SelectPage;
  loggingOut: boolean;
  onRequestLogout: () => void;
}) {
  const language = useInterfaceLanguage();
  const copy = shellCopy[language];
  return <nav className="app-nav-account" aria-label={copy.accountNavigation}>
    {accountNavigation.map(({ href, label, icon: Icon }) => <Link key={href}
      className="app-nav-link" href={href} lang={language === 'ru' ? 'ru' : 'en'} aria-label={compact ? routeLabel(language, href, label) : undefined}
      title={compact ? routeLabel(language, href, label) : undefined}
      aria-current={activePath === href ? 'page' : href === routes.settingsAccount &&
        settingsNavigation.items.some((item) => item.href === activePath) ? 'location' : undefined}
      onClick={(event) => onSelect(event, href)}>
      <Icon size={compact ? 20 : 17} strokeWidth={1.7} aria-hidden="true" />
      {!compact && routeLabel(language, href, label)}
    </Link>)}
    <div className="app-nav-logout">
      <button type="button" className="app-nav-link" disabled={loggingOut}
        aria-label={compact ? (loggingOut ? copy.signingOut : copy.signOut) : undefined}
        title={compact ? copy.signOut : undefined} aria-haspopup="dialog" onClick={onRequestLogout}>
        <LogOut size={compact ? 20 : 17} strokeWidth={1.7} aria-hidden="true" />
        {!compact && (loggingOut ? copy.signingOut : copy.signOut)}
      </button>
    </div>
  </nav>;
}

function SidebarNavigation({ group, activePath, onSelect, id }: {
  group: NavigationGroup;
  activePath?: string;
  onSelect: SelectPage;
  id?: string;
}) {
  const language = useInterfaceLanguage();
  const itemsRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{
    top: number; left: number; width: number; height: number; path: string; slide: boolean;
  }>();

  useLayoutEffect(() => {
    const items = itemsRef.current;
    const active = items?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!items || !active || !activePath) {
      setIndicator(undefined);
      return;
    }

    function measure(items: HTMLDivElement, active: HTMLElement, path: string) {
      const next = {
        top: active.offsetTop,
        left: active.offsetLeft,
        width: active.offsetWidth,
        height: active.offsetHeight,
      };
      if (!next.width || !next.height) return;

      setIndicator((last) => {
        if (last?.path === path && last.top === next.top && last.left === next.left &&
          last.width === next.width && last.height === next.height) return last;

        return { ...next, path, slide: last?.path === path ? last.slide : Boolean(last) };
      });

      const previousScroll = items.scrollTop;
      const bottom = next.top + next.height + 4;
      if (next.top - 4 < previousScroll) items.scrollTop = next.top - 4;
      else if (bottom > previousScroll + items.clientHeight) items.scrollTop = bottom - items.clientHeight;
    }

    measure(items, active, activePath);
    const observer = new ResizeObserver(() => measure(items, active, activePath));
    observer.observe(items);
    if (items.firstElementChild) observer.observe(items.firstElementChild);
    observer.observe(active);
    return () => observer.disconnect();
  }, [activePath, language]);

  function renderLink({ href, label, icon: Icon }: NavigationItem) {
    const learning = href === routes.vocabulary ? 'vocabulary' : href === routes.games ? 'games' : undefined;
    return <Link key={href} href={href} lang={language === 'ru' ? 'ru' : 'en'} className="app-nav-link"
      data-tour-anchor={learning}
      aria-current={activePath === href ? 'page' : undefined} onClick={(event) => onSelect(event, href)}>
      <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
      <span>{routeLabel(language, href, label)}</span>
      {learning && <Sparkle className="app-nav-learning-badge" size={13} aria-hidden="true" />}
    </Link>;
  }

  const showIndicator = Boolean(activePath && indicator);
  return <nav id={id} className="app-nav" aria-label={groupLabel(language, group.title)} lang={language === 'ru' ? 'ru' : 'en'}>
    <div ref={itemsRef} className="app-nav-items" data-indicator={showIndicator || undefined}
      data-slide={showIndicator && indicator?.slide ? true : undefined}>
      <div className="app-nav-group">
        <p className="app-nav-heading" aria-hidden="true">{groupLabel(language, group.title)}</p>
        {group.items.map(renderLink)}
      </div>
      {indicator && <span className="app-nav-indicator" aria-hidden="true" style={{
        left: indicator.left, width: indicator.width, height: indicator.height,
        transform: 'translateY(' + indicator.top + 'px)',
      }} />}
    </div>
  </nav>;
}

export function AppLayout({ children, path, token, user, accountAccess, practicing, sound, soundAvailable, onToggleSound, tourEligible, onExitPractice, loggingOut, onLogout, collapsed, onCollapsedChange }: {
  children: ReactNode; path: string; token: string; user: SessionAccount; accountAccess: AccountAccess; practicing: boolean; sound: boolean; soundAvailable: boolean;
  onToggleSound: () => void; onExitPractice: () => void; loggingOut: boolean; onLogout: () => void;
  tourEligible: boolean;
  collapsed: boolean; onCollapsedChange: (collapsed: boolean) => void;
}) {
  const language = useInterfaceLanguage();
  const copy = shellCopy[language];
  const isDark = useSyncExternalStore(subscribeToTheme, getTheme) === 'dark';
  const { fullName: name, avatarUrl } = user;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tourRequest, setTourRequest] = useState(0);
  const drawer = useRef<HTMLDialogElement>(null);
  const mobileMenuTrigger = useRef<HTMLButtonElement>(null);
  const quickTrigger = useRef<HTMLButtonElement>(null);
  const closeDrawerButton = useRef<HTMLButtonElement>(null);
  const logoutDialog = useRef<HTMLDialogElement>(null);
  const cancelLogoutButton = useRef<HTMLButtonElement>(null);
  const activePath = practicing ? undefined : workspaceParent(path);
  const routeGroup = settingsNavigation.items.some((item) => item.href === workspaceParent(path)) ? settingsNavigation
    : navigation.find((group) => group.items.some((item) => item.href === workspaceParent(path)));
  const [groupSelection, setGroupSelection] = useState({ path, group: routeGroup ?? navigation[0] });
  const fallbackGroup = groupSelection.group === settingsNavigation ? navigation[0] : groupSelection.group;
  const selectedGroup = groupSelection.path === path ? groupSelection.group : routeGroup ?? fallbackGroup;

  if (groupSelection.path !== path) setGroupSelection({ path, group: selectedGroup });

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1025px)');
    const closeOnDesktop = () => { if (desktop.matches) drawer.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => { drawer.current?.close(); }, [path]);

  function openDrawer() {
    if (!drawer.current || drawer.current.open) return;
    drawer.current.showModal();
    closeDrawerButton.current?.focus({ preventScroll: true });
    setDrawerOpen(true);
  }

  function requestLogout() {
    const dialog = logoutDialog.current;
    if (loggingOut || !dialog || dialog.open) return;
    dialog.showModal();
    cancelLogoutButton.current?.focus({ preventScroll: true });
  }

  function confirmLogout() {
    logoutDialog.current?.close();
    drawer.current?.close();
    onLogout();
  }

  function goTo(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    drawer.current?.close();
    event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover();
    if (practicing && path === href) onExitPractice();
  }

  function goToAccount(event: MouseEvent<HTMLAnchorElement>, href: string) {
    goTo(event, href);
    if (!settingsNavigation.items.some((item) => item.href === href) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setGroupSelection({ path, group: settingsNavigation });
    onCollapsedChange(false);
  }


  return <div className="app-shell" lang={language} data-collapsed={collapsed}>
    <header className="app-topbar">
      <div className="app-menu-slot">
        <button type="button" className="app-control app-desktop-toggle" data-tour-anchor="menu"
          aria-label={collapsed ? copy.expandMenu : copy.collapseMenu}
          aria-expanded={!collapsed} aria-controls="app-sidebar-panel" onClick={() => onCollapsedChange(!collapsed)}>
          <Menu size={21} aria-hidden="true" />
        </button>
        <button ref={mobileMenuTrigger} type="button" className="app-control app-mobile-toggle" data-tour-anchor="menu" aria-label={copy.openMenu}
          aria-expanded={drawerOpen} aria-controls="app-mobile-drawer"
          onClick={openDrawer}>
          <Menu size={21} aria-hidden="true" />
        </button>
      </div>
      <div className="app-topbar-brand"><Brand wordmark label={'LexiMind · ' + routeLabel(language, routes.dashboard, 'Dashboard')} href={routes.dashboard} onClick={(event) => goTo(event, routes.dashboard)} /></div>
      <div className="app-shortcuts">
        <VocabularySearch token={token} onNavigate={() => { if (practicing && path === routes.vocabulary) onExitPractice(); }} />
        <button ref={quickTrigger} type="button" className="app-control app-toolbar-control app-quick-trigger" popoverTarget="app-quick-links" aria-label={copy.quick} title={copy.quick}>
          <LayoutGrid size={17} strokeWidth={1.65} aria-hidden="true" />
        </button>
        <div id="app-quick-links" popover="auto" className="app-topbar-popover app-quick-popover" aria-label={copy.quick}>
          <p className="app-popover-title">{copy.quick}</p>
          {!practicing && <button type="button" className="app-popover-item" aria-haspopup="dialog" onClick={(event) => {
            event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover();
            quickTrigger.current?.focus({ preventScroll: true });
            setTourRequest((request) => request + 1);
          }}><CircleHelp size={17} aria-hidden="true" />{onboardingCopy[language].label}</button>}
          {quickLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} lang={language === 'ru' ? 'ru' : 'en'}
            className="app-popover-item" aria-current={activePath === href ? 'page' : undefined} onClick={(event) => goTo(event, href)}>
            <Icon size={17} aria-hidden="true" />{routeLabel(language, href, label)}
          </Link>)}
        </div>
      </div>
      <div className="app-topbar-actions">
        <button type="button" className="app-control app-toolbar-control" aria-label={copy.dark} title={isDark ? copy.toLight : copy.toDark}
          aria-pressed={isDark} onClick={toggleTheme}>
          {isDark ? <Sun size={18} strokeWidth={1.7} aria-hidden="true" /> : <MoonStar size={18} strokeWidth={1.7} aria-hidden="true" />}
        </button>
        <NotificationMenu key={token} token={token} onNavigate={goTo} />
        <LanguagePicker compact />
        <button type="button" className="app-control app-account" popoverTarget="app-account-menu" aria-label={copy.profileMenu} title={name}>
          <UserAvatar className="app-account-avatar" name={name} url={avatarUrl} />
          <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
        </button>
        <div id="app-account-menu" popover="auto" className="app-topbar-popover app-account-popover" aria-label={copy.profileMenu}>
          <p className="app-popover-title">{name}</p>
          <Link href={routes.profile} lang={language === 'ru' ? 'ru' : 'en'} className="app-popover-item" onClick={(event) => goTo(event, routes.profile)}>
            <UserRound size={17} aria-hidden="true" />{routeLabel(language, routes.profile, 'Profile')}
          </Link>
          <button type="button" className="app-popover-item" aria-pressed={sound} disabled={!soundAvailable} onClick={onToggleSound}>
            {sound ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />} {copy.sound}
          </button>
        </div>
      </div>
    </header>

    <aside className="app-sidebar" aria-label={copy.sidebar}>
      <div className="app-rail">
        <SidebarGroups selected={selectedGroup} expanded={!collapsed} panelId="app-sidebar-panel"
          onSelect={(group) => { setGroupSelection({ path, group }); onCollapsedChange(false); }} />
        <AccountNavigation activePath={activePath} compact onSelect={goToAccount} loggingOut={loggingOut} onRequestLogout={requestLogout} />
      </div>
      <div id="app-sidebar-panel" className="app-sidebar-panel" inert={collapsed}>
        <SidebarNavigation key={selectedGroup.title} group={selectedGroup} activePath={activePath} onSelect={goTo} />
        <SidebarAccountMenu user={user} access={accountAccess} path={path} collapsed={collapsed}
          onSelect={goToAccount} loggingOut={loggingOut} onRequestLogout={requestLogout} />
      </div>
    </aside>

    <div className="app-workspace">
      <main id="main" className={activePath === routes.learningPath || activePath === routes.vocabulary ? 'course-main' : undefined} tabIndex={-1} lang={path === routes.dashboard && !practicing ? language : 'uz'}>{children}</main>
      <footer className="footer"><div className="container"><span><BookOpen size={16} /> LexiMind</span>
        <span>{copy.footer}</span></div></footer>
    </div>

    <dialog id="app-mobile-drawer" ref={drawer} className="app-drawer" aria-label={copy.sidebar}
      onClose={() => setDrawerOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) drawer.current?.close(); }}>
      <div className="app-drawer-panel">
        <div className="app-drawer-header"><Brand wordmark label={'LexiMind · ' + routeLabel(language, routes.dashboard, 'Dashboard')} href={routes.dashboard} onClick={(event) => goTo(event, routes.dashboard)} />
          <button type="button" className="app-control" aria-label={copy.closeMenu} ref={closeDrawerButton}
            onClick={() => drawer.current?.close()}><X size={21} aria-hidden="true" /></button>
        </div>
        {!practicing && <button type="button" className="app-nav-link app-mobile-tour-link" aria-haspopup="dialog" onClick={() => {
          drawer.current?.close();
          mobileMenuTrigger.current?.focus({ preventScroll: true });
          setTourRequest((request) => request + 1);
        }}><CircleHelp size={17} aria-hidden="true" />{onboardingCopy[language].label}</button>}
        <SidebarGroups selected={selectedGroup} expanded={drawerOpen} panelId="app-mobile-links"
          onSelect={(group) => setGroupSelection({ path, group })} />
        <SidebarNavigation id="app-mobile-links" key={selectedGroup.title} group={selectedGroup} activePath={activePath} onSelect={goTo} />
        <AccountNavigation activePath={activePath} onSelect={goToAccount} loggingOut={loggingOut}
          onRequestLogout={requestLogout} />
      </div>
    </dialog>
    <dialog ref={logoutDialog} className="app-dialog sidebar-account-dialog" aria-labelledby="app-logout-title"
      aria-describedby="app-logout-description">
      <header className="app-dialog-heading">
        <h2 id="app-logout-title">{copy.signOutTitle}</h2>
        <button type="button" className="app-dialog-close" aria-label={copy.close} onClick={() => logoutDialog.current?.close()}>
          <X size={16} aria-hidden="true" />
        </button>
      </header>
      <p id="app-logout-description" className="app-dialog-description">{copy.signOutDetail}</p>
      <div className="app-dialog-actions">
        <button ref={cancelLogoutButton} type="button" className="app-dialog-button" onClick={() => logoutDialog.current?.close()}>{copy.cancel}</button>
        <button type="button" className="app-dialog-button" data-tone="accent" onClick={confirmLogout}>{copy.signOut}</button>
      </div>
    </dialog>
    <OnboardingTour userId={user.id} language={language} canStart={tourEligible && !practicing} request={tourRequest} />
  </div>;
}
