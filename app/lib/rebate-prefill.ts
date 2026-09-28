import type { Hotel, RebatePrefill } from "../types/hotel";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function parseIsoDate(value: string) {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) {
    throw new RangeError(`Invalid stay date: ${value}`);
  }
  return timestamp;
}

export function countStayNights(checkIn: string, checkOut: string) {
  const nights =
    (parseIsoDate(checkOut) - parseIsoDate(checkIn)) / MILLISECONDS_PER_DAY;

  if (!Number.isInteger(nights) || nights <= 0) {
    throw new RangeError("Check-out must be later than check-in");
  }
  return nights;
}

export function createRebatePrefill(
  hotel: Hotel,
  checkIn: string,
  checkOut: string,
  revision: number,
): RebatePrefill {
  return {
    revision,
    hotelName: hotel.nameZh,
    cashPrice: hotel.cashPrice,
    currency: hotel.currency,
    nights: countStayNights(checkIn, checkOut),
    brandId: hotel.brandId,
    citySlug: hotel.citySlug,
    countryCode: hotel.countryCode,
  };
}
