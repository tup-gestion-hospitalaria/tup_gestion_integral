const SORT_FIELDS = ['fullName', 'email', 'city', 'country', 'createdAt'];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 100;

export function parseListQuery(query) {
  const pageRaw = query.page ?? `${DEFAULT_PAGE}`;
  const limitRaw = query.limit ?? `${DEFAULT_LIMIT}`;

  if (!/^\d+$/.test(pageRaw)) {
    return { ok: false, status: 400, message: 'El parámetro "page" debe ser un entero positivo.' };
  }

  if (!/^\d+$/.test(limitRaw)) {
    return { ok: false, status: 400, message: 'El parámetro "limit" debe ser un entero positivo.' };
  }

  const page = Number(pageRaw);
  const limit = Number(limitRaw);

  if (page < 1) {
    return { ok: false, status: 400, message: 'El parámetro "page" debe ser un entero positivo.' };
  }

  if (limit < 1) {
    return { ok: false, status: 400, message: 'El parámetro "limit" debe ser un entero positivo.' };
  }

  if (limit > MAX_LIMIT) {
    return {
      ok: false,
      status: 413,
      message: `El parámetro "limit" no puede superar ${MAX_LIMIT}.`
    };
  }

  const sort = query.sort ?? 'fullName';
  if (!SORT_FIELDS.includes(sort)) {
    return { ok: false, status: 400, message: 'El parámetro "sort" no es válido.' };
  }

  const order = query.order ?? 'asc';
  if (order !== 'asc' && order !== 'desc') {
    return { ok: false, status: 400, message: 'El parámetro "order" debe ser "asc" o "desc".' };
  }

  let active;
  if (query.active !== undefined) {
    if (query.active !== 'true' && query.active !== 'false') {
      return { ok: false, status: 400, message: 'El parámetro "active" debe ser "true" o "false".' };
    }
    active = query.active === 'true';
  }

  let q;
  if (query.q !== undefined) {
    if (typeof query.q !== 'string') {
      return { ok: false, status: 400, message: 'El parámetro "q" debe ser texto.' };
    }
    if (query.q.length > MAX_QUERY_LENGTH) {
      return {
        ok: false,
        status: 400,
        message: `El parámetro "q" no puede superar ${MAX_QUERY_LENGTH} caracteres.`
      };
    }
    q = query.q.trim();
  }

  let city;
  if (query.city !== undefined) {
    if (typeof query.city !== 'string' || query.city.trim() === '') {
      return { ok: false, status: 400, message: 'El parámetro "city" debe ser texto.' };
    }
    city = query.city.trim();
  }

  let country;
  if (query.country !== undefined) {
    if (typeof query.country !== 'string' || query.country.trim() === '') {
      return { ok: false, status: 400, message: 'El parámetro "country" debe ser texto.' };
    }
    country = query.country.trim();
  }

  const includeDeleted = query.includeDeleted === 'true';

  return {
    ok: true,
    value: {
      page,
      limit,
      sort,
      order,
      active,
      q,
      city,
      country,
      includeDeleted
    }
  };
}

function matchesSearch(patient, q) {
  if (!q) {
    return true;
  }

  const needle = q.toLowerCase();
  const haystack = [
    patient.fullName,
    patient.email,
    patient.city,
    patient.country
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(needle);
}

function comparePatients(a, b, sort, order) {
  const direction = order === 'asc' ? 1 : -1;
  const valueA = String(a[sort] ?? '').toLowerCase();
  const valueB = String(b[sort] ?? '').toLowerCase();
  const result = valueA.localeCompare(valueB);

  if (result !== 0) {
    return result * direction;
  }

  return a.id.localeCompare(b.id) * direction;
}

export function filterAndPaginate(patients, params) {
  let filtered = patients;

  if (!params.includeDeleted) {
    filtered = filtered.filter((patient) => patient.deletedAt == null);
  }

  if (params.active !== undefined) {
    filtered = filtered.filter((patient) => patient.active === params.active);
  }

  if (params.city) {
    const city = params.city.toLowerCase();
    filtered = filtered.filter(
      (patient) => String(patient.city ?? '').toLowerCase() === city
    );
  }

  if (params.country) {
    const country = params.country.toLowerCase();
    filtered = filtered.filter(
      (patient) => String(patient.country ?? '').toLowerCase() === country
    );
  }

  if (params.q) {
    filtered = filtered.filter((patient) => matchesSearch(patient, params.q));
  }

  const sorted = [...filtered].sort((a, b) =>
    comparePatients(a, b, params.sort, params.order)
  );

  const total = sorted.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit);
  const start = (params.page - 1) * params.limit;
  const items = sorted.slice(start, start + params.limit);

  return {
    items,
    page: params.page,
    limit: params.limit,
    total,
    totalPages
  };
}
