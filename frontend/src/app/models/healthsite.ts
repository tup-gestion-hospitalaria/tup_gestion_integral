export interface Healthsite {
  id: string;
  name: string;
  city: string;
  address: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  distance?: number | null;
}

export function parseHealthsites(body: unknown): Healthsite[] {
  if (!Array.isArray(body)) {
    throw new Error('HEALTHSITES_INVALID_RESPONSE');
  }

  return body.map((item, index) => parseHealthsite(item, index));
}

function parseHealthsite(item: unknown, index: number): Healthsite {
  if (!isRecord(item)) {
    throw new Error('HEALTHSITES_INVALID_RESPONSE');
  }

  const id = readRequiredString(item['id'], `healthsite-${index + 1}`);
  const name = readRequiredString(item['name']);
  const city = readRequiredString(item['city']);
  const address = readRequiredString(item['address']);
  const type = readRequiredString(item['type']);
  const latitude = readNullableNumber(item['latitude']);
  const longitude = readNullableNumber(item['longitude']);
  const googleMapsUrl = readNullableString(item['googleMapsUrl']);

  const parsed: Healthsite = {
    id,
    name,
    city,
    address,
    type,
    latitude,
    longitude,
    googleMapsUrl,
  };

  if ('distance' in item) {
    parsed.distance = readNullableNumber(item['distance']);
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readRequiredString(value: unknown, fallback?: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error('HEALTHSITES_INVALID_RESPONSE');
}

function readNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value.trim() ? value.trim() : null;
  }

  throw new Error('HEALTHSITES_INVALID_RESPONSE');
}

function readNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  throw new Error('HEALTHSITES_INVALID_RESPONSE');
}
