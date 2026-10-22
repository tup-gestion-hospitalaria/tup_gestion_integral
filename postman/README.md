# Pruebas Postman — Gestión Integral API

Colección git-native (formato v3) en `postman/collections/gestion-integral-api/` con tests `pm.test` en cada request.

## Qué cubre

| Carpeta | Contenido |
| --- | --- |
| **Setup** | Login en Auth Emulator → guarda `admin_id_token` y `user_id_token` |
| **Health** | `GET /health` público |
| **Usuarios** | `/api/v1/users/me`, listado admin, 403 para `user` |
| **Pacientes** | Lectura, filtros, 403/404 |
| **Healthsites** | `GET /api/v1/healthsites` |
| **Seguridad y errores** | 401, 400 validación |
| **Flujo admin** | Crear → PUT → PATCH → DELETE → restore → 409 |

Endpoints de **derivaciones** y **audit-logs** (GI-01) aún no están en el backend; cuando se implementen, agregar requests en carpetas nuevas siguiendo el mismo esquema.

## Entornos

- **Local emulators** — `postman/environments/local-emulators.environment.yaml` (usuarios `admin@example.test` / `user@example.test`, mismos passwords que `backend/test/fixtures/emulator-data.js`).
- **Render** — plantilla con `base_url` y tokens Firebase manuales.

## Ejecución local (recomendada)

1. Desde `backend/`:

   ```bash
   npm run emulators:dev
   ```

   Levanta Auth + Firestore emulators, carga fixtures y la API en `http://localhost:3000`.

2. **Postman Desktop**: importar la carpeta `postman/collections/gestion-integral-api` y el entorno **Local emulators**. Ejecutar la colección en este orden: **Setup** → resto (o **Run collection** con Setup primero).

3. **Postman CLI** (opcional):

   ```bash
   npm install -g postman-cli
   postman collection run postman/collections/gestion-integral-api \
     -e postman/environments/local-emulators.environment.yaml
   ```

   Si el CLI no resuelve la colección v3 por directorio, usar Postman Desktop o `postman collection lint` tras instalar el CLI.

## Compatibilidad `/api` vs `/api/v1`

Las pruebas usan **`/api/v1`**, alineado con GI-01. El backend expone también rutas legacy bajo `/api` durante la migración.

## CI (opcional)

Para correr en GitHub Actions: levantar emuladores en un job, luego `postman collection run` con el entorno local. Ver skill `postman:ci-integration` cuando quieras automatizarlo en el repo.
