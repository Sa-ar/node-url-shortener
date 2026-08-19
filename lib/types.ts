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

export type UpdateUrlBody = {
  fullUrl: string;
  slug: string;
  expiresAt?: string;
};

export type OverviewStatsDto = {
  links: number;
  clicks: number;
  uniqueVisitors: number;
  active: number;
};

export type ClickBreakdownEntry = {
  label: string;
  count: number;
};

export type ClickEventDto = {
  id: string;
  createdAt: string;
  country: string;
  region: string;
  city: string;
  deviceType: string;
  browser: string;
  browserVersion: string;
  referrerHost: string;
  ip: string;
  isBot: boolean;
};

export type UrlClicksDto = {
  clicks: number;
  uniqueVisitors: number;
  daily: DailyClick[];
  breakdowns: {
    country: ClickBreakdownEntry[];
    referrer: ClickBreakdownEntry[];
    device: ClickBreakdownEntry[];
    browser: ClickBreakdownEntry[];
  };
  recent: ClickEventDto[];
};
