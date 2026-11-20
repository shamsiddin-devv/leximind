import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Clock3, ListVideo, Zap } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import type { LearningCalendar, LearningCalendarDay } from '../../../shared/types/api';
import { uzbekMonths } from '../../../shared/utils/date';
import './LearningCalendarPage.css';

const weekdays = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
const shortWeekdays = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const number = new Intl.NumberFormat('uz-UZ');
const asDate = (value: string) => new Date(value + 'T12:00:00Z');
const dateString = (value: Date) => value.toISOString().slice(0, 10);
const weekday = (value: Date) => (value.getUTCDay() + 6) % 7;
const spokenDate = (value: string) => Number(value.slice(8)) + '-' + uzbekMonths[Number(value.slice(5, 7)) - 1];
const minutes = (seconds: number) => Math.floor(seconds / 60);
const minuteValue = (seconds: number) => seconds > 0 && seconds < 60 ? '<1' : number.format(minutes(seconds));
const durationLabel = (seconds: number) => seconds > 0 && seconds < 60 ? '1 daqiqadan kam' : number.format(minutes(seconds)) + ' daqiqa';

function monthName(date: string) {
  const name = uzbekMonths[Number(date.slice(5, 7)) - 1];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function LearningCalendarPage({ token, streak }: { token: string; streak?: number }) {
  const [data, setData] = useState<LearningCalendar>();
  const [month, setMonth] = useState<string>();
  const [date, setDate] = useState<string>();
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const dates = useRef(new Map<string, HTMLButtonElement>());
  const focusNextDay = useRef(false);
  const pending = !error && (!data || month !== undefined && data.monthStart.slice(0, 7) !== month);
  const day = data?.days.find((item) => item.date === date)
    ?? data?.days.find((item) => item.date === data.today) ?? data?.days[0];
  const slots = data ? [...Array<null>(weekday(asDate(data.monthStart))).fill(null), ...data.days] : [];
  const rows = Array.from({ length: Math.ceil(slots.length / 7) }, (_, index) => slots.slice(index * 7, index * 7 + 7));

  useEffect(() => {
    const controller = new AbortController();
    const path = month ? '/learning-calendar?month=' + encodeURIComponent(month) : '/learning-calendar';
    void api<LearningCalendar>(path, { token, signal: controller.signal }).then((calendar) => {
      if (!controller.signal.aborted) { setData(calendar); setError(''); }
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(explain(failure));
    });
    return () => controller.abort();
  }, [token, month, version]);

  useEffect(() => {
    if (!pending && day && focusNextDay.current && dates.current.has(day.date)) {
      dates.current.get(day.date)?.focus();
      focusNextDay.current = false;
    }
  }, [day, pending]);

  function loadMonth(next: string) {
    if (month === next && error) setVersion((value) => value + 1);
    setMonth(next);
    setError('');
  }

  function navigateMonth(offset: number) {
    if (!data || pending) return;
    const next = asDate(data.monthStart);
    next.setUTCMonth(next.getUTCMonth() + offset);
    const year = next.getUTCFullYear();
    if (year < 1 || year > 9999) return;
    loadMonth(dateString(next).slice(0, 7));
    setDate(undefined);
  }

  function selectWithKeyboard(next: Date) {
    if (!data || pending || next.getUTCFullYear() < 1 || next.getUTCFullYear() > 9999) return;
    const nextDate = dateString(next);
    const target = dates.current.get(nextDate);
    setDate(nextDate);
    if (target) { target.focus(); return; }
    focusNextDay.current = true;
    loadMonth(nextDate.slice(0, 7));
  }

  function selectToday() {
    if (!data || pending) return;
    const todayMonth = data.today.slice(0, 7);
    if (todayMonth !== data.monthStart.slice(0, 7) || error) loadMonth(todayMonth);
    setDate(data.today);
  }

  return <div className="container screen learning-calendar-page">
    <header className="learning-calendar-heading">
      <p className="learning-calendar-kicker">Taqvim</p>
      <h1 lang="en">Learning Calendar</h1>
      <p>Har kungi faollik, seriya va oylik maqsadlar bajarilishini kuzatib boring.</p>
    </header>
    {error && <div className="learning-calendar-error"><Notice error>{error}</Notice>
      <button type="button" className="button secondary" onClick={() => { setError(''); setVersion((value) => value + 1); }}>Qayta urinish</button>
    </div>}
    {!data && !error && <p role="status" className="calendar-muted">Taqvim yuklanmoqda…</p>}
    {data && day && <>
      <CalendarMetrics data={data} streak={streak} />
      <div className="learning-calendar-layout" aria-busy={pending}>
        <section className="learning-calendar-panel calendar-month" aria-labelledby="calendar-month-title">
          <header className="calendar-month-heading">
            <div><p className="learning-calendar-kicker">Oy ko‘rinishi</p>
              <h2 id="calendar-month-title" aria-live="polite">{monthName(data.monthStart)} {Number(data.monthStart.slice(0, 4))}</h2>
            </div>
            <div className="calendar-month-actions">
              <button type="button" aria-label="Oldingi oy" aria-disabled={pending || data.monthStart.startsWith('0001-01')}
                onClick={() => navigateMonth(-1)}><ChevronLeft size={16} aria-hidden="true" /></button>
              <button type="button" aria-label="Keyingi oy" aria-disabled={pending || data.monthStart.startsWith('9999-12')}
                onClick={() => navigateMonth(1)}><ChevronRight size={16} aria-hidden="true" /></button>
            </div>
          </header>
          <div className="calendar-weekdays" aria-hidden="true">{shortWeekdays.map((label) => <span key={label}>{label}</span>)}</div>
          <div className="calendar-days" role="grid" aria-label="Oy kunlari. Kunlar bo‘yicha strelkalar yordamida o‘ting.">
            {rows.map((row, rowIndex) => <div className="calendar-days-row" role="row" key={rowIndex}>
              {row.map((item, index) => !item ? <span key={index} role="gridcell" /> : <div key={item.date} role="gridcell"
                aria-selected={item.date === day.date}><button type="button"
              ref={(element) => { if (element) dates.current.set(item.date, element); else dates.current.delete(item.date); }}
              className="calendar-day" data-active={item.active}
              aria-current={item.date === data.today ? 'date' : undefined} aria-pressed={item.date === day.date}
              aria-label={weekdays[weekday(asDate(item.date))] + ', ' + spokenDate(item.date)
                + (item.active ? ' · ' + durationLabel(item.studySeconds) : item.date > data.today ? ' · Kelgusi kun' : ' · Faollik yo‘q')}
              tabIndex={item.date === day.date ? 0 : -1} onClick={() => { if (!pending) setDate(item.date); }}
              onKeyDown={(event) => {
                if (pending || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
                const next = asDate(item.date);
                const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
                const offset = offsets[event.key] ?? (event.key === 'Home' ? -weekday(next) : event.key === 'End' ? 6 - weekday(next) : undefined);
                if (offset === undefined) return;
                next.setUTCDate(next.getUTCDate() + offset);
                if (next.getUTCFullYear() < 1 || next.getUTCFullYear() > 9999) return;
                event.preventDefault();
                selectWithKeyboard(next);
              }}>
              <span>{Number(item.date.slice(8))}</span>
              {item.active && <i aria-hidden="true" style={{ opacity: .45 + Math.min(1, item.studySeconds / (data.dailyStudyMinutes * 60)) * .55 }} />}
            </button></div>)}</div>)}
          </div>
          <footer className="calendar-month-footer">
            <div className="calendar-legend"><span><i className="calendar-active-dot" />Faol kun</span><span><i />Faollik yo‘q</span></div>
            <button type="button" aria-disabled={pending} onClick={selectToday}>Bugun · {spokenDate(data.today)}</button>
          </footer>
        </section>
        <div className="calendar-rail">
          <DayDetails day={day} future={day.date > data.today} />
          <WeeklyGoals data={data} />
        </div>
      </div>
    </>}
  </div>;
}

function CalendarMetrics({ data, streak }: { data: LearningCalendar; streak?: number }) {
  const seconds = data.days.reduce((sum, day) => sum + day.studySeconds, 0);
  const words = data.days.reduce((sum, day) => sum + day.newWords, 0);
  const active = data.days.filter((day) => day.active).length;
  return <div className="calendar-metrics">
    <GoalCard label="Oylik vaqt" value={minuteValue(seconds)} current={seconds / 60} goal={data.dailyStudyMinutes * data.days.length} unit="daq" />
    <GoalCard label="So‘zlar" value={number.format(words)} current={words} goal={data.dailyNewWords * data.days.length} />
    <div className="learning-calendar-panel calendar-metric">
      <h2>Faol kunlar</h2><p className="calendar-metric-value">{number.format(active)}</p>
      <p className="calendar-muted">{monthName(data.monthStart)} oyida</p>
    </div>
    <div className="learning-calendar-panel calendar-metric">
      <h2>Joriy seriya</h2><p className="calendar-metric-value">{streak === undefined ? '—' : number.format(streak)} <small>kun</small></p>
      <p className="calendar-muted">{streak === undefined ? 'Seriya hisoblanmoqda' : streak ? 'Uzilishsiz davom etmoqda' : 'Seriya hali boshlanmagan'}</p>
    </div>
  </div>;
}

function GoalCard({ label, value, current, goal, unit }: { label: string; value: string; current: number; goal: number; unit?: string }) {
  const percent = Math.floor(current / goal * 100);
  const target = number.format(goal) + (unit ? ' ' + unit : '');
  return <div className="learning-calendar-panel calendar-metric calendar-goal-card">
    <div className="calendar-goal-ring">
      <progress className="calendar-sr-only" value={Math.min(current, goal)} max={goal} aria-label={label}
        aria-valuetext={value + ' / ' + target} />
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="33" className="calendar-ring-track" />
        <circle cx="36" cy="36" r="33" pathLength="100" strokeDasharray="100"
          strokeDashoffset={100 - Math.min(100, percent)} className="calendar-ring-value" />
      </svg>
      <span aria-hidden="true">{number.format(percent)}%</span>
    </div>
    <div><h2>{label}</h2><p><strong>{value}</strong> <small>/ {target}</small></p></div>
  </div>;
}

function DayDetails({ day, future }: { day: LearningCalendarDay; future: boolean }) {
  const rows = [
    { title: 'O‘rganish vaqti', value: durationLabel(day.studySeconds), icon: Clock3 },
    { title: 'Yangi so‘zlar', value: number.format(day.newWords) + ' ta', icon: BookOpen },
    { title: 'Seanslar', value: number.format(day.sessions) + ' ta', icon: ListVideo },
    { title: 'To‘plangan XP', value: number.format(day.xp) + ' XP', icon: Zap },
  ];
  return <section className="learning-calendar-panel calendar-day-details" aria-labelledby="calendar-detail-title">
    <div aria-live="polite">
      <h2 id="calendar-detail-title"><time dateTime={day.date}>{spokenDate(day.date)}</time></h2>
      <p className="calendar-muted">{future ? 'Kelgusi kun' : 'Kunlik faollik tafsiloti'}</p>
      <dl>{rows.map(({ title, value, icon: Icon }) => <div key={title}>
        <dt><span><Icon size={15} aria-hidden="true" /></span>{title}</dt><dd>{value}</dd>
      </div>)}</dl>
    </div>
  </section>;
}

function WeeklyGoals({ data }: { data: LearningCalendar }) {
  const weeks = [data.days.slice(0, 7), data.days.slice(7, 14), data.days.slice(14, 21), data.days.slice(21)];
  const total = data.days.reduce((sum, item) => sum + item.studySeconds, 0);
  return <section className="learning-calendar-panel calendar-weekly" aria-labelledby="calendar-weekly-title">
    <h2 id="calendar-weekly-title">Haftalik maqsad</h2><p className="calendar-muted">Daqiqa bo‘yicha bajarilish</p>
    <div className="calendar-weekly-rows">{weeks.map((week, index) => {
      const seconds = week.reduce((sum, item) => sum + item.studySeconds, 0);
      const target = data.dailyStudyMinutes * week.length;
      const period = spokenDate(week[0].date) + ' – ' + spokenDate(week[week.length - 1].date);
      const label = index + 1 + '-hafta';
      const value = minuteValue(seconds) + ' / ' + number.format(target) + ' daq';
      return <div className="calendar-weekly-row" key={label} data-complete={seconds >= target * 60}>
        <div><span title={period}>{label}</span><span>{value}</span></div>
        <progress value={Math.min(seconds / 60, target)} max={target} aria-label={label + ' · ' + period} aria-valuetext={value} />
      </div>;
    })}</div>
    <p className="calendar-weekly-total calendar-muted">{monthName(data.monthStart)} oyida jami {durationLabel(total)} o‘rganilgan.</p>
  </section>;
}
