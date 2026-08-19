import { createHash } from "node:crypto";
import { UAParser } from "ua-parser-js";
import { Crawlers, Fetchers, Libraries } from "ua-parser-js/extensions";
import { isBot } from "ua-parser-js/helpers";
import { utcDateString } from "@/lib/dates";
import { ClickEvent, type ClickEventAttrs, type ClickEventDeviceType } from "@/lib/models/click-event";
import type { ShortUrlAttrs } from "@/lib/models/short-url";
import { ShortUrl } from "@/lib/models/short-url";
import { isOwnerRole } from "@/lib/roles";
import type {
  ClickBreakdownEntry,
  ClickEventDto,
  DailyClick,
  OverviewStatsDto,
  UrlClicksDto,
} from "@/lib/types";

const MAX_HEADER_LENGTH = 1000;
const RECENT_HITS_LIMIT = 50;
const DAILY_WINDOW_DAYS = 14;
const unknownLabel = "(unknown)";
const directLabel = "(direct)";

type RedirectableShortUrl = Pick<
  ShortUrlAttrs,
  "userId" | "short" | "full" | "clicks" | "lastAccessedAt"
> & {
  _id: { toString(): string };
  save(): Promise<unknown>;
  dailyClicks?: DailyClick[];
};

type BreakdownKey = "country" | "referrer" | "device" | "browser";
type ClickEventFilter = Record<string, unknown>;

function truncateHeader(value: string | null) {
  return (value ?? "").slice(0, MAX_HEADER_LENGTH);
}

function decodeHeaderValue(value: string) {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function firstForwardedIp(value: string) {
  const [firstHop = ""] = value.split(",");
  return firstHop.trim();
}

function getRequestIp(request: Request) {
  const forwardedFor = firstForwardedIp(
    truncateHeader(request.headers.get("x-forwarded-for"))
  );
  if (forwardedFor) {
    return forwardedFor;
  }

  const realIp = truncateHeader(request.headers.get("x-real-ip"));
  if (realIp) {
    return realIp;
  }

  return "";
}

function createParser(userAgent: string) {
  const parser = new UAParser(userAgent);
  parser.useExtension(Crawlers);
  parser.useExtension(Fetchers);
  parser.useExtension(Libraries);
  return parser;
}

function getDeviceType(userAgent: string, botTraffic: boolean): ClickEventDeviceType {
  if (botTraffic) {
    return "bot";
  }

  const type = createParser(userAgent).getDevice().type;

  switch (type) {
    case "desktop":
    case "mobile":
    case "tablet":
    case "smarttv":
    case "wearable":
    case "embedded":
    case "console":
    case "xr":
      return type;
    default:
      return "unknown";
  }
}

function buildVisibleShortUrlFilter(userId: string, role: string | null | undefined) {
  return isOwnerRole(role) ? {} : { userId };
}

function buildVisibleEventFilter(
  userId: string,
  role: string | null | undefined,
  excludeBots: boolean
): ClickEventFilter {
  const filter: ClickEventFilter = isOwnerRole(role) ? {} : { userId };

  if (excludeBots) {
    filter.isBot = false;
  }

  return filter;
}

function getUtcDayKeys(days: number) {
  const dates: string[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - offset);
    dates.push(utcDateString(date));
  }

  return dates;
}

function getWindowStartUtc(days: number) {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - (days - 1));
  return now;
}

function getReferrerHost(value: string) {
  if (!value) {
    return directLabel;
  }

  try {
    return new URL(value).host || directLabel;
  } catch {
    return directLabel;
  }
}

function browserLabel(event: Pick<ClickEventAttrs, "browser" | "browserVersion">) {
  const name = event.browser.trim();
  const version = event.browserVersion.trim();

  if (!name) {
    return unknownLabel;
  }

  return version ? `${name} ${version}` : name;
}

