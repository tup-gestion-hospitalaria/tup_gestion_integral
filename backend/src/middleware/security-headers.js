/**
 * Middleware para configurar headers de seguridad HTTP.
 */
export function securityHeaders() {
  return function securityHeadersMiddleware(_request, response, next) {
    response.removeHeader('X-Powered-By');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none';"
    );
    response.setHeader(
      'Permissions-Policy',
      'geolocation=(), camera=(), microphone=()'
    );
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    next();
  };
}
