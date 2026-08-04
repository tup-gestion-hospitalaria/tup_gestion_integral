export class FirestorePatientStore {
  constructor(db) {
    this.collection = db.collection('patients');
  }

  async findAll() {
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

  async create(data) {
    const reference = this.collection.doc();
    await reference.set(data);
    return { id: reference.id, ...data };
  }

  async replace(id, data) {
    const reference = this.collection.doc(id);
    const document = await reference.get();

    if (!document.exists) {
      return null;
    }

    await reference.set(data);
    return { id, ...data };
  }

  async update(id, changes) {
    const reference = this.collection.doc(id);
    const document = await reference.get();

    if (!document.exists) {
      return null;
    }

    await reference.update(changes);
    return { id, ...document.data(), ...changes };
  }

  async delete(id) {
    const reference = this.collection.doc(id);
    const document = await reference.get();

    if (!document.exists) {
      return false;
    }

    await reference.delete();
    return true;
  }
}
