import { createApp } from "./app.js";
import { auth, db } from "./firebase.js";
import { FirestorePatientStore } from "./firestore-patient-store.js";
import { seedPatientsIfEmpty } from "./seed-patients.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  const seedResult = await seedPatientsIfEmpty(db);
  const app = createApp(new FirestorePatientStore(db), {
    verifyIdToken: (token) => auth.verifyIdToken(token),
  });

  app.listen(port, host, () => {
    console.log(
      `API iniciada en http://${host}:${port} con ${seedResult.total} pacientes.`,
    );
    if (seedResult.inserted > 0) {
      console.log(`Se cargaron ${seedResult.inserted} pacientes en Firestore.`);
    }
  });
} catch (error) {
  console.error("No se pudo inicializar Firestore:", error);
  process.exitCode = 1;
}
