const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

export function getWatchDate(date: Date, timezone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getMonthKey(date: Date, timezone = DEFAULT_TIMEZONE): string {
  return getWatchDate(date, timezone).slice(0, 7);
}

export function getWeekStartDate(date: Date, timezone = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';

  const weekdayIndex: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  const current = new Date(`${year}-${month}-${day}T12:00:00Z`);
  const offset = weekdayIndex[weekday] ?? 0;
  current.setUTCDate(current.getUTCDate() - offset);

  return current.toISOString().slice(0, 10);
}

const VI_WEEKDAYS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

export function formatVietnameseDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = VI_WEEKDAYS[date.getUTCDay()];
  const dayStr = String(day).padStart(2, '0');

  return `${weekday}, ${dayStr} Tháng ${month} ${year}`;
}

export function secondsToHours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
}

export { DEFAULT_TIMEZONE };