function eventFilterForShortUrl(
  shortUrlId: string,
  excludeBots: boolean
): ClickEventFilter {
  const filter: ClickEventFilter = { shortUrlId };

  if (excludeBots) {
    filter.isBot = false;
  }

  return filter;
}

function normalizeCountry(value: string) {
  return value.trim() || unknownLabel;
}

function normalizeDevice(value: string) {
  return value.trim() || unknownLabel;
}

function normalizeBrowser(value: string) {
  return value.trim() || unknownLabel;
}

function activeFilter(userId: string, role: string | null | undefined) {
  return {
    ...buildVisibleShortUrlFilter(userId, role),
    $or: [
      { expiresAt: null },
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  };
}

async function sumVisibleClicks(userId: string, role: string | null | undefined) {
  const [result] = await ShortUrl.aggregate<{ clicks: number }>([
    { $match: buildVisibleShortUrlFilter(userId, role) },
    { $group: { _id: null, clicks: { $sum: "$clicks" } } },
  ]);

  return result?.clicks ?? 0;
}

async function aggregateBreakdown(
  field: BreakdownKey,
  filter: ClickEventFilter
) {
  return ClickEvent.aggregate<{ _id: string; count: number }>([
    { $match: filter },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);
}

function toBreakdownEntries(
  entries: Array<{ _id: string; count: number }>,
  kind: BreakdownKey
): ClickBreakdownEntry[] {
  if (kind === "referrer") {
    const counts = new Map<string, number>();

    for (const entry of entries) {
      const label = getReferrerHost(entry._id ?? "");
      counts.set(label, (counts.get(label) ?? 0) + entry.count);
    }

    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  return entries.map((entry) => {
    const raw = entry._id ?? "";

    switch (kind) {
      case "country":
        return { label: normalizeCountry(raw), count: entry.count };
      case "device":
        return { label: normalizeDevice(raw), count: entry.count };
      case "browser":
        return { label: normalizeBrowser(raw), count: entry.count };
      default:
        return { label: raw || unknownLabel, count: entry.count };
    }
  });
}

function mergeDailyClicks(
  legacyDailyClicks: DailyClick[],
  events: Array<Pick<ClickEventAttrs, "createdAt" | "isBot">>,
  excludeBots: boolean
) {
  const dayKeys = getUtcDayKeys(DAILY_WINDOW_DAYS);
  const legacyCounts = new Map(legacyDailyClicks.map((entry) => [entry.date, entry.count]));
  const hasEvents = new Map<string, boolean>();
  const eventCounts = new Map<string, number>();

  for (const event of events) {
    const dayKey = utcDateString(new Date(event.createdAt));
    hasEvents.set(dayKey, true);
    if (!excludeBots || !event.isBot) {
      eventCounts.set(dayKey, (eventCounts.get(dayKey) ?? 0) + 1);
    }
  }

  return dayKeys.map((date) => ({
    date,
    count: hasEvents.get(date) ? eventCounts.get(date) ?? 0 : legacyCounts.get(date) ?? 0,
  }));
}

function toRecentDto(event: ClickEventAttrs & { _id: { toString(): string } }): ClickEventDto {
  return {
    id: event._id.toString(),
    createdAt: new Date(event.createdAt).toISOString(),
    country: event.country || unknownLabel,
    region: event.region,
    city: event.city,
    deviceType: event.deviceType || unknownLabel,
    browser: browserLabel(event),
    browserVersion: event.browserVersion,
    referrerHost: getReferrerHost(event.referrer),
    ip: event.ip,
    isBot: event.isBot,
  };
}

export async function recordClickEvent(request: Request, doc: RedirectableShortUrl) {
  const ip = getRequestIp(request);
  const userAgent = truncateHeader(request.headers.get("user-agent"));
  const referrer = truncateHeader(request.headers.get("referer"));
  const acceptLanguage = truncateHeader(request.headers.get("accept-language"));
  const countryHeader =
    request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");
  const parser = createParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const botTraffic = isBot(userAgent);

  await ClickEvent.create({
    shortUrlId: doc._id.toString(),
    userId: doc.userId,
    short: doc.short,
    ip,
    userAgent,
    referrer,
    acceptLanguage,
    country: decodeHeaderValue(truncateHeader(countryHeader)),
    region: decodeHeaderValue(
      truncateHeader(request.headers.get("x-vercel-ip-country-region"))
    ),
    city: decodeHeaderValue(truncateHeader(request.headers.get("x-vercel-ip-city"))),
    browser: browser.name ?? "",
    browserVersion: browser.version ?? "",
    os: os.name ?? "",
    osVersion: os.version ?? "",
    deviceType: getDeviceType(userAgent, botTraffic),
    isBot: botTraffic,
    visitorKey: createHash("sha256")
      .update(`${ip}\n${userAgent}`)
      .digest("hex")
      .slice(0, 32),
  });
}

export function recordClick(doc: Pick<RedirectableShortUrl, "clicks" | "lastAccessedAt">) {
  doc.clicks += 1;
  doc.lastAccessedAt = new Date();
}

export async function persistRedirectClick(request: Request, doc: RedirectableShortUrl) {
  recordClick(doc);
  await doc.save();

  try {
    await recordClickEvent(request, doc);
  } catch (error) {
    console.error("[clicks] failed to insert click event", {
      shortUrlId: doc._id.toString(),
      short: doc.short,
      error,
    });
  }
}

export async function getOverviewStats(
  userId: string,
  role: string | null | undefined,
  excludeBots: boolean
): Promise<OverviewStatsDto> {
  const eventFilter = buildVisibleEventFilter(userId, role, excludeBots);
  const [links, active, clicks, uniqueVisitorKeys] = await Promise.all([
    ShortUrl.countDocuments(buildVisibleShortUrlFilter(userId, role)),
    ShortUrl.countDocuments(activeFilter(userId, role)),
    excludeBots
      ? ClickEvent.countDocuments(eventFilter)
      : sumVisibleClicks(userId, role),
    ClickEvent.distinct("visitorKey", eventFilter),
  ]);

  return {
    links,
    clicks,
    uniqueVisitors: uniqueVisitorKeys.length,
    active,
  };
}

export async function getUrlClicks(doc: RedirectableShortUrl, excludeBots: boolean): Promise<UrlClicksDto> {
  const shortUrlId = doc._id.toString();
  const filter = eventFilterForShortUrl(shortUrlId, excludeBots);
  const recentWindowStart = getWindowStartUtc(DAILY_WINDOW_DAYS);

  const [clicks, uniqueVisitorKeys, recentEvents, dailyEvents, country, referrer, device, browser] =
    await Promise.all([
      excludeBots ? ClickEvent.countDocuments(filter) : Promise.resolve(doc.clicks),
      ClickEvent.distinct("visitorKey", filter),
      ClickEvent.find(filter).sort({ createdAt: -1 }).limit(RECENT_HITS_LIMIT).lean(),
      ClickEvent.find({ shortUrlId, createdAt: { $gte: recentWindowStart } })
        .select({ createdAt: 1, isBot: 1 })
        .lean(),
      aggregateBreakdown("country", filter),
      aggregateBreakdown("referrer", filter),
      aggregateBreakdown("device", filter),
      aggregateBreakdown("browser", filter),
    ]);

  return {
    clicks,
    uniqueVisitors: uniqueVisitorKeys.length,
    daily: mergeDailyClicks(doc.dailyClicks ?? [], dailyEvents, excludeBots),
    breakdowns: {
      country: toBreakdownEntries(country, "country"),
      referrer: toBreakdownEntries(referrer, "referrer"),
      device: toBreakdownEntries(device, "device"),
      browser: toBreakdownEntries(browser, "browser"),
    },
    recent: recentEvents.map((event) => toRecentDto(event)),
  };
}

