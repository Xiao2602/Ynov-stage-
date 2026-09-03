import { createUserService, linkParentToStudentService } from "./Auth/Users/userService.js";
import { ROLES } from "./Shared/Roles/roles.js";

/**
 * Script de Seed complet pour tous les rôles du système
 */
async function seedInitialAccounts() {
  console.log("==================================================");
  console.log("  CREATION DES COMPTES PAR DEFAUT POUR TOUS LES ROLES");
  console.log("==================================================\n");

  const defaultUsers = [
    {
      email: "amine.fatih@ynov.com",
      password: "AdminPassword123!",
      displayName: "Amine Fatih (Admin)",
      role: ROLES.ADMIN,
      department: "Direction"
    },
    {
      email: "rh@ynov.com",
      password: "RhPassword123!",
      displayName: "Responsable RH YNOV",
      role: ROLES.RH,
      department: "Ressources Humaines"
    },
    {
      email: "enseignant@ynov.com",
      password: "TeacherPassword123!",
      displayName: "Prof. Youssef Enseignant",
      role: ROLES.TEACHER,
      department: "Informatique"
    },
    {
      email: "employe@ynov.com",
      password: "EmployeePassword123!",
      displayName: "Sara Employée",
      role: ROLES.EMPLOYEE,
      department: "Administration"
    },
    {
      email: "etudiant@ynov.com",
      password: "StudentPassword123!",
      displayName: "Yassine Alami (Étudiant)",
      role: ROLES.STUDENT,
      department: "Informatique"
    },
    {
      email: "parent@ynov.com",
      password: "ParentPassword123!",
      displayName: "Mohammed Alami (Parent)",
      role: ROLES.PARENT,
      department: "Famille"
    }
  ];

  const createdAccounts = {};

  for (const user of defaultUsers) {
    console.log(`[SEED] Création du compte ${user.role.toUpperCase()} (${user.email})...`);
    const result = await createUserService(user);
    if (result.success) {
      console.log(`       -> Créé avec succès (UID: ${result.data.uid})`);
      createdAccounts[user.role] = result.data.uid;
    } else {
      console.log(`       -> Info/Existant : ${result.error}`);
    }
  }

  // Liaison automatique du compte Parent à l'Étudiant s'ils existent
  if (createdAccounts[ROLES.PARENT] && createdAccounts[ROLES.STUDENT]) {
    console.log("\n[SEED] Liaison du compte Parent à l'Étudiant...");
    const linkRes = await linkParentToStudentService(createdAccounts[ROLES.PARENT], createdAccounts[ROLES.STUDENT]);
    console.log("       ->", linkRes.message);
  }

  console.log("\n==================================================");
  console.log("     RECAPITULATIF DES COMPTES SEED CRÉÉS         ");
  console.log("==================================================");
  console.log("1. ADMIN    : amine.fatih@ynov.com   | AdminPassword123!");
  console.log("2. RH       : rh@ynov.com            | RhPassword123!");
  console.log("3. TEACHER  : enseignant@ynov.com    | TeacherPassword123!");
  console.log("4. EMPLOYEE : employe@ynov.com       | EmployeePassword123!");
  console.log("5. STUDENT  : etudiant@ynov.com      | StudentPassword123!");
  console.log("6. PARENT   : parent@ynov.com        | ParentPassword123!");
  console.log("==================================================\n");

  process.exit(0);
}

seedInitialAccounts();
