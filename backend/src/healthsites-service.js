const DEFAULT_SOURCE_URL = 'https://api.healthsites.io/api/v3/facilities/';
const DEFAULT_EXTENT = '-58.20,-35.10,-57.70,-34.70';
const DEFAULT_PAGE_COUNT = 3;
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1_000;

export class HealthsitesError extends Error {
  constructor(code, statusCode, message) {
    super(message);
    this.name = 'HealthsitesError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function createHealthsitesService(options = {}) {
  const fetchImplementation = options.fetchImplementation ?? globalThis.fetch;
  const apiKey = options.apiKey ?? process.env.HEALTHSITES_API_KEY;
  const sourceUrl = options.sourceUrl ?? DEFAULT_SOURCE_URL;
  const extent = options.extent ?? DEFAULT_EXTENT;
  const pageCount = readPositiveInteger(
    options.pageCount ?? process.env.HEALTHSITES_PAGE_COUNT,
    DEFAULT_PAGE_COUNT
  );
  const timeoutMs = readPositiveInteger(
    options.timeoutMs ?? process.env.HEALTHSITES_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS
  );
  const cacheTtlMs = readPositiveInteger(
    options.cacheTtlMs ?? process.env.HEALTHSITES_CACHE_TTL_MS,
    DEFAULT_CACHE_TTL_MS
  );
  const now = options.now ?? Date.now;

  let cache = null;
  let cacheExpiresAt = 0;
  let pendingRequest = null;

  async function getHealthsites() {
    if (cache && now() < cacheExpiresAt) {
      return cache;
    }

    if (pendingRequest) {
      return pendingRequest;
    }

    pendingRequest = loadHealthsites({
      fetchImplementation,
      apiKey,
      sourceUrl,
      extent,
      pageCount,
      timeoutMs
    })
      .then((healthsites) => {
        cache = healthsites;
        cacheExpiresAt = now() + cacheTtlMs;
        return healthsites;
      })
      .finally(() => {
        pendingRequest = null;
      });

    return pendingRequest;
  }

  return { getHealthsites };
}

async function loadHealthsites({
  fetchImplementation,
  apiKey,
  sourceUrl,
  extent,
  pageCount,
  timeoutMs
}) {
  if (!apiKey) {
    throw new HealthsitesError(
      'HEALTHSITES_NOT_CONFIGURED',
      503,
      'El servicio de centros de salud no está configurado.'
    );
  }

  const allResults = [];

  for (let page = 1; page <= pageCount; page += 1) {
    const pageResults = await fetchPage({
      fetchImplementation,
      apiKey,
      sourceUrl,
      extent,
      page,
      timeoutMs
    });
    allResults.push(...pageResults);
  }

  return allResults.map(normalizeHealthsite);
}

async function fetchPage({
  fetchImplementation,
  apiKey,
  sourceUrl,
  extent,
  page,
  timeoutMs
}) {
  const url = new URL(sourceUrl);
  url.search = new URLSearchParams({
    'api-key': apiKey,
    extent,
    page: page.toString(),
    'flat-properties': 'true'
  }).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  timeout.unref?.();

  let response;
  try {
    response = await fetchImplementation(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError') {
      throw new HealthsitesError(
        'HEALTHSITES_TIMEOUT',
        504,
        'El proveedor de centros de salud no respondió a tiempo.'
      );
    }

    throw new HealthsitesError(
      'HEALTHSITES_UNAVAILABLE',
      502,
      'El proveedor de centros de salud no está disponible.'
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response?.ok) {
    throw new HealthsitesError(
      'HEALTHSITES_UNAVAILABLE',
      502,
      'El proveedor de centros de salud no está disponible.'
    );
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw invalidResponseError();
  }

  const results = Array.isArray(body) ? body : body?.results;
  if (!Array.isArray(results) || results.some((item) => !isRecord(item))) {
    throw invalidResponseError();
  }

  return results;
}

function normalizeHealthsite(item, index) {
  const properties = isRecord(item.attributes)
    ? item.attributes
    : isRecord(item.properties)
      ? item.properties
      : item;
  const coordinates = Array.isArray(item.centroid?.coordinates)
    ? item.centroid.coordinates
    : Array.isArray(item.geometry?.coordinates)
      ? item.geometry.coordinates
      : [];

  const longitude = firstFiniteNumber(
    coordinates[0],
    properties.longitude,
    properties.lon,
    properties.lng,
    properties['addr:lon']
  );
  const latitude = firstFiniteNumber(
    coordinates[1],
    properties.latitude,
    properties.lat,
    properties['addr:lat']
  );
  const type = firstText(properties.amenity, properties.healthcare) ?? 'hospital';

  return {
    id: normalizeId(item.id, index),
    name: firstText(properties.name) ?? getDefaultName(type, index),
    city:
      firstText(properties.city, properties.addr_city, properties['addr:city']) ??
      'Sin información',
    address:
      firstText(
        properties.address,
        properties.addr_full,
        properties.addr_street,
        properties['addr:street']
      ) ?? 'Sin información',
    type,
    latitude,
    longitude,
    googleMapsUrl:
      latitude !== null && longitude !== null
        ? `https://www.google.com/maps?q=${latitude},${longitude}`
        : null
  };
}

function normalizeId(value, index) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }

  return `healthsite-${index + 1}`;
}

function firstText(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    const number = Number(value);
    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function getDefaultName(type, index) {
  if (type.toLowerCase().includes('clinic')) {
    return `Clínica ${index + 1}`;
  }

  return `Hospital ${index + 1}`;
}

function readPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function invalidResponseError() {
  return new HealthsitesError(
    'HEALTHSITES_INVALID_RESPONSE',
    502,
    'El proveedor devolvió una respuesta inválida.'
  );
}
