export function dateKey(date: Date, timezone?: string) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (name: string) => parts.find(({ type }) => type === name)?.value;
  return [part('year'), part('month'), part('day')].join('-');
}
