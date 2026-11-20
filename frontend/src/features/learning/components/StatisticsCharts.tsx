import { useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { LearningAnalytics, LearningSkill } from '../../../shared/types/api';

export const skillLabels: Record<LearningSkill, string> = {
  vocabulary: 'So‘z boyligi', grammar: 'Grammatika', listening: 'Tinglash',
  speaking: 'Gapirish', reading: 'O‘qish', writing: 'Yozish',
};

const weekdays = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
const number = new Intl.NumberFormat('uz-UZ');
const date = new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function duration(seconds: number) {
  if (seconds <= 0) return '0 daqiqa';
  if (seconds < 60) return '1 daqiqadan kam';
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return number.format(minutes) + ' daqiqa';
  return number.format(hours) + ' soat' + (remaining ? ' ' + number.format(remaining) + ' daq.' : '');
}

export type ChartPoint = { label: string; detail: string; value: number | null };
type Coordinate = { x: number; y: number };

function linePath(points: Coordinate[]) {
  if (!points.length) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1], current = points[index];
    const distance = (current.x - previous.x) * .4;
    path += ` C ${previous.x + distance} ${previous.y}, ${current.x - distance} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
}

export function StatisticsChart({ points, kind, minimum = 0, maximum, unit }: {
  points: ChartPoint[]; kind: 'area' | 'line' | 'bars'; minimum?: number; maximum: number; unit?: string;
}) {
  const gradient = useId();
  const [focused, setFocused] = useState<number>();
  const bars = kind === 'bars';
  const x = (index: number) => bars ? (index + .5) / points.length * 100 : index / Math.max(1, points.length - 1) * 100;
  const y = (value: number) => 100 - (value - minimum) / (maximum - minimum) * 100;
  const segments: Coordinate[][] = [];
  let segment: Coordinate[] = [];
  points.forEach(({ value }, index) => {
    if (value === null) {
      if (segment.length) segments.push(segment);
      segment = [];
    } else segment.push({ x: x(index) * 10, y: y(value) * 2.2 });
  });
  if (segment.length) segments.push(segment);

  return <div className="stats-chart" data-kind={kind}>
    <div className="stats-chart-scale" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => <span key={index}>{number.format(maximum - (maximum - minimum) * index / 4)}</span>)}
    </div>
    <div className="stats-chart-body">
      <div className="stats-chart-plot" onPointerLeave={() => setFocused(undefined)}>
        <div className="stats-chart-grid" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i key={index} />)}</div>
        {!bars && <svg viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          {kind === 'area' && <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="currentColor" stopOpacity=".28" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient></defs>}
          {segments.map((run) => {
            const trace = linePath(run);
            return <g key={run[0].x}>
              {kind === 'area' && <path d={trace + ` L ${run.at(-1)!.x} 220 L ${run[0].x} 220 Z`} fill={`url(#${gradient})`} />}
              <path d={trace} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </g>;
          })}
        </svg>}
        {kind === 'line' && !segments.length && <p className="stats-chart-empty">To‘g‘ri javoblar statistikasi shu yerda ko‘rinadi.</p>}
        {points.map(({ label, detail, value }, index) => {
          const reading = value === null ? 'Ma’lumot yo‘q' : number.format(value) + (unit ?? '');
          return <div className="stats-chart-point" data-edge={index === 0 ? 'start' : index === points.length - 1 ? 'end' : undefined}
            key={detail} style={{ '--point-x': x(index) + '%', '--point-y': y(value ?? minimum) + '%',
              '--bar-width': 80 / points.length + '%' } as CSSProperties}>
            {bars && !!value && <span className="stats-chart-bar" aria-hidden="true" />}
            {kind === 'line' && value !== null && <span className="stats-chart-dot" aria-hidden="true" />}
            <button type="button" aria-label={detail + ' · ' + reading}
              onFocus={() => setFocused(index)} onBlur={() => setFocused(undefined)}
              onPointerEnter={() => setFocused(index)} onClick={() => setFocused(index)} />
            {focused === index && <span className="stats-chart-value" aria-hidden="true">{label} · {reading}</span>}
          </div>;
        })}
      </div>
      <div className="stats-chart-labels" aria-hidden="true">
        {points.map(({ label, detail }, index) => (bars || index % 2 === 0) && <span key={detail}
          data-secondary={index % 4 !== 0} style={{ left: x(index) + '%' }}>{label}</span>)}
      </div>
    </div>
  </div>;
}

