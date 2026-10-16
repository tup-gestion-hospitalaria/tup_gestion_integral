export function authorizeUser({ allowedRoles = [], requireApproved = true } = {}) {
  return function authorizeRequest(request, response, next) {
    if (!request.user) {
      return response.status(401).json({
        message: 'Se requiere autenticación.'
      });
    }

    const { status, active, role } = request.user;

    if (requireApproved) {
      if (status === 'pending') {
        return response.status(403).json({
          code: 'ACCOUNT_PENDING',
          message: 'Tu cuenta está pendiente de aprobación por un administrador.'
        });
      }

      if (status === 'rejected') {
        return response.status(403).json({
          code: 'ACCOUNT_REJECTED',
          message: 'Tu cuenta fue rechazada.'
        });
      }

      if (status === 'disabled' || active === false) {
        return response.status(403).json({
          code: 'ACCOUNT_DISABLED',
          message: 'Tu cuenta está deshabilitada.'
        });
      }
    }

    if (allowedRoles.length > 0) {
      if (!role) {
        return response.status(403).json({
          code: 'NO_ROLE',
          message: 'Tu cuenta no tiene un rol asignado.'
        });
      }

      if (!allowedRoles.includes(role)) {
        return response.status(403).json({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'No tenés permisos para realizar esta operación.'
        });
      }
    }

    next();
  };
}

export function authorizeRoles(...allowedRoles) {
  return authorizeUser({ allowedRoles, requireApproved: true });
}
