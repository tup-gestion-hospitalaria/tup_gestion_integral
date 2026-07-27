# API REST - Gestión Hospitalaria

Backend Express del TP11. Al iniciar realiza un GET a Random User y conserva los
pacientes obtenidos en memoria. Los cambios realizados mediante la API se
reinician cuando el proceso vuelve a arrancar.

## Ejecutar

```bash
npm install
npm run dev
```

La API queda disponible en `http://localhost:3000`.

Si Windows informa `unable to verify the first certificate`, ejecutar con el
almacén de certificados del sistema:

```bash
npm run dev:windows
```

## Endpoints

| Método | Ruta | Acción |
| --- | --- | --- |
| GET | `/api/patients` | Obtener todos |
| GET | `/api/patients/:id` | Obtener uno |
| POST | `/api/patients` | Crear |
| PUT | `/api/patients/:id` | Reemplazar completamente |
| PATCH | `/api/patients/:id` | Modificar parcialmente |
| DELETE | `/api/patients/:id` | Eliminar |
| GET | `/health` | Comprobar el estado del servicio |

Ejemplos completos para probar cada operación:

```bash
curl http://localhost:3000/api/patients

curl http://localhost:3000/api/patients/ID

curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Ana Pérez","email":"ana@example.com","city":"La Plata","country":"Argentina","picture":"https://example.com/ana.jpg","active":true}'

curl -X PUT http://localhost:3000/api/patients/ID \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Ana Gómez","email":"ana.gomez@example.com","city":"Berisso","country":"Argentina","picture":"https://example.com/ana.jpg","active":false}'

curl -X PATCH http://localhost:3000/api/patients/ID \
  -H "Content-Type: application/json" \
  -d '{"active":false}'

curl -X DELETE http://localhost:3000/api/patients/ID
```

## Pruebas

```bash
npm test
```

## Hosting en Render

El archivo `render.yaml` de la raíz deja configurado el servicio. Después de
subir la rama, crear un Blueprint en Render conectado a este repositorio. Cuando
Render entregue la URL pública, reemplazar `backendApiUrl` en el environment del
frontend por `<URL-DE-RENDER>/api`.
