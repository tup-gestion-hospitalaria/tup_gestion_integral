export function authenticate(verifyIdToken) {
  if (typeof verifyIdToken !== "function") {
    throw new TypeError("Se requiere una función para verificar tokens.");
  }

  return async function authenticateRequest(request, response, next) {
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return response.status(401).json({
        message: "Se requiere un token de autenticación.",
      });
    }

    try {
      const decodedToken = await verifyIdToken(match[1]);

      request.user = {
        ...decodedToken,
        role: decodedToken.role ?? "user",
      };

      next();
    } catch (_error) {
      return response.status(401).json({
        message: "El token de autenticación no es válido o expiró.",
      });
    }
  };
}
