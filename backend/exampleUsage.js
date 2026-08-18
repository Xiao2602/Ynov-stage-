import { loginUser, resetPassword, logoutUser } from "./firebaseConfig.js";
import { createUserByAdmin } from "./firebaseAdmin.js";

async function runDemo() {
  console.log("=== Début de la Démonstration du Backend (Login / User Creation Admin / Reset Password) ===");

  // 1. Création d'un utilisateur par un Admin / RH (Pas d'auto-inscription / registration publique)
  const newUserEmail = "etudiant.ynov@example.com";
  const newUserPassword = "Password123!";

  console.log(`\n1. Création du compte par l'administrateur pour: ${newUserEmail}...`);
  const createResult = await createUserByAdmin({
    email: newUserEmail,
    password: newUserPassword,
    displayName: "Amine Ynov",
    role: "student",
    department: "Informatique"
  });

  if (createResult.success) {
    console.log("✅ Compte créé avec succès :", createResult.user);
  } else {
    console.log("⚠️ Résultat de la création (Note: s'il existe déjà, cela affichera l'erreur) :", createResult.error);
  }

  // 2. Connexion (Login)
  console.log(`\n2. Tentative de connexion pour ${newUserEmail}...`);
  const loginResult = await loginUser(newUserEmail, newUserPassword);
  if (loginResult.success) {
    console.log("✅ Connexion réussie pour l'utilisateur UID :", loginResult.user.uid);
  } else {
    console.log("❌ Échec de connexion :", loginResult.error);
  }

  // 3. Réinitialisation du mot de passe (Reset Password)
  console.log(`\n3. Demande de réinitialisation du mot de passe pour ${newUserEmail}...`);
  const resetResult = await resetPassword(newUserEmail);
  if (resetResult.success) {
    console.log("✅ Mail de réinitialisation :", resetResult.message);
  } else {
    console.log("❌ Échec de la réinitialisation :", resetResult.error);
  }

  // 4. Déconnexion
  await logoutUser();
  console.log("\n✅ Déconnexion effectuée.");
}

// Remarque: L'exécution nécessite la configuration réseau et l'activation Firebase Authentication dans la console Firebase.
console.log("Module prêt. Importez les fonctions `loginUser`, `resetPassword`, et `createUserByAdmin` dans votre application.");
