# GI-01 — Alcance, roles y modelo Firestore

**Estado:** propuesta lista para revisión  
**Responsable:** Lucas Lautaro Luciano  
**Revisión requerida:** Julian Tesoreiro y Lautaro Esposito  
**Última actualización:** 2026-10-16

## 1. Decisiones del MVP

| Tema | Decisión |
| --- | --- |
| Funciones principales | Gestión de pacientes y derivaciones |
| Organización | Una única institución y una única sede |
| Autenticación | Firebase Authentication |
| Persistencia | Cloud Firestore |
| Roles | `user` y `admin` |
| API | REST versionada bajo `/api/v1` |
| Entrega oficial | Web responsive y PWA |
| Rama de entrega | `main` |

La decisión de una sola institución evita incorporar aislamiento multi-tenant antes de validar el flujo principal. Los centros de derivación son destinos externos consultables; no representan sedes administradas por el sistema.

## 2. Alcance funcional

### Incluido

- Registro e inicio de sesión con correo/contraseña o Google mediante Firebase Authentication.
- Perfil básico de la persona usuaria y rol asignado mediante custom claims.
- Alta, consulta, modificación y desactivación de pacientes.
- Creación, consulta y seguimiento de derivaciones.
- Cambios de estado controlados para las derivaciones.
- Consulta de centros de derivación externos.
- Registro de auditoría para acciones que modifican datos o permisos.

### Fuera del MVP

- Múltiples instituciones, sucursales o aislamiento multi-tenant.
- Historia clínica, diagnósticos completos, recetas, turnos, internación y facturación.
- Integraciones HL7/FHIR, obras sociales o sistemas gubernamentales.
- Notificaciones push, correo o mensajería.
- Administración de centros externos desde la aplicación.
- Funcionamiento offline con escritura y resolución de conflictos.
- Entrega oficial para Android, iOS o escritorio Tauri.
- Analítica avanzada, reportes regulatorios y exportaciones masivas.

Android/Capacitor y Tauri pueden conservarse como pruebas técnicas, pero no son criterio de aceptación ni reciben garantía de publicación en el MVP.

## 3. Actores y roles

### Persona no autenticada

Solo puede registrarse, iniciar sesión y consultar el estado público de la API.

### Usuario (`user`)

Representa al profesional u operador de la institución. Puede consultar pacientes activos y administrar sus propias derivaciones dentro de las transiciones permitidas.

### Administrador (`admin`)

Administra pacientes, usuarios y todas las derivaciones. También puede consultar la auditoría. La asignación del rol se realiza en un entorno administrativo confiable; nunca desde el cliente.

### Matriz de permisos

| Recurso o acción | No autenticado | `user` | `admin` |
| --- | :---: | :---: | :---: |
| Ver y editar perfil propio | No | Sí | Sí |
| Listar usuarios o cambiar roles | No | No | Sí |
| Consultar pacientes | No | Sí | Sí |
| Crear, editar o desactivar pacientes | No | No | Sí |
| Crear una derivación | No | Sí | Sí |
| Ver derivaciones | No | Solo propias | Todas |
| Editar o eliminar borrador | No | Solo propio | Cualquiera |
| Enviar o cancelar derivación | No | Solo propia | Cualquiera |
| Aceptar, rechazar o completar derivación | No | No | Sí |
| Consultar centros externos | No | Sí | Sí |
| Consultar auditoría | No | No | Sí |
| Escribir o eliminar auditoría directamente | No | No | No |

El backend valida el ID token y el custom claim `role` en cada solicitud protegida. La interfaz puede ocultar acciones, pero nunca sustituye la autorización del servidor.

## 4. Modelo de datos Firestore

### Convenciones generales

- Los nombres de colecciones y campos se escriben en inglés y en `camelCase`.
- El ID de cada documento lo genera Firestore, salvo `users/{uid}`, que usa el UID de Firebase Authentication.
- `createdAt` y `updatedAt` son `Timestamp` generados por el servidor, nunca fechas provistas por el cliente.
- `createdBy` y `updatedBy` contienen un UID válido de Firebase Authentication.
- La API representa los `Timestamp` como cadenas ISO 8601 en UTC.
- Las referencias se almacenan como IDs para mantener contratos simples. El backend valida que existan.
- Los pacientes se desactivan con `active: false`; no se eliminan si tienen derivaciones.

