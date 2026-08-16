export type DailyClick = {
  date: string;
  count: number;
};

export type ShortUrlDto = {
  id: string;
  full: string;
  short: string;
  shortUrl: string;
  clicks: number;
  expiresAt: string | null;
  lastAccessedAt: string | null;
  dailyClicks: DailyClick[];
  createdAt: string;
  updatedAt: string;
  expired: boolean;
};

export type CreateUrlBody = {
  fullUrl: string;
  slug?: string;
  expiresAt?: string;
};
