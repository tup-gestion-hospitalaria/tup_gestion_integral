# API REST - Gestión Hospitalaria

Backend Express de Gestión Integral Hospitalaria. Usa Firebase Authentication
para validar identidades y Cloud Firestore para persistir pacientes. El
arranque no carga datos externos: los datos locales se crean con un comando
explícito y reproducible.

El contrato objetivo versionado de GI-01 está documentado en
[`docs/GI-01-alcance-roles-firestore-api.md`](../docs/GI-01-alcance-roles-firestore-api.md).
La implementación actual conserva temporalmente el prefijo `/api` hasta que se
realice la migración a `/api/v1`.

## Ejecutar

```bash
npm install
npm run dev
```

La API queda disponible en `http://localhost:3000`.

Las rutas bajo `/api` requieren un ID token de Firebase en el encabezado:

```http
Authorization: Bearer <firebase-id-token>
```

Los usuarios con rol `user` pueden consultar pacientes. Las operaciones de
creación, modificación y eliminación requieren el rol `admin`.

Para asignar un rol desde un entorno administrativo configurado con las
credenciales de Firebase:

```bash
npm run role:set -- usuario@example.com user
npm run role:set -- administrador@example.com admin
```

Después de cambiar el rol, la persona debe renovar su token o volver a iniciar
sesión para recibir el nuevo claim.

Si Windows informa `unable to verify the first certificate`, ejecutar con el
almacén de certificados del sistema:

```bash
npm run dev:windows
```

## Endpoints

| Método | Ruta | Acción |
| --- | --- | --- |
| GET | `/api/patients` | Obtener todos (`user`, `admin`) |
| GET | `/api/patients/:id` | Obtener uno (`user`, `admin`) |
| POST | `/api/patients` | Crear (`admin`) |
| PUT | `/api/patients/:id` | Reemplazar completamente (`admin`) |
| PATCH | `/api/patients/:id` | Modificar parcialmente (`admin`) |
| DELETE | `/api/patients/:id` | Eliminar (`admin`) |
| GET | `/api/healthsites` | Consultar centros (`user`, `admin`) |
| GET | `/health` | Comprobar el estado del servicio |

Ejemplos completos para probar cada operación:

```bash
curl http://localhost:3000/api/patients \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN"

curl http://localhost:3000/api/patients/ID \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN"

curl -X POST http://localhost:3000/api/patients \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Ana Pérez","email":"ana@example.com","city":"La Plata","country":"Argentina","picture":"https://example.com/ana.jpg","active":true}'

curl -X PUT http://localhost:3000/api/patients/ID \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Ana Gómez","email":"ana.gomez@example.com","city":"Berisso","country":"Argentina","picture":"https://example.com/ana.jpg","active":false}'

curl -X PATCH http://localhost:3000/api/patients/ID \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active":false}'

curl -X DELETE http://localhost:3000/api/patients/ID \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN"
```

## Pruebas

Las pruebas unitarias no necesitan servicios externos:

```bash
npm test
```

Las pruebas de integración levantan Firebase Authentication y Firestore
Emulator, cargan fixtures deterministas, prueban el store, el arranque de la
API, los roles y las reglas, y apagan los emuladores al terminar:

```bash
npm run test:emulators
```

El comando usa siempre el proyecto local `demo-tup-gestion-integral`. El script
de fixtures además rechaza ejecutarse si no detecta ambos emuladores, por lo que
no puede borrar ni sembrar datos de producción.

Para desarrollo interactivo, este comando levanta los emuladores, carga los
fixtures y arranca el backend (la UI queda en `http://127.0.0.1:4000`):

```bash
npm run emulators:dev
```

También se pueden dejar los emuladores activos y volver a cargar los fixtures
manualmente, desde otra terminal:

```bash
npm run emulators:start
npm run emulators:seed
```

Firebase CLI necesita Java disponible en `PATH` para ejecutar Firestore
Emulator. Las credenciales de Google o Firebase no son necesarias para estos
comandos locales.

## Hosting en Render

El archivo `render.yaml` de la raíz deja configurado el servicio. Después de
subir la rama, crear un Blueprint en Render conectado a este repositorio. Cuando
Render entregue la URL pública, reemplazar `backendApiUrl` en el environment del
frontend por `<URL-DE-RENDER>/api`.