### `users/{uid}`

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | :---: | --- |
| `email` | string | Sí | Correo normalizado de Firebase Authentication |
| `displayName` | string | Sí | Nombre visible |
| `photoUrl` | string o null | Sí | Foto opcional |
| `role` | `user` \| `admin` | Sí | Copia consultable del custom claim |
| `active` | boolean | Sí | Habilitación dentro del sistema |
| `createdAt` | Timestamp | Sí | Fecha de alta |
| `createdBy` | string | Sí | UID creador; puede ser el propio UID en registro |
| `updatedAt` | Timestamp | Sí | Última modificación |
| `updatedBy` | string | Sí | UID de última modificación |

El custom claim es la fuente de autorización. El campo `role` del documento facilita consultas y debe actualizarse en la misma operación administrativa.

### `patients/{patientId}`

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | :---: | --- |
| `fullName` | string | Sí | Nombre |
| `lastName` | string | Sí | Apellido |
| `documentNumber` | string | Sí | Documento (7–11 dígitos, único) |
| `birthDate` | string | Sí | Fecha de nacimiento (`DD-MM-YYYY`) |
| `email` | string | Sí | Correo de contacto |
| `phone` | string | No | Teléfono (vacío permitido) |
| `contactPreference` | string | No | `call`, `whatsapp`, `email` o vacío |
| `contactHours` | string | No | Horario de contacto preferido |
| `city` | string | Sí | Ciudad |
| `country` | string | Sí | País |
| `privateCare` | boolean | Sí | Atención privada sin obra social |
| `insuranceName` | string | Condicional | Obra social o prepaga si `privateCare` es false |
| `affiliateNumber` | string | Condicional | Número de afiliado si `privateCare` es false |
| `plan` | string | No | Plan de cobertura |
| `picture` | string | Sí | URL de imagen o avatar (vacío permitido) |
| `active` | boolean | Sí | Estado lógico del paciente |
| `createdAt` | Timestamp | Sí | Fecha de alta |
| `createdBy` | string | Sí | UID creador |
| `updatedAt` | Timestamp | Sí | Última modificación |
| `updatedBy` | string | Sí | UID de última modificación |

### `referrals/{referralId}`

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | :---: | --- |
| `patientId` | string | Sí | ID de `patients/{patientId}` |
| `destination` | map | Sí | Snapshot con `healthsiteId`, `name` y `address` |
| `reason` | string | Sí | Motivo de la derivación |
| `notes` | string o null | Sí | Observaciones opcionales |
| `status` | string | Sí | Estado de la derivación |
| `rejectionReason` | string o null | Sí | Motivo obligatorio al rechazar |
| `createdAt` | Timestamp | Sí | Fecha de creación |
| `createdBy` | string | Sí | UID propietario de la derivación |
| `updatedAt` | Timestamp | Sí | Última modificación |
| `updatedBy` | string | Sí | UID de última modificación |

El destino se guarda como snapshot para conservar el nombre y la dirección utilizados al derivar aunque la fuente externa cambie.

#### Estados y transiciones

| Estado | Significado | Transiciones permitidas |
| --- | --- | --- |
| `draft` | Borrador editable | `submitted`, `cancelled` |
| `submitted` | Enviada para evaluación | `accepted`, `rejected`, `cancelled` |
| `accepted` | Aceptada por administración | `completed`, `cancelled` |
| `rejected` | Rechazada con motivo | Estado final |
| `completed` | Atención o proceso finalizado | Estado final |
| `cancelled` | Cancelada | Estado final |

Solo `admin` puede pasar una derivación a `accepted`, `rejected` o `completed`. El creador puede enviar o cancelar su propia derivación según la tabla.

### `auditLogs/{auditLogId}`

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | :---: | --- |
| `actorId` | string | Sí | UID que realizó la acción |
| `action` | string | Sí | Por ejemplo `patient.created` o `referral.submitted` |
| `resourceType` | `user` \| `patient` \| `referral` | Sí | Tipo afectado |
| `resourceId` | string | Sí | ID afectado |
| `timestamp` | Timestamp | Sí | Fecha del servidor |
| `changes` | map o null | Sí | Campos modificados, sin secretos ni tokens |
| `requestId` | string | Sí | Correlación con la solicitud API |

