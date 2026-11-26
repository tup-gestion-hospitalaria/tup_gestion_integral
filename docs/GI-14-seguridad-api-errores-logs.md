# GI-14 — Endurecimiento de API, Seguridad, Errores y Observabilidad

Este documento detalla la arquitectura de seguridad, control de límites y observabilidad segura implementada en la API REST de Gestión Integral Hospitalaria en el marco de la tarjeta **GI-14**.

---

## 1. Restricción de CORS a Orígenes Permitidos

- **Middleware**: `backend/src/middleware/cors.js`.
- **Configuración**: Se define a través de la variable de entorno `CORS_ALLOWED_ORIGINS` (o `CORS_ORIGIN`), soportando orígenes individuales o listas separadas por coma (ej. `http://localhost:4201,https://gestion-hospitalaria.web.app`).
- **Comportamiento**:
  - Si la solicitud no incluye encabezado `Origin` (ej. llamadas directas servidor a servidor o same-origin), se procesa con normalidad.
  - Si el `Origin` coincide con la lista permitida (o si se configuró `*`), la API responde con `Access-Control-Allow-Origin: <origin>`, `Vary: Origin`, `Access-Control-Allow-Credentials: true` y los métodos/headers autorizados.
  - Las solicitudes preflight `OPTIONS` válidas responden con HTTP `204 No Content`.
  - Si el origen **no está autorizado**, las solicitudes preflight y regulares son rechazadas con HTTP `403 Forbidden` (`{ "message": "Origen no permitido por política CORS." }`), impidiendo el acceso indebido desde navegadores.

---

## 2. Headers de Seguridad HTTP y Rate Limiting

### Headers de Seguridad
- **Middleware**: `backend/src/middleware/security-headers.js`.
- Se deshabilitó la cabecera `X-Powered-By` en Express para evitar el reconocimiento de tecnología.
- Encabezados inyectados en cada respuesta:
  - `X-Content-Type-Options: nosniff`: Previene ataques de tipo MIME sniffing.
  - `X-Frame-Options: DENY`: Previene ataques de Clickjacking impidiendo que la API sea embebida en `<frame>` o `<iframe>`.
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`: Exige navegación cifrada TLS/HTTPS.
  - `Referrer-Policy: strict-origin-when-cross-origin`: Protege la fuga de rutas internas en solicitudes externas.
  - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none';`: Restringe la ejecución y anidación de contenido externo.
  - `Permissions-Policy: geolocation=(), camera=(), microphone=()`: Deshabilita accesos innecesarios a APIs del dispositivo.
  - `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Resource-Policy: cross-origin`.

### Rate Limiting
- **Middleware**: `backend/src/middleware/rate-limiter.js`.
- Implementado en memoria nativa sin dependencias pesadas externas.
- Controla solicitudes por IP con ventana deslizante (por defecto 15 minutos, configurable vía `RATE_LIMIT_WINDOW_MS` y `RATE_LIMIT_MAX_REQUESTS`).
- Encabezados emitidos:
  - `RateLimit-Limit`: Cuota máxima por ventana.
  - `RateLimit-Remaining`: Solicitudes restantes.
  - `RateLimit-Reset`: Segundos hasta el restablecimiento de la cuota.
- Al superar la cuota:
  - Responde HTTP `429 Too Many Requests`.
  - Encabezado `Retry-After` con los segundos de espera.
  - Cuerpo: `{ "message": "Demasiadas solicitudes. Por favor intente nuevamente más tarde." }`.

---

## 3. Request ID y Logging Estructurado con Redacción de Datos Sensibles

### Request ID
- **Middleware**: `backend/src/middleware/request-id.js`.
- Cada petición entrante recibe un identificador único generado mediante `crypto.randomUUID()` de Node.js.
- Si el cliente envía un header `X-Request-Id` seguro (alfanumérico / guiones), se conserva y propaga para trazabilidad distribuida.
- Se inyecta en `request.id` y en el encabezado de respuesta `X-Request-Id`.

