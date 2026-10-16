export const USER_FIELDS = [
  'email',
  'displayName',
  'photoUrl',
  'role',
  'status',
  'active',
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy'
];

export const ALLOWED_STATUSES = ['pending', 'approved', 'rejected', 'disabled'];
export const ALLOWED_ROLES = ['user', 'admin'];

export class UserStore {
  constructor(initialUsers = []) {
    this.users = structuredClone(initialUsers);
  }

  findAll() {
    return structuredClone(this.users);
  }

  findById(uid) {
    const user = this.users.find((item) => item.uid === uid);
    return user ? structuredClone(user) : null;
  }

  findByEmail(email) {
    const user = this.users.find(
      (item) => item.email?.toLowerCase() === email?.toLowerCase()
    );
    return user ? structuredClone(user) : null;
  }

  create(uid, data) {
    const existing = this.findById(uid);
    if (existing) {
      return structuredClone(existing);
    }

    const now = new Date().toISOString();
    const user = {
      uid,
      email: data.email ?? '',
      displayName: data.displayName ?? '',
      photoUrl: data.photoUrl ?? null,
      role: data.role ?? null,
      status: data.status ?? 'pending',
      active: data.active ?? false,
      createdAt: data.createdAt ?? now,
      createdBy: data.createdBy ?? uid,
      updatedAt: data.updatedAt ?? now,
      updatedBy: data.updatedBy ?? uid
    };

    this.users.push(user);
    return structuredClone(user);
  }

  update(uid, changes, updatedBy = uid) {
    const index = this.users.findIndex((item) => item.uid === uid);
    if (index === -1) {
      return null;
    }

    const now = new Date().toISOString();
    const current = this.users[index];
    const updated = {
      ...current,
      ...changes,
      uid,
      updatedAt: now,
      updatedBy
    };

    if (changes.status !== undefined && changes.active === undefined) {
      updated.active = changes.status === 'approved';
    }

    this.users[index] = updated;
    return structuredClone(updated);
  }

  delete(uid) {
    const index = this.users.findIndex((item) => item.uid === uid);
    if (index === -1) {
      return false;
    }

    this.users.splice(index, 1);
    return true;
  }
}

export function validateUserStatusUpdate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return 'El cuerpo debe ser un objeto JSON.';
  }

  const { status, role } = data;

  if (status === undefined && role === undefined) {
    return 'Debe proporcionar al menos status o role a actualizar.';
  }

  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    return `Estado no válido. Valores permitidos: ${ALLOWED_STATUSES.join(', ')}.`;
  }

  if (role !== undefined && role !== null && !ALLOWED_ROLES.includes(role)) {
    return `Rol no válido. Valores permitidos: ${ALLOWED_ROLES.join(', ')}.`;
  }

  return null;
}
