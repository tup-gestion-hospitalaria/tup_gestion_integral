import { auth } from "../src/firebase.js";

const [, , email, role] = process.argv;
const allowedRoles = ["user", "admin"];

if (!email || !allowedRoles.includes(role)) {
  console.error("Uso: npm run role:set -- usuario@example.com user|admin");
  process.exitCode = 1;
} else {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { role });
    console.log(`Rol ${role} asignado correctamente a ${email}.`);
  } catch (error) {
    console.error("No se pudo asignar el rol:", error.message);
    process.exitCode = 1;
  }
}
