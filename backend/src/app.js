import express from 'express';

import { PatientStore, validatePatient } from './patient-store.js';
import { UserStore, validateUserStatusUpdate } from './user-store.js';
import { authenticate } from './middleware/authenticate.js';
import { authorizeUser } from './middleware/authorize-user.js';
import { getHealthsitesCache } from './seed-healthsites.js';

export function createApp(store = new PatientStore(), options = {}) {
  const app = express();
  const userStore = options.userStore ?? new UserStore();
  const setCustomUserClaims =
    options.setCustomUserClaims ??
    (async () => {});
  const revokeRefreshTokens =
    options.revokeRefreshTokens ??
    (async () => {});

  const verifyIdToken =
    options.verifyIdToken ??
    (async () => {
      throw new Error('El verificador de tokens no está configurado.');
    });

  const authenticateRequest = authenticate(verifyIdToken);

  // Carga o crea automáticamente el perfil en userStore al autenticar
  const attachUserProfile = async (request, _response, next) => {
    try {
      const { uid, email, name, picture, role } = request.user;
      let profile = await userStore.findById(uid);

      if (!profile) {
        // En registros nuevos, la cuenta queda con status: 'pending' y active: false
        // Si el token ya contenía un rol previo (ej. inicialización de admin), se respeta
        const isPreApproved = role === 'admin' || role === 'user';
        profile = await userStore.create(uid, {
          email: email || '',
          displayName: name || '',
          photoUrl: picture || null,
          role: role || null,
          status: isPreApproved ? 'approved' : 'pending',
          active: isPreApproved
        });
      }

      request.user = {
        ...request.user,
        status: profile.status,
        active: profile.active,
        role: profile.role ?? null
      };
      request.userProfile = profile;
      next();
    } catch (error) {
      next(error);
    }
  };

  const authenticatedChain = [authenticateRequest, attachUserProfile];
  const allowAuthenticatedUsers = [
    ...authenticatedChain,
    authorizeUser({ allowedRoles: ['user', 'admin'], requireApproved: true })
  ];
  const allowAdmins = [
    ...authenticatedChain,
    authorizeUser({ allowedRoles: ['admin'], requireApproved: true })
  ];

  app.use(express.json());
  app.use((request, response, next) => {
    response.setHeader(
      'Access-Control-Allow-Origin',
      process.env.CORS_ORIGIN ?? '*'
    );
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    response.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );

    if (request.method === 'OPTIONS') {
      return response.sendStatus(204);
    }

    next();
  });

  // Health check público
  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  // Rutas de Usuario (GI-04 / Contrato v1)
  // Perfil propio (accesible incluso si está pending para ver el estado de su cuenta)
  const getMeHandler = (request, response) => {
    response.json(request.userProfile);
  };
  app.get('/api/v1/users/me', authenticatedChain, getMeHandler);
  app.get('/api/users/me', authenticatedChain, getMeHandler);

  // Modificar perfil propio (nombre o foto)
  const patchMeHandler = async (request, response) => {
    const { displayName, photoUrl } = request.body || {};
    const changes = {};
    if (displayName !== undefined) changes.displayName = String(displayName).trim();
    if (photoUrl !== undefined) changes.photoUrl = photoUrl;

    const updated = await userStore.update(request.user.uid, changes, request.user.uid);
    response.json(updated);
  };
  app.patch('/api/v1/users/me', authenticatedChain, patchMeHandler);
  app.patch('/api/users/me', authenticatedChain, patchMeHandler);

  // Listar usuarios (solo administradores)
  const listUsersHandler = async (_request, response) => {
    const users = await userStore.findAll();
    response.json(users);
  };
  app.get('/api/v1/users', allowAdmins, listUsersHandler);
  app.get('/api/users', allowAdmins, listUsersHandler);

  // Obtener un usuario por UID (solo administradores)
  const getUserByIdHandler = async (request, response) => {
    const user = await userStore.findById(request.params.uid);
    if (!user) {
      return response.status(404).json({ message: 'Usuario no encontrado.' });
    }
    response.json(user);
  };
  app.get('/api/v1/users/:uid', allowAdmins, getUserByIdHandler);
  app.get('/api/users/:uid', allowAdmins, getUserByIdHandler);

  // Modificar estado y/o rol de un usuario (aprobar, rechazar, deshabilitar, rol)
  const updateUserStatusHandler = async (request, response) => {
    const validationError = validateUserStatusUpdate(request.body);
    if (validationError) {
      return response.status(400).json({ message: validationError });
    }

    const { status, role } = request.body;
    const targetUid = request.params.uid;

    const targetUser = await userStore.findById(targetUid);
    if (!targetUser) {
      return response.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const changes = {};
    if (status !== undefined) changes.status = status;
    if (role !== undefined) changes.role = role;

    // Si se asigna un rol en Firebase Auth
    if (role !== undefined) {
      await setCustomUserClaims(targetUid, { role });
    }

    // Si se deshabilita, se rechaza o cambia el rol, revocar tokens
    if (status === 'disabled' || status === 'rejected' || role !== undefined) {
      await revokeRefreshTokens(targetUid);
    }

    const updated = await userStore.update(targetUid, changes, request.user.uid);
    response.json(updated);
  };

  app.patch('/api/v1/users/:uid/status', allowAdmins, updateUserStatusHandler);
  app.patch('/api/users/:uid/status', allowAdmins, updateUserStatusHandler);
  app.patch('/api/v1/users/:uid/role', allowAdmins, updateUserStatusHandler);
  app.patch('/api/users/:uid/role', allowAdmins, updateUserStatusHandler);

  // Rutas de Pacientes
  const getPatientsHandler = async (_request, response) => {
    response.json(await store.findAll());
  };
  app.get('/api/patients', allowAuthenticatedUsers, getPatientsHandler);
  app.get('/api/v1/patients', allowAuthenticatedUsers, getPatientsHandler);

  const getHealthsitesHandler = async (_request, response) => {
    const healthsites = await getHealthsitesCache();
    response.json(healthsites);
  };
  app.get('/api/healthsites', allowAuthenticatedUsers, getHealthsitesHandler);
  app.get('/api/v1/healthsites', allowAuthenticatedUsers, getHealthsitesHandler);

  const getPatientByIdHandler = async (request, response) => {
    const patient = await store.findById(request.params.id);
    if (!patient) {
      return response.status(404).json({ message: 'Paciente no encontrado.' });
    }
    response.json(patient);
  };
  app.get('/api/patients/:id', allowAuthenticatedUsers, getPatientByIdHandler);
  app.get('/api/v1/patients/:id', allowAuthenticatedUsers, getPatientByIdHandler);

  const createPatientHandler = async (request, response) => {
    const validationError = validatePatient(request.body);
    if (validationError) {
      return response.status(400).json({ message: validationError });
    }
    response.status(201).json(await store.create(request.body));
  };
  app.post('/api/patients', allowAdmins, createPatientHandler);
  app.post('/api/v1/patients', allowAdmins, createPatientHandler);

  const replacePatientHandler = async (request, response) => {
    const validationError = validatePatient(request.body);
    if (validationError) {
      return response.status(400).json({ message: validationError });
    }

    const patient = await store.replace(request.params.id, request.body);
    if (!patient) {
      return response.status(404).json({ message: 'Paciente no encontrado.' });
    }
    response.json(patient);
  };
  app.put('/api/patients/:id', allowAdmins, replacePatientHandler);
  app.put('/api/v1/patients/:id', allowAdmins, replacePatientHandler);

  const patchPatientHandler = async (request, response) => {
    const validationError = validatePatient(request.body, false);
    if (validationError) {
      return response.status(400).json({ message: validationError });
    }

    const patient = await store.update(request.params.id, request.body);
    if (!patient) {
      return response.status(404).json({ message: 'Paciente no encontrado.' });
    }
    response.json(patient);
  };
  app.patch('/api/patients/:id', allowAdmins, patchPatientHandler);
  app.patch('/api/v1/patients/:id', allowAdmins, patchPatientHandler);

  const deletePatientHandler = async (request, response) => {
    if (!(await store.delete(request.params.id))) {
      return response.status(404).json({ message: 'Paciente no encontrado.' });
    }
    response.sendStatus(204);
  };
  app.delete('/api/patients/:id', allowAdmins, deletePatientHandler);
  app.delete('/api/v1/patients/:id', allowAdmins, deletePatientHandler);

  app.use((_request, response) => {
    response.status(404).json({ message: 'Ruta no encontrada.' });
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ message: 'Error interno del servidor.' });
  });

  return app;
}
