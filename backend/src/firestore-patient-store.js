export class FirestorePatientStore {
  constructor(db) {
    this.collection = db.collection('patients');
  }

  async listAll() {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));
  }

  async findById(id) {
    const document = await this.collection.doc(id).get();
    return document.exists ? { id: document.id, ...document.data() } : null;
  }

  async insert(id, data) {
    const reference = this.collection.doc(id);
    const { id: _ignored, ...payload } = data;
    await reference.set(payload);
    return { id, ...payload };
  }

  async save(id, data) {
    const reference = this.collection.doc(id);
    const document = await reference.get();

    if (!document.exists) {
      return null;
    }

    const { id: _ignored, ...payload } = data;
    await reference.set(payload);
    return { id, ...payload };
  }
}
