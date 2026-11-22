// Asia/Kolkata calendar-date helpers. Never depends on the host timezone.

const kolkataDateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayInKolkata(now: Date = new Date()): string {
  const parts = kolkataDateParts.formatToParts(now);
  const get = (type: 'year' | 'month' | 'day'): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidCalendarDate(s: string): boolean {
  const match = ISO_DATE_PATTERN.exec(s);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function addDays(calendarDate: string, days: number): string {
  if (!isValidCalendarDate(calendarDate)) {
    throw new Error(`Invalid calendar date: "${calendarDate}"`);
  }
  const [y, m, d] = calendarDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysBetween(from: string, to: string): number {
  if (!isValidCalendarDate(from) || !isValidCalendarDate(to)) {
    throw new Error(`Invalid calendar dates: "${from}", "${to}"`);
  }
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  const diffMs = t2 - t1;
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

export function compareCalendarDates(a: string, b: string): -1 | 0 | 1 {
  if (!isValidCalendarDate(a) || !isValidCalendarDate(b)) {
    throw new Error(`Invalid calendar dates: "${a}", "${b}"`);
  }
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function generateDateSequence(startDate: string, count: number): string[] {
  if (!isValidCalendarDate(startDate)) {
    throw new Error(`Invalid start date: "${startDate}"`);
  }
  if (count < 0) {
    throw new Error(`Date count cannot be negative: ${count}`);
  }
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(addDays(startDate, i));
  }
  return result;
}
