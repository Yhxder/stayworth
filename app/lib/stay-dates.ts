/**
 * Default stay dates are always in the future so the first thing a user sees
 * is a plausible trip, not a date that has already passed.
 *
 * "Today" is resolved in the app time zone rather than the runtime's local
 * time zone, so the server render (UTC on Cloudflare) and the browser render
 * agree and hydration stays stable.
 */
export const APP_TIME_ZONE = "Asia/Shanghai";

export const DEFAULT_CHECK_IN_OFFSET_DAYS = 30;
export const DEFAULT_CHECK_OUT_OFFSET_DAYS = DEFAULT_CHECK_IN_OFFSET_DAYS + 1;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: APP_TIME_ZONE,
  year: "numeric",
});

function toIsoDate(date: Date) {
  const parts = isoDateFormatter.formatToParts(date);
  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function parseIsoDate(value: string) {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) {
    throw new RangeError(`Invalid ISO date: ${value}`);
  }
  return timestamp;
}

export function getTodayIso(now: Date = new Date()) {
  return toIsoDate(now);
}

export function addDaysToIsoDate(value: string, days: number) {
  if (!Number.isInteger(days)) {
    throw new RangeError("Day offset must be an integer");
  }

  const shifted = new Date(parseIsoDate(value) + days * MILLISECONDS_PER_DAY);
  return shifted.toISOString().slice(0, 10);
}

export function getDefaultStayDates(now: Date = new Date()) {
  const today = getTodayIso(now);

  return {
    checkIn: addDaysToIsoDate(today, DEFAULT_CHECK_IN_OFFSET_DAYS),
    checkOut: addDaysToIsoDate(today, DEFAULT_CHECK_OUT_OFFSET_DAYS),
  };
}
