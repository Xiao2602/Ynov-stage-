import { createUserService } from "./Auth/Users/userService.js";
import { ROLES } from "./Shared/Roles/roles.js";

/**
 * Script de Seed initial (Initial Super-Admin / HR Setup)
 */
async function seedInitialAccounts() {
  console.log("=== Initialisation des comptes Administrateur et RH par défaut ===");

  // 1. Compte Admin
  const adminData = {
    email: "amine.fatih@ynov.com",
    password: "AdminPassword123!",
    displayName: "Amine Fatih",
    role: ROLES.ADMIN,
    department: "Direction"
  };

  // 2. Compte RH
  const rhData = {
    email: "rh@ynov.com",
    password: "RhPassword123!",
    displayName: "Responsable RH YNOV",
    role: ROLES.RH,
    department: "Ressources Humaines"
  };

  console.log(`\nCréation du compte Administrateur (${adminData.email})...`);
  const adminResult = await createUserService(adminData);
  if (adminResult.success) {
    console.log("✅ Compte Admin créé avec succès :", adminResult.data);
  } else {
    console.log("ℹ️ Info Compte Admin :", adminResult.error);
  }

  console.log(`\nCréation du compte RH (${rhData.email})...`);
  const rhResult = await createUserService(rhData);
  if (rhResult.success) {
    console.log("✅ Compte RH créé avec succès :", rhResult.data);
  } else {
    console.log("ℹ️ Info Compte RH :", rhResult.error);
  }

  console.log("\n=== Terminé. Vous pouvez maintenant vous connecter avec ces comptes sur Postman ! ===");
  process.exit(0);
}

seedInitialAccounts();
