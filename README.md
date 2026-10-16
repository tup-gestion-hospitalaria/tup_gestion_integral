# Gestión Integral Hospitalaria

Sistema para centralizar la gestión de pacientes y derivaciones de una institución de salud.

## Estado y alcance

El proyecto se encuentra en desarrollo como trabajo práctico de Programación. El MVP incluye autenticación, gestión de pacientes y el circuito básico de derivaciones para una única institución y sede.

La definición funcional y técnica se encuentra en [GI-01 — Alcance, roles y modelo Firestore](docs/GI-01-alcance-roles-firestore-api.md).

## Plataformas de entrega

- Web responsive.
- PWA instalable.

Android mediante Capacitor y escritorio mediante Tauri se mantienen como prototipos técnicos y no forman parte de la entrega comprometida del MVP.

## Miembros del proyecto

- Lucas Lautaro Luciano
- Julian Tesoreiro
- Lautaro Esposito

## Tecnologías oficiales

- Frontend: Angular y TypeScript.
- Backend: Node.js y Express.
- Autenticación: Firebase Authentication.
- Base de datos: Cloud Firestore.
- Hosting web: Firebase Hosting.
- Hosting de API: Render.
- Control de versiones: Git y GitHub.

## Ramas

- `main`: rama estable y de entrega.
- `develop`: rama de integración previa a `main`.

Las ramas de funcionalidad parten de `develop` y vuelven mediante un pull request revisado. La versión entregable debe quedar integrada en `main`.

## Estructura del repositorio

- `frontend/`: aplicación Angular, PWA y prototipos de empaquetado.
- `backend/`: API REST y acceso administrativo a Firebase.
- `docs/`: alcance, arquitectura y contratos.

## Ejecución local

Frontend:

```bash
cd frontend
npm install
npm start
```

Backend:

```bash
cd backend
npm install
npm run dev
```

La configuración y los endpoints implementados actualmente se detallan en [backend/README.md](backend/README.md).

## Gestión del proyecto

Se utiliza [Trello](https://trello.com/b/YHN2p26F/) con metodología Kanban.