Los registros de auditoría son inmutables. Solo el backend puede crearlos y ningún endpoint permite modificarlos o eliminarlos.

### Relaciones e índices

```text
users/{uid} 1 --- N referrals/{referralId} mediante createdBy
patients/{patientId} 1 --- N referrals/{referralId} mediante patientId
users/{uid} 1 --- N auditLogs/{auditLogId} mediante actorId
```

Índices compuestos previstos:

- `referrals`: `createdBy ASC, createdAt DESC`.
- `referrals`: `status ASC, updatedAt DESC`.
- `auditLogs`: `resourceType ASC, resourceId ASC, timestamp DESC`.

## 5. Contrato API v1

### Reglas comunes

- URL base local: `http://localhost:3000/api/v1`.
- Toda ruta bajo `/api/v1` requiere `Authorization: Bearer <firebase-id-token>`.
- `GET /health` es público y no se versiona porque verifica infraestructura.
- Los cuerpos usan `Content-Type: application/json`.
- Un error devuelve `{ "message": "Descripción legible" }`.
- Códigos generales: `400` datos inválidos, `401` sin autenticación, `403` sin permiso, `404` inexistente, `409` transición o estado incompatible y `500` error interno.

### Endpoints

| Método | Ruta | Permiso | Resultado |
| --- | --- | --- | --- |
| GET | `/health` | Público | Estado del servicio |
| GET | `/api/v1/users/me` | Autenticado | Perfil propio |
| PATCH | `/api/v1/users/me` | Autenticado | Actualizar nombre o foto propios |
| GET | `/api/v1/users` | `admin` | Listar usuarios |
| PATCH | `/api/v1/users/:uid/role` | `admin` | Cambiar rol |
| GET | `/api/v1/patients` | `user`, `admin` | Listar pacientes visibles |
| GET | `/api/v1/patients/:id` | `user`, `admin` | Obtener paciente |
| POST | `/api/v1/patients` | `admin` | Crear paciente |
| PUT | `/api/v1/patients/:id` | `admin` | Reemplazar paciente |
| PATCH | `/api/v1/patients/:id` | `admin` | Modificar paciente |
| DELETE | `/api/v1/patients/:id` | `admin` | Desactivar paciente |
| GET | `/api/v1/referrals` | `user`, `admin` | Listar propias o todas según rol |
| GET | `/api/v1/referrals/:id` | Propietario, `admin` | Obtener derivación |
| POST | `/api/v1/referrals` | `user`, `admin` | Crear borrador |
| PATCH | `/api/v1/referrals/:id` | Propietario, `admin` | Editar borrador |
| DELETE | `/api/v1/referrals/:id` | Propietario, `admin` | Eliminar borrador |
| POST | `/api/v1/referrals/:id/transitions` | Según transición | Cambiar estado |
| GET | `/api/v1/healthsites` | `user`, `admin` | Consultar destinos externos |
| GET | `/api/v1/audit-logs` | `admin` | Consultar auditoría |

Filtros admitidos en el MVP:

- `GET /patients?active=true`.
- `GET /referrals?status=submitted`.
- `GET /audit-logs?resourceType=patient&resourceId=<id>`.

### Ejemplo: crear un paciente

```http
POST /api/v1/patients HTTP/1.1
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "fullName": "Ana",
  "lastName": "Pérez",
  "documentNumber": "30123456",
  "birthDate": "15-03-1990",
  "email": "ana.perez@example.com",
  "phone": "",
  "contactPreference": "",
  "contactHours": "",
  "city": "La Plata",
  "country": "Argentina",
  "privateCare": false,
  "insuranceName": "OSDE",
  "affiliateNumber": "123456",
  "plan": "",
  "picture": "https://example.com/ana.jpg",
  "active": true
}
```

Respuesta `201 Created`:

```json
{
  "id": "patient_123",
  "fullName": "Ana",
  "lastName": "Pérez",
  "documentNumber": "30123456",
  "birthDate": "15-03-1990",
  "email": "ana.perez@example.com",
  "phone": "",
  "contactPreference": "",
  "contactHours": "",
  "city": "La Plata",
  "country": "Argentina",
  "privateCare": false,
  "insuranceName": "OSDE",
  "affiliateNumber": "123456",
  "plan": "",
  "picture": "https://example.com/ana.jpg",
  "active": true,
  "createdAt": "2026-10-16T15:30:00.000Z",
  "createdBy": "firebase_uid",
  "updatedAt": "2026-10-16T15:30:00.000Z",
  "updatedBy": "firebase_uid"
}
```

### Ejemplo: crear y enviar una derivación

```http
POST /api/v1/referrals HTTP/1.1
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "patientId": "patient_123",
  "destination": {
    "healthsiteId": "healthsite_456",
    "name": "Hospital Interzonal General de Agudos",
    "address": "Avenida 1 123, La Plata"
  },
  "reason": "Evaluación cardiológica",
  "notes": null
}
```

La API crea la derivación con `status: "draft"`. Para enviarla:

```http
POST /api/v1/referrals/referral_789/transitions HTTP/1.1
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "to": "submitted"
}
```

Respuesta `200 OK`:

```json
{
  "id": "referral_789",
  "patientId": "patient_123",
  "destination": {
    "healthsiteId": "healthsite_456",
    "name": "Hospital Interzonal General de Agudos",
    "address": "Avenida 1 123, La Plata"
  },
  "reason": "Evaluación cardiológica",
  "notes": null,
  "status": "submitted",
  "rejectionReason": null,
  "createdAt": "2026-10-16T15:35:00.000Z",
  "createdBy": "firebase_uid",
  "updatedAt": "2026-10-16T15:40:00.000Z",
  "updatedBy": "firebase_uid"
}
```

### Ejemplo de error

```json
{
  "message": "La transición de submitted a completed no está permitida."
}
```

## 6. Diferencia entre contrato e implementación actual

Este documento cierra el contrato objetivo de GI-01; no afirma que cada recurso ya esté implementado.

| Componente | Estado al 2026-10-16 |
| --- | --- |
| Firebase Authentication y validación del ID token | Implementado |
| Persistencia de pacientes en Firestore | Implementado |
| Roles `user` y `admin` | Implementado |
| Rutas de pacientes bajo `/api` | Implementadas; deben migrarse a `/api/v1` |
| Catálogo externo de centros | Implementado bajo `/api/healthsites`; debe migrarse a `/api/v1` |
| Metadatos de autoría y timestamps | Pendiente |
| `users`, `referrals` y `auditLogs` | Pendiente |
| Reglas de transición de derivaciones | Pendiente |
| Corrección tecnológica del README raíz | Completada: `main`, Firebase Authentication y Firestore |

Los cambios incompatibles posteriores requieren una nueva versión de API o una decisión documentada y aprobada.

## 7. Trazabilidad de la tarjeta

| Criterio | Resultado |
| --- | --- |
| MVP limitado a pacientes y derivaciones | Definido en §2 |
| Una o varias instituciones | Una institución y una sede, §1 |
| Actores, roles y permisos | Definidos en §3 |
| Colecciones requeridas | Definidas en §4 |
| Campos, estados, relaciones, timestamps y autores | Definidos en §4 |
| Endpoints `/api/v1` | Definidos en §5 |
| Fuera del MVP | Definido en §2 |
| Firebase Authentication y Firestore oficiales | Confirmado en §1 y README |
| Plataformas de entrega | Web y PWA, §1, §2 y README |

## 8. Aprobación

La tarjeta se considera aprobada únicamente cuando las tres personas registren su conformidad. No se deben completar firmas en nombre de otra persona.

| Persona | Rol en GI-01 | Estado | Fecha |
| --- | --- | --- | --- |
| Lucas Lautaro Luciano | Responsable | Pendiente | — |
| Julian Tesoreiro | Revisor | Pendiente | — |
| Lautaro Esposito | Revisor | Pendiente | — |

Una aprobación puede registrarse cambiando el estado a `Aprobado` y agregando la fecha en un pull request revisado o mediante un comentario inequívoco en la tarjeta de Trello enlazado desde el pull request.