const radarAxes: LearningSkill[] = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'];
const position = (index: number, radius: number): Coordinate => {
  const angle = index * Math.PI / 3 - Math.PI / 2;
  return { x: 160 + radius * Math.cos(angle), y: 120 + radius * Math.sin(angle) };
};
const pair = ({ x, y }: Coordinate) => `${x},${y}`;

export function SkillRadar({ skills }: { skills: LearningAnalytics['skills'] }) {
  const callouts = radarAxes.map((skill) => skillLabels[skill] + ' ' + (skills[skill] === undefined ? 'ma’lumot yo‘q' : skills[skill] + '%'));
  return <svg className="stats-radar" viewBox="0 0 320 238" role="img" aria-label={callouts.join(', ')}>
    {[22, 44, 66, 88].map((radius) => <polygon className="stats-radar-grid" key={radius}
      points={radarAxes.map((_, index) => pair(position(index, radius))).join(' ')} />)}
    {radarAxes.map((skill, index) => {
      const edge = position(index, 88), label = position(index, 103);
      const value = skills[skill], next = skills[radarAxes[(index + 1) % radarAxes.length]];
      const a = value === undefined ? null : position(index, value * .88);
      const b = next === undefined ? null : position(index + 1, next * .88);
      return <g key={skill}>
        <line className="stats-radar-grid" x1="160" y1="120" x2={edge.x} y2={edge.y} />
        {a && b && <><polygon className="stats-radar-fill" points={`160,120 ${pair(a)} ${pair(b)}`} />
          <line className="stats-radar-line" x1={a.x} y1={a.y} x2={b.x} y2={b.y} /></>}
        {a && <circle className="stats-radar-dot" cx={a.x} cy={a.y} r="2.5" />}
        <text x={label.x} y={label.y} dominantBaseline="middle"
          textAnchor={index === 0 || index === 3 ? 'middle' : index < 3 ? 'start' : 'end'}
          data-measured={value !== undefined}>{skill === 'vocabulary' ? 'So‘z' : skillLabels[skill]}</text>
      </g>;
    })}
  </svg>;
}

export function ActivityHeatmap({ days, today }: Pick<LearningAnalytics, 'days' | 'today'>) {
  const dates = useRef<(HTMLButtonElement | null)[]>([]);
  const [selected, setSelected] = useState<number>();
  const firstFuture = days.findIndex((item) => item.date > today);
  const latest = firstFuture === -1 ? days.length - 1 : firstFuture - 1;
  const current = selected ?? Math.max(0, latest);
  const weekdayTotals = weekdays.map((_, weekday) => days.reduce(
    (sum, item, index) => sum + (index % 7 === weekday && item.date <= today ? item.studySeconds : 0), 0,
  ));
  const peakDay = Math.max(...weekdayTotals);
  const total = weekdayTotals.reduce((sum, value) => sum + value, 0);

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const steps: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
    const step = steps[event.key];
    if (!step && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? latest : index + step;
    if (next >= 0 && next <= latest) dates.current[next]?.focus();
  }

  const day = selected === undefined ? undefined : days[selected];
  return <>
    <div className="stats-heatmap" role="group" aria-label="Kunlik faollik. Kunlar bo‘yicha strelkalar yordamida o‘ting.">
      {days.map(({ date: day, studySeconds }, index) => {
        const minutes = studySeconds / 60;
        const level = minutes >= 20 ? 4 : minutes >= 10 ? 3 : minutes >= 5 ? 2 : studySeconds > 0 ? 1 : 0;
        const label = date.format(new Date(day + 'T12:00:00Z')) + ' · ' + duration(studySeconds);
        return <button key={day} ref={(element) => { dates.current[index] = element; }}
          type="button" disabled={day > today} tabIndex={index === current ? 0 : -1}
          aria-label={label} aria-current={day === today ? 'date' : undefined} title={label}
          data-intensity={level} onFocus={() => setSelected(index)} onClick={() => setSelected(index)}
          onKeyDown={(event) => move(event, index)} />;
      })}
    </div>
    <div className="stats-heatmap-footer">
      <span>{day ? <><time dateTime={day.date}>{date.format(new Date(day.date + 'T12:00:00Z'))}</time> · <strong>{duration(day.studySeconds)}</strong></>
        : <>Eng faol kun · <strong>{peakDay > 0 ? weekdays[weekdayTotals.indexOf(peakDay)] : '—'}</strong></>}</span>
      <span>Jami · <strong>{duration(total)}</strong></span>
    </div>
  </>;
}
