/**
 * Converts a 'YYYY-MM-DD' string into a UTC-midnight Date for Postgres `@db.Date` columns.
 * Postgres DATE has no timezone, so this must not go through local-time parsing
 * (dayjs(...).toDate() would shift the calendar day whenever the server's local
 * offset isn't 0, e.g. IST).
 */
export function dateOnlyToUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}
