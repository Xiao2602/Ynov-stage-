import "dotenv/config";
import { adminAuth } from "../firebaseAdmin.js";

const ADMIN_EMAIL = "test@ynov.com";

async function createAdmin() {
  try {
    console.log("Recherche de l'utilisateur :", ADMIN_EMAIL);

    const user = await adminAuth.getUserByEmail(ADMIN_EMAIL);

    console.log("Utilisateur trouvé :", user.uid);

    await adminAuth.setCustomUserClaims(user.uid, {
      role: "admin",
    });

    console.log("");
    console.log("======================================");
    console.log("   ADMIN INITIALISÉ AVEC SUCCÈS");
    console.log("======================================");
    console.log("Email :", user.email);
    console.log("UID   :", user.uid);
    console.log("Role  : admin");
    console.log("======================================");
    console.log("");

  } catch (error) {
    console.error("");
    console.error("❌ ERREUR :", error);
    console.error("");

    process.exit(1);
  }

  process.exit(0);
}

createAdmin();