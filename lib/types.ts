export type DailyClick = {
  date: string;
  count: number;
};

export type ShortUrlKind = "path" | "subdomain";

export type ShortUrlDto = {
  id: string;
  full: string;
  short: string;
  shortUrl: string;
  kind: ShortUrlKind;
  clicks: number;
  expiresAt: string | null;
  lastAccessedAt: string | null;
  dailyClicks: DailyClick[];
  createdAt: string;
  updatedAt: string;
  expired: boolean;
  /** Present when a vanity domain could not be auto-provisioned. */
  domainWarning?: string;
};

export type CreateUrlBody = {
  fullUrl: string;
  slug?: string;
  expiresAt?: string;
  kind?: ShortUrlKind;
};