### Logging Estructurado y Redacción de PII/Secretos
- **Middleware**: `backend/src/middleware/logger.js`.
- Emite eventos en formato JSON estructurado:
  ```json
  {
    "timestamp": "2026-11-26T18:37:45.669Z",
    "level": "info",
    "message": "HTTP_REQUEST",
    "requestId": "fd9c8bf8-ea9d-4414-86cd-2c667da2773c",
    "method": "GET",
    "url": "/api/patients",
    "statusCode": 200,
    "durationMs": 7
  }
  ```
- **Redacción automática**:
  - Claves sensibles en headers, query params o payloads (`authorization`, `cookie`, `token`, `password`, `secret`, `apiKey`, `dni`, `documentNumber`, `phone`, `email`, `medicalRecord`) son reemplazadas por `[REDACTED]`.
  - En los encabezados `Authorization: Bearer <token>`, el token se redacta automáticamente impidiendo su exposición en registros o consolas.
  - En las URLs, los parámetros de consulta sensibles son saneados antes de emitir el log.

---

## 4. Normalización de Respuestas de Error y Límites de Payload

- **Límite de Payload**:
  - Configurado en `8kb` (`express.json({ limit: '8kb' })`).
  - Solicitudes que superan este tamaño son capturadas y devuelven HTTP `413 Payload Too Large`:
    ```json
    { "message": "El cuerpo de la solicitud es demasiado grande." }
    ```
- **JSON Inválido**:
  - Los errores de sintaxis en el parseo del body devuelven HTTP `400 Bad Request`:
    ```json
    { "message": "JSON inválido." }
    ```
- **Errores Internos (500)**:
  - El manejador global de errores captura excepciones no controladas, las registra con el `requestId` correspondiente mediante `logger.error` y responde:
    ```json
    { "message": "Error interno del servidor." }
    ```
  - **Nunca** se filtran stack traces, consultas de base de datos o secretos en la respuesta HTTP hacia el cliente.

---

## 5. Revocación de Tokens y Permisos Críticos

- **Verificación con `checkRevoked`**:
  - En `start-server.js`, la verificación de tokens de Firebase utiliza `auth.verifyIdToken(token, true)`, forzando la validación del estado de revocación en tiempo real.
- **Middleware `authenticate`**:
  - Detecta tokens revocados (`auth/id-token-revoked`) y responde de forma unificada con HTTP `401 Unauthorized`:
    ```json
    {
      "code": "TOKEN_REVOKED",
      "message": "El token de autenticación ha sido revocado."
    }
    ```
- **Acciones Críticas**:
  - Al deshabilitar (`disabled`), rechazar (`rejected`) o cambiar el rol de un usuario en `/api/v1/users/:uid/status` o `/api/v1/users/:uid/role`, el backend invoca automáticamente `revokeRefreshTokens(targetUid)` para invalidar inmediatamente sus sesiones activas.

---

## 6. Estado de Dependencias y Excepciones

- **Superficie de Ataque Mínima**:
  - Las dependencias principales de producción se mantienen estrictamente en:
    - `express`: Framework HTTP.
    - `dotenv`: Carga de configuración de entorno.
    - `firebase-admin`: SDK administrativo de Firebase.
- **Implementación Nativa**:
  - Los middlewares de CORS, rate limiting, request ID, headers de seguridad y redacción de logs fueron construidos utilizando APIs nativas de Node.js 22+ (`node:crypto`, `node:url`, estructuras Map en memoria), sin incorporar paquetes de terceros innecesarios ni dependencias con vulnerabilidades conocidas.
- **Pruebas Automatizadas**:
  - Toda la funcionalidad de GI-14 se encuentra respaldada por la suite automatizada en `backend/test/security-hardening.test.js` y pasa el 100% de los tests unitarios e integrados.
