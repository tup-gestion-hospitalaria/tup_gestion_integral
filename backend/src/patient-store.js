export class PatientStore {
  constructor(initialPatients = []) {
    this.patients = structuredClone(initialPatients);
  }

  async listAll() {
    return structuredClone(this.patients);
  }

  async findById(id) {
    const patient = this.patients.find((item) => item.id === id);
    return patient ? structuredClone(patient) : null;
  }

  async insert(id, data) {
    const patient = { id, ...data };
    this.patients.push(patient);
    return structuredClone(patient);
  }

  async save(id, data) {
    const index = this.patients.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    this.patients[index] = { id, ...data };
    return structuredClone(this.patients[index]);
  }
}
