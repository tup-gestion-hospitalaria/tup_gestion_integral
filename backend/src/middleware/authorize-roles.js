export function authorizeRoles(...allowedRoles) {
  return function authorizeRequest(request, response, next) {
    if (!request.user) {
      return response.status(401).json({
        message: "Se requiere autenticación.",
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return response.status(403).json({
        message: "No tenés permisos para realizar esta operación.",
      });
    }

    next();
  };
}
