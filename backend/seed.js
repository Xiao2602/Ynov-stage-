import { createUserService, linkParentToStudentService } from "./Auth/Users/userService.js";
import { ROLES } from "./Shared/Roles/roles.js";
import { adminAuth, adminDb } from "./Shared/Firebase config/firebase.js";

/**
 * Script de Seed complet pour tous les rôles du système
 */
async function seedInitialAccounts() {
  console.log("==================================================");
  console.log("  CREATION ET SYNCHRONISATION DES COMPTES SEED   ");
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
      email: "manager@ynov.com",
      password: "ManagerPassword123!",
      displayName: "Karim Manager",
      role: ROLES.MANAGER,
      department: "Informatique"
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
      department: "Informatique",
      className: "B3 Informatique"
    },
    {
      email: "sarah.alami@ynov.com",
      password: "StudentPassword123!",
      displayName: "Sarah Alami (Étudiante)",
      role: ROLES.STUDENT,
      department: "Création & Design",
      className: "M1 Design Digital"
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
    console.log(`[SEED] Traitement du compte ${user.role.toUpperCase()} (${user.email})...`);
    let uid = null;

    try {
      const existingUser = await adminAuth.getUserByEmail(user.email);
      uid = existingUser.uid;
      // Mise à jour mot de passe et displayName si existant
      await adminAuth.updateUser(uid, {
        password: user.password,
        displayName: user.displayName
      });
      console.log(`       -> Compte Auth existant synchronisé (UID: ${uid})`);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        const createRes = await createUserService(user);
        if (createRes.success) {
          uid = createRes.data.uid;
          console.log(`       -> Créé avec succès (UID: ${uid})`);
        } else {
          console.error(`       -> Erreur création : ${createRes.error}`);
        }
      } else {
        console.error(`       -> Erreur Auth : ${e.message}`);
      }
    }

    if (uid) {
      createdAccounts[user.email] = uid;
      createdAccounts[user.role] = uid;

      // Définition des Custom Claims
      await adminAuth.setCustomUserClaims(uid, {
        role: user.role,
        department: user.department || ""
      });

      // Synchronisation Firestore
      if (adminDb) {
        await adminDb.collection("users").doc(uid).set({
          uid,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          department: user.department || "",
          className: user.className || "",
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    }
  }

  // Liaison automatique du compte Parent aux 2 Étudiants
  const parentUid = createdAccounts["parent@ynov.com"];
  const student1Uid = createdAccounts["etudiant@ynov.com"];
  const student2Uid = createdAccounts["sarah.alami@ynov.com"];

  if (parentUid) {
    const childrenUids = [student1Uid, student2Uid].filter(Boolean);
    console.log(`\n[SEED] Liaison du compte Parent (${parentUid}) aux enfants :`, childrenUids);

    if (adminDb) {
      await adminDb.collection("users").doc(parentUid).set({
        childrenUids
      }, { merge: true });

      for (const sUid of childrenUids) {
        await adminDb.collection("users").doc(sUid).set({
          parentUids: [parentUid]
        }, { merge: true });
      }
    }

    await adminAuth.setCustomUserClaims(parentUid, {
      role: ROLES.PARENT,
      childrenUids
    });

    console.log("       -> Parent lié avec succès à ses enfants.");
  }

  console.log("\n==================================================");
  console.log("     RECAPITULATIF DES COMPTES SEED SYNCHRONISÉS   ");
  console.log("==================================================");
  console.log("1. ADMIN    : amine.fatih@ynov.com   | AdminPassword123!");
  console.log("2. RH       : rh@ynov.com            | RhPassword123!");
  console.log("3. MANAGER  : manager@ynov.com       | ManagerPassword123!");
  console.log("4. TEACHER  : enseignant@ynov.com    | TeacherPassword123!");
  console.log("5. EMPLOYEE : employe@ynov.com       | EmployeePassword123!");
  console.log("6. STUDENT 1: etudiant@ynov.com      | StudentPassword123! (B3 Informatique)");
  console.log("7. STUDENT 2: sarah.alami@ynov.com   | StudentPassword123! (M1 Design)");
  console.log("8. PARENT   : parent@ynov.com        | ParentPassword123! (Enfants: Yassine & Sarah)");
  console.log("==================================================\n");

  process.exit(0);
}

seedInitialAccounts();
