import type { DailyClick } from "@/lib/types";

export function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function isExpired(expiresAt?: Date | string | null) {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() <= Date.now();
}

export function lastNDays(dailyClicks: DailyClick[], days = 14) {
  const counts = new Map(dailyClicks.map((entry) => [entry.date, entry.count]));
  const result: DailyClick[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    const key = utcDateString(date);
    result.push({ date: key, count: counts.get(key) ?? 0 });
  }

  return result;
}
