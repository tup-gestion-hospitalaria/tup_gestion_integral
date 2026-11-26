# GI-12 — Matriz de resultados esperados

Las pruebas de integración se ejecutan contra Firebase Authentication y
Firestore Emulator con el proyecto local `demo-tup-gestion-integral`. Las
cuentas y los documentos son fixtures descartables; no se usan credenciales ni
datos de producción.

| Escenario | Resultado esperado |
| --- | --- |
| Cuenta pendiente consulta su perfil | `200`; `status: pending`, `active: false`, sin rol |
| Cuenta pendiente consulta pacientes o derivaciones | `403 ACCOUNT_PENDING` |
| Administrador aprueba cuenta pendiente y asigna `user` | `200`; queda aprobada y activa |
| Usuario aprobado consulta pacientes | `200` |
| Usuario lista o consulta usuarios, asigna roles o modifica pacientes | `403` |
| Usuario consulta lista de derivaciones | Solo incluye derivaciones propias o asignadas |
| Usuario accede por ID a derivación de otro usuario | Lectura, edición, transición y borrado: `403` |
| Usuario intenta una transición reservada al administrador | `403`; el administrador sí puede realizarla |
| Cuenta deshabilitada usa un token anterior | `401` por revocación |
| Cuenta deshabilitada renueva el token e intenta acceder a recursos protegidos | `403 ACCOUNT_DISABLED` |
| Cliente no autenticado, `user` o `admin` accede directamente a Firestore | Lecturas y escrituras denegadas por las reglas |

## Pipeline

`npm run test:emulators` incluye esta suite mediante `test:integration`. El job
de integración de `.github/workflows/ci.yml` ya detecta y ejecuta ese comando
para backend, por lo que estos casos se incorporan al pipeline sin un job
paralelo ni una segunda configuración de emuladores.
