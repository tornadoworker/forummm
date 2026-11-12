import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(date: Date | string | number | null | undefined): string {
  if (!date) return 'Vor Kurzem';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: de });
}

export function formatCustomDate(date: Date | string | number | null | undefined, pattern: string = 'dd.MM.yyyy HH:mm'): string {
  if (!date) return '-';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return format(d, pattern, { locale: de });
}
