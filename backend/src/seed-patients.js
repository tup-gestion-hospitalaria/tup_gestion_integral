const DEFAULT_SOURCE_URL =
  'https://randomuser.me/api/?results=20&seed=gestion-hospitalaria';

export async function fetchInitialPatients(
  fetchImplementation = fetch,
  sourceUrl = process.env.PATIENTS_SOURCE_URL ?? DEFAULT_SOURCE_URL
) {
  const response = await fetchImplementation(sourceUrl);

  if (!response.ok) {
    throw new Error(`La fuente inicial respondió con estado ${response.status}.`);
  }

  const body = await response.json();

  if (!Array.isArray(body.results)) {
    throw new Error('La fuente inicial no devolvió una lista de pacientes.');
  }

  return body.results.map((patient) => ({
    id: patient.login.uuid,
    fullName: `${patient.name.first} ${patient.name.last}`,
    email: patient.email,
    city: patient.location.city,
    country: patient.location.country,
    picture: patient.picture.large,
    active: true
  }));
}
