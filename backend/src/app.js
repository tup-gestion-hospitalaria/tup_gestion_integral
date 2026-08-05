import express from "express";

import { PatientStore, validatePatient } from "./patient-store.js";
import { authenticate } from "./middleware/authenticate.js";
import { authorizeRoles } from "./middleware/authorize-roles.js";

export function createApp(store = new PatientStore(), options = {}) {
  const app = express();
  const verifyIdToken =
    options.verifyIdToken ??
    (async () => {
      throw new Error("El verificador de tokens no está configurado.");
    });
  const authenticateRequest = authenticate(verifyIdToken);
  const allowAuthenticatedUsers = authorizeRoles("user", "admin");
  const allowAdmins = authorizeRoles("admin");

  app.use(express.json());
  app.use((request, response, next) => {
    response.setHeader(
      "Access-Control-Allow-Origin",
      process.env.CORS_ORIGIN ?? "*",
    );
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    response.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );

    if (request.method === "OPTIONS") {
      return response.sendStatus(204);
    }

    next();
  });

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get(
    "/api/patients",
    authenticateRequest,
    allowAuthenticatedUsers,
    async (_request, response) => {
      response.json(await store.findAll());
    },
  );

  app.get(
    "/api/patients/:id",
    authenticateRequest,
    allowAuthenticatedUsers,
    async (request, response) => {
      const patient = await store.findById(request.params.id);

      if (!patient) {
        return response
          .status(404)
          .json({ message: "Paciente no encontrado." });
      }

      response.json(patient);
    },
  );

  app.post(
    "/api/patients",
    authenticateRequest,
    allowAdmins,
    async (request, response) => {
      const validationError = validatePatient(request.body);

      if (validationError) {
        return response.status(400).json({ message: validationError });
      }

      response.status(201).json(await store.create(request.body));
    },
  );

  app.put(
    "/api/patients/:id",
    authenticateRequest,
    allowAdmins,
    async (request, response) => {
      const validationError = validatePatient(request.body);

      if (validationError) {
        return response.status(400).json({ message: validationError });
      }

      const patient = await store.replace(request.params.id, request.body);

      if (!patient) {
        return response
          .status(404)
          .json({ message: "Paciente no encontrado." });
      }

      response.json(patient);
    },
  );

  app.patch(
    "/api/patients/:id",
    authenticateRequest,
    allowAdmins,
    async (request, response) => {
      const validationError = validatePatient(request.body, false);

      if (validationError) {
        return response.status(400).json({ message: validationError });
      }

      const patient = await store.update(request.params.id, request.body);

      if (!patient) {
        return response
          .status(404)
          .json({ message: "Paciente no encontrado." });
      }

      response.json(patient);
    },
  );

  app.delete(
    "/api/patients/:id",
    authenticateRequest,
    allowAdmins,
    async (request, response) => {
      if (!(await store.delete(request.params.id))) {
        return response
          .status(404)
          .json({ message: "Paciente no encontrado." });
      }

      response.sendStatus(204);
    },
  );

  app.use((_request, response) => {
    response.status(404).json({ message: "Ruta no encontrada." });
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ message: "Error interno del servidor." });
  });

  return app;
}
