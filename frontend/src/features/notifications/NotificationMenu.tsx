import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { AlarmClock, Bell, BookOpen, Check, CheckCheck, ChevronLeft, ChevronRight, ClipboardList, Flame, Inbox as InboxIcon, Settings2, TrendingUp, Trophy, X } from 'lucide-react';
import { useInterfaceLanguage, type InterfaceLanguage } from '../../app/language';
import { Link, routes } from '../../app/router';
import { shellCopy } from '../../app/shellCopy';
import { api } from '../../shared/services/api';
import { uzbekMonths } from '../../shared/utils/date';
import './NotificationMenu.css';

type Kind = keyof typeof notificationTargets;
type Item = {
  id: string; type: Kind; createdAt: string; readAt: string | null;
  data: { count?: number; minutes?: number; words?: number; level?: string; title?: string; body?: string };
};
type Inbox = { data: Item[]; total: number; unreadCount: number };
const size = 15;

const notificationTargets = {
  review: [BookOpen, routes.reviewCenter],
  daily: [AlarmClock, routes.studyPlan],
  streak: [Flame, routes.learningCalendar],
  achievements: [Trophy, routes.achievements],
  progress: [TrendingUp, routes.statistics],
  weekly: [ClipboardList, routes.learningCalendar],
  news: [Bell, routes.settingsNotifications],
} as const;

type NotificationCopy = { readAll: string; read: string; settings: string; retry: string; loadError: string; pending: string; earlier: string; later: string; unread: (count: number) => string; messages: Record<Kind, (data: Item['data']) => string> };
const copy: Record<InterfaceLanguage, NotificationCopy> = {
  uz: {
    readAll: 'Barchasini o‘qildi deb belgilash', read: 'O‘qildi deb belgilash', settings: 'Sozlamalar', retry: 'Qayta urinish', loadError: 'Bildirishnomalarni yangilab bo‘lmadi.', pending: 'Yuklanmoqda…', earlier: 'Avvalgilar', later: 'Yangilari',
    unread: (count) => count ? count + ' ta o‘qilmagan xabar' : 'Barcha xabarlar o‘qilgan',
    messages: {
      review: ({ count }) => count ? count + ' ta karta takrorlashga tayyor.' : 'Takrorlash vaqti keldi.',
      daily: () => 'Bugungi mashqingiz vaqti keldi.',
      streak: ({ count }) => count ? count + ' kunlik seriyangizni davom ettiring.' : 'O‘rganish seriyangizni davom ettiring.',
      achievements: () => 'Yangi yutuqqa erishdingiz.',
      progress: ({ level, count }) => level ? 'Yangi darajangiz — ' + level + '.' : count ? count + ' XP marrasiga yetdingiz.' : 'O‘rganishda yangi marraga yetdingiz.',
      weekly: ({ minutes, words }) => `Haftalik hisobot · ${minutes ?? 0} daqiqa, ${words ?? 0} ta so‘z.`,
      news: ({ title }) => title || 'LexiMind yangiliklari.',
    },
  },
  en: {
    readAll: 'Mark all as read', read: 'Mark as read', settings: 'Settings', retry: 'Try again', loadError: 'Notifications could not be updated.', pending: 'Loading…', earlier: 'Older', later: 'Newer',
    unread: (count) => count ? count + ' unread' : 'All caught up',
    messages: {
      review: ({ count }) => count ? count + ' cards are ready for review.' : 'It is time to review.',
      daily: () => 'It is time for your daily practice.',
      streak: ({ count }) => count ? 'Keep your ' + count + '-day streak going.' : 'Keep your learning streak going.',
      achievements: () => 'You earned a new achievement.',
      progress: ({ level, count }) => level ? 'You reached level ' + level + '.' : count ? 'You reached ' + count + ' XP.' : 'You reached a learning milestone.',
      weekly: ({ minutes, words }) => `Weekly report · ${minutes ?? 0} minutes, ${words ?? 0} words.`,
      news: ({ title }) => title || 'LexiMind updates.',
    },
  },
  ru: {
    readAll: 'Прочитать все', read: 'Отметить прочитанным', settings: 'Настройки', retry: 'Повторить', loadError: 'Не удалось обновить уведомления.', pending: 'Загрузка…', earlier: 'Ранее', later: 'Новее',
    unread: (count) => count ? 'Непрочитанных: ' + count : 'Все прочитано',
    messages: {
      review: ({ count }) => count ? 'Карточек к повторению: ' + count + '.' : 'Пора повторить слова.',
      daily: () => 'Время ежедневного занятия.',
      streak: ({ count }) => count ? 'Продолжите свою серию из ' + count + ' дней.' : 'Продолжите серию занятий.',
      achievements: () => 'Получено новое достижение.',
      progress: ({ level, count }) => level ? 'Ваш новый уровень — ' + level + '.' : count ? 'Вы набрали ' + count + ' XP.' : 'Новая веха в обучении.',
      weekly: ({ minutes, words }) => `Отчёт за неделю · ${minutes ?? 0} мин, слов: ${words ?? 0}.`,
      news: ({ title }) => title || 'Новости LexiMind.',
    },
  },
};

