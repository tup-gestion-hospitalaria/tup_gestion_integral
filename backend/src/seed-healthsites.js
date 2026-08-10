const DEFAULT_SOURCE_URL = 'https://api.healthsites.io/api/v3/facilities/';

export async function fetchHealthsites(
  fetchImplementation = fetch,
  apiKey = 'ade0af6b7f80ec943d4791ee29a9f5c586c85a0e'
) {
  const allResults = [];

  for (let page = 1; page <= 3; page++) {
    const params = new URLSearchParams({
      'api-key': apiKey,
      'extent': '-58.20,-35.10,-57.70,-34.70',
      'page': page.toString(),
      'flat-properties': 'true',
    });

    const response = await fetchImplementation(`${DEFAULT_SOURCE_URL}?${params}`);

    if (!response.ok) {
      console.warn(`Error al obtener página ${page} de healthsites: ${response.status}`);
      continue;
    }

    const body = await response.json();
    const results = Array.isArray(body) ? body : (body.results ?? []);
    allResults.push(...results);
  }

  return allResults.map((item, index) => {
    const properties = item.attributes ?? item.properties ?? item;
    const coordinates = item.centroid?.coordinates ?? item.geometry?.coordinates ?? [];

    const longitude =
      coordinates[0] ??
      properties.longitude ??
      properties.lon ??
      properties.lng ??
      properties['addr:lon'] ??
      null;

    const latitude =
      coordinates[1] ?? properties.latitude ?? properties.lat ?? properties['addr:lat'] ?? null;

    const type = properties.amenity ?? properties.healthcare ?? 'hospital';

    return {
      id: item.id?.toString() ?? index.toString(),
      name: properties.name || getDefaultName(type, index),
      city: properties.city || properties.addr_city || properties['addr:city'] || 'Sin información',
      address:
        properties.address ||
        properties.addr_full ||
        properties.addr_street ||
        properties['addr:street'] ||
        'Sin información',
      type,
      latitude,
      longitude,
      googleMapsUrl:
        latitude !== null && longitude !== null
          ? `https://www.google.com/maps?q=${latitude},${longitude}`
          : null,
    };
  });
}

function getDefaultName(type, index) {
  const normalizedType = (type ?? '').toLowerCase();
  if (normalizedType.includes('clinic')) {
    return `Clínica ${index + 1}`;
  }
  return `Hospital ${index + 1}`;
}

// Cache para healthsites (se cargan una vez al iniciar)
let cachedHealthsites = null;

export async function getHealthsitesCache() {
  if (!cachedHealthsites) {
    try {
      cachedHealthsites = await fetchHealthsites();
    } catch (error) {
      console.error('Error al obtener healthsites:', error);
      cachedHealthsites = [];
    }
  }
  return cachedHealthsites;
}
