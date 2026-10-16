import { FieldValue } from 'firebase-admin/firestore';

export class FirestoreUserStore {
  constructor(db) {
    this.collection = db.collection('users');
  }

  async findAll() {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data()
    }));
  }

  async findById(uid) {
    const doc = await this.collection.doc(uid).get();
    return doc.exists ? { uid: doc.id, ...doc.data() } : null;
  }

  async create(uid, data) {
    const docRef = this.collection.doc(uid);
    const existing = await docRef.get();
    if (existing.exists) {
      return { uid, ...existing.data() };
    }

    const userData = {
      email: data.email ?? '',
      displayName: data.displayName ?? '',
      photoUrl: data.photoUrl ?? null,
      role: data.role ?? null,
      status: data.status ?? 'pending',
      active: data.active ?? false,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: data.createdBy ?? uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: data.updatedBy ?? uid
    };

    await docRef.set(userData);
    return { uid, ...userData };
  }

  async update(uid, changes, updatedBy = uid) {
    const docRef = this.collection.doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const payload = {
      ...changes,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy
    };

    if (changes.status !== undefined && changes.active === undefined) {
      payload.active = changes.status === 'approved';
    }

    await docRef.update(payload);
    const updated = await docRef.get();
    return { uid, ...updated.data() };
  }

  async delete(uid) {
    const docRef = this.collection.doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      return false;
    }

    await docRef.delete();
    return true;
  }
}

