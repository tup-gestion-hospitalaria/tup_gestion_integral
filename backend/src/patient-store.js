import { randomUUID } from "node:crypto";

export const PATIENT_REQUIRED_FIELDS = [
  "fullName",
  "email",
  "city",
  "country",
  "picture",
  "active",
];
export const PATIENT_OPTIONAL_FIELDS = ["healthsite"];
export const PATIENT_FIELDS = [
  ...PATIENT_REQUIRED_FIELDS,
  ...PATIENT_OPTIONAL_FIELDS,
];

export class PatientStore {
  constructor(initialPatients = []) {
    this.patients = structuredClone(initialPatients);
  }

  findAll() {
    return structuredClone(this.patients);
  }

  findById(id) {
    const patient = this.patients.find((item) => item.id === id);
    return patient ? structuredClone(patient) : null;
  }

  create(data) {
    const patient = { id: randomUUID(), ...data };
    this.patients.push(patient);
    return structuredClone(patient);
  }

  replace(id, data) {
    const index = this.patients.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    this.patients[index] = { id, ...data };
    return structuredClone(this.patients[index]);
  }

  update(id, changes) {
    const index = this.patients.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    this.patients[index] = { ...this.patients[index], ...changes, id };
    return structuredClone(this.patients[index]);
  }

  delete(id) {
    const index = this.patients.findIndex((item) => item.id === id);
    if (index === -1) {
      return false;
    }

    this.patients.splice(index, 1);
    return true;
  }
}

export function validatePatient(data, requireAllFields = true) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "El cuerpo debe ser un objeto JSON.";
  }

  const suppliedFields = Object.keys(data);
  const unknownField = suppliedFields.find(
    (field) => !PATIENT_FIELDS.includes(field),
  );

  if (unknownField) {
    return `La propiedad "${unknownField}" no está permitida.`;
  }

  if (requireAllFields) {
    const missingField = PATIENT_REQUIRED_FIELDS.find(
      (field) => data[field] === undefined,
    );

    if (missingField) {
      return `La propiedad "${missingField}" es obligatoria.`;
    }
  } else if (suppliedFields.length === 0) {
    return "Se debe enviar al menos una propiedad.";
  }

  const stringFields = PATIENT_REQUIRED_FIELDS.filter(
    (field) => field !== "active",
  );
  const invalidString = stringFields.find(
    (field) =>
      data[field] !== undefined &&
      (typeof data[field] !== "string" || data[field].trim() === ""),
  );

  if (invalidString) {
    return `La propiedad "${invalidString}" debe ser un texto no vacío.`;
  }

  if (data.active !== undefined && typeof data.active !== "boolean") {
    return 'La propiedad "active" debe ser booleana.';
  }

  if (
    data.healthsite !== undefined &&
    (!data.healthsite ||
      typeof data.healthsite !== "object" ||
      Array.isArray(data.healthsite))
  ) {
    return 'La propiedad "healthsite" debe ser un objeto.';
  }

  return null;
}