export function NotificationMenu({ token, onNavigate }: { token: string; onNavigate: (event: MouseEvent<HTMLAnchorElement>, href: string) => void }) {
  const language = useInterfaceLanguage();
  const text = copy[language];
  const shell = shellCopy[language];
  const [inbox, setInbox] = useState<Inbox>();
  const [page, setPage] = useState(1);
  const [revision, refresh] = useState(0);
  const [failed, setFailed] = useState(false);
  const [writing, setWriting] = useState(false);
  const [ring, setRing] = useState({ count: 0, active: false });
  const trigger = useRef<HTMLButtonElement>(null);
  const count = inbox?.unreadCount ?? 0;
  if (count !== ring.count) setRing({ count, active: count > ring.count });

  useEffect(() => {
    const controller = new AbortController();
    let fetching = false;
    async function load() {
      if (fetching || document.visibilityState !== 'visible') return;
      fetching = true;
      try {
        const next = await api<Inbox>(`/notifications?page=${page}&limit=${size}`, { token, signal: controller.signal });
        if (controller.signal.aborted) return;
        setInbox(next);
        setFailed(false);
        const lastPage = Math.max(1, Math.ceil(next.total / size));
        if (page > lastPage) setPage(lastPage);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        fetching = false;
      }
    }
    void load();
    const timer = window.setInterval(load, 60_000);
    document.addEventListener('visibilitychange', load);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [token, page, revision]);

  async function read(id?: string) {
    if (writing) return;
    setWriting(true);
    try {
      await api(id ? `/notifications/${id}/read` : '/notifications/read-all', { token, method: 'PATCH' });
      refresh((value) => value + 1);
    } catch {
      setFailed(true);
    } finally {
      setWriting(false);
    }
  }

  function movePage(next: number) {
    setInbox((current) => current && { ...current, data: [] });
    setPage(next);
  }

  const date = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const clock = new Intl.DateTimeFormat('uz', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function dateLabel(value: string) {
    const received = new Date(value);
    return language === 'uz' ? `${received.getDate()}-${uzbekMonths[received.getMonth()]}, ${clock.format(received)}` : date.format(received);
  }
  return <>
    <button ref={trigger} type="button" className="app-control app-toolbar-control app-bell" popoverTarget="app-notifications"
      aria-label={shell.notifications + (count ? ' · ' + count : '')} title={shell.notifications}
      onClick={() => refresh((value) => value + 1)}>
      <Bell key={ring.count} className={ring.active ? 'app-bell-ring' : undefined} size={18} strokeWidth={1.65} aria-hidden="true" />
      {count > 0 && <span className="app-notification-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
    </button>
    <div id="app-notifications" popover="auto" className="app-dialog inbox-popover" data-backdrop="clear" role="region" aria-labelledby="inbox-title">
      <header className="app-dialog-heading inbox-heading">
        <span className="inbox-heading-icon"><Bell size={20} aria-hidden="true" /></span>
        <div>
          <h2 id="inbox-title">{shell.notifications}</h2>
          {Boolean(inbox?.total) && <p role="status">{text.unread(count)}</p>}
        </div>
        <button type="button" className="app-dialog-close" aria-label={shell.close} popoverTarget="app-notifications"
          popoverTargetAction="hide" onClick={() => trigger.current?.focus({ preventScroll: true })}><X size={18} aria-hidden="true" /></button>
      </header>
      <div className="inbox-content">
        {failed && <div className="inbox-status" role="status">
          <p>{text.loadError}</p> <button type="button" className="app-dialog-button" onClick={() => refresh((n) => n + 1)}>{text.retry}</button>
        </div>}
        {!failed && (!inbox || (!inbox.data.length && inbox.total > 0)) && <div className="inbox-status" role="status"><p>{text.pending}</p></div>}
        {!failed && inbox?.total === 0 && <div className="inbox-status">
          <span className="inbox-entry-icon"><InboxIcon size={20} aria-hidden="true" /></span><p>{shell.emptyNotifications}</p>
        </div>}
        {Boolean(inbox?.data.length) && <ul className="inbox-entries">
        {inbox?.data.map((item) => {
          const target = notificationTargets[item.type];
          if (!target) return null;
          const [Icon, href] = target;
          return <li key={item.id} data-unread={!item.readAt}>
            <Link href={href} className="inbox-entry" onClick={(event) => {
              if (!item.readAt) void read(item.id);
              onNavigate(event, href);
            }}>
              <span className="inbox-entry-icon"><Icon size={17} aria-hidden="true" /></span>
              <span className="inbox-entry-text">{text.messages[item.type](item.data)}
                {item.type === 'news' && item.data.body && <span className="inbox-news-body">{item.data.body}</span>}
                <time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time></span>
            </Link>
            {!item.readAt && <button type="button" className="app-dialog-button inbox-check" aria-label={text.read} title={text.read} disabled={writing} onClick={() => void read(item.id)}><Check size={16} aria-hidden="true" /></button>}
          </li>;
        })}
        </ul>}
        {(page > 1 || page * size < (inbox?.total ?? 0)) && <div className="inbox-pages">
          {page > 1 && <button className="app-dialog-button" type="button" onClick={() => movePage(page - 1)}><ChevronLeft size={15} aria-hidden="true" />{text.later}</button>}
          {page * size < (inbox?.total ?? 0) && <button className="app-dialog-button" type="button" onClick={() => movePage(page + 1)}>{text.earlier}<ChevronRight size={15} aria-hidden="true" /></button>}
        </div>}
      </div>
      <footer className="app-dialog-actions inbox-footer">
        <Link className="app-dialog-button" href={routes.settingsNotifications} onClick={(event) => onNavigate(event, routes.settingsNotifications)}><Settings2 size={16} aria-hidden="true" />{text.settings}</Link>
        {Boolean(inbox?.total) && <button type="button" className="app-dialog-button" data-tone="accent" disabled={!count || writing} onClick={() => void read()}><CheckCheck size={16} aria-hidden="true" />{text.readAll}</button>}
      </footer>
    </div>
  </>;
}
