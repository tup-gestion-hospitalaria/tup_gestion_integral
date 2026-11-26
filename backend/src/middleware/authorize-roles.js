import { authorizeUser } from './authorize-user.js';

export function authorizeRoles(...allowedRoles) {
  return authorizeUser({ allowedRoles, requireApproved: true });
}
