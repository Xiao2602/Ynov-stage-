import { adminAuth, adminDb } from "../../Shared/Firebase config/firebase.js";

const ALLOWED_ROLES = [
  "admin",
  "rh",
  "manager",
  "employee",
  "student",
  "teacher"
];

/**
 * Création d'un utilisateur par Admin / RH.
 *
 * Le mot de passe initial est enregistré uniquement
 * dans Firebase Authentication.
 *
 * Firestore conserve le profil utilisateur et indique
 * que l'utilisateur doit changer son mot de passe.
 */
export async function createUserService({
  email,
  password,
  displayName,
  role = "employee",
  department = ""
}) {
  try {
    // --------------------------------------------------
    // 1. Nettoyage des données
    // --------------------------------------------------

    const cleanEmail = email?.trim().toLowerCase();
    const cleanDisplayName = displayName?.trim();

    // --------------------------------------------------
    // 2. Vérification de l'email
    // --------------------------------------------------

    if (!cleanEmail) {
      return {
        success: false,
        error: "L'adresse email est obligatoire."
      };
    }

    if (!cleanEmail.endsWith("@ynov.com")) {
      return {
        success: false,
        error: "L'adresse email doit appartenir au domaine @ynov.com."
      };
    }

    // --------------------------------------------------
    // 3. Vérification du nom
    // --------------------------------------------------

    if (!cleanDisplayName) {
      return {
        success: false,
        error: "Le nom complet est obligatoire."
      };
    }

    // --------------------------------------------------
    // 4. Vérification du mot de passe initial
    // --------------------------------------------------

    if (!password) {
      return {
        success: false,
        error: "Le mot de passe initial est obligatoire."
      };
    }

    if (password.length < 8) {
      return {
        success: false,
        error: "Le mot de passe initial doit contenir au moins 8 caractères."
      };
    }

    // --------------------------------------------------
    // 5. Vérification du rôle
    // --------------------------------------------------

    if (!ALLOWED_ROLES.includes(role)) {
      return {
        success: false,
        error: `Rôle invalide : ${role}.`
      };
    }

    // --------------------------------------------------
    // 6. Création Firebase Authentication
    // --------------------------------------------------

    const userRecord = await adminAuth.createUser({
      email: cleanEmail,
      password,
      displayName: cleanDisplayName,
      disabled: false
    });

    // --------------------------------------------------
    // 7. Attribution du rôle Firebase
    // --------------------------------------------------

    await adminAuth.setCustomUserClaims(
      userRecord.uid,
      {
        role
      }
    );

    // --------------------------------------------------
    // 8. Création du profil Firestore
    // --------------------------------------------------

    const userData = {
      uid: userRecord.uid,
      email: cleanEmail,
      displayName: cleanDisplayName,
      role,
      department: department || "",

      // L'utilisateur utilise encore le mot de passe
      // initial créé par l'administrateur.
      mustChangePassword: true,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await adminDb
      .collection("users")
      .doc(userRecord.uid)
      .set(userData);

    // --------------------------------------------------
    // 9. Réponse
    // --------------------------------------------------

    return {
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role,
        department: department || "",
        mustChangePassword: true
      }
    };

  } catch (error) {
    console.error(
      "Erreur création utilisateur :",
      error
    );

    return {
      success: false,
      error: error.message
    };
  }
}


/**
 * Récupérer tous les utilisateurs depuis Firestore.
 */
export async function getAllUsersService() {
  try {
    const snapshot = await adminDb
      .collection("users")
      .get();

    const users = [];

    snapshot.forEach((doc) => {
      users.push(doc.data());
    });

    return {
      success: true,
      data: users
    };

  } catch (error) {
    console.error(
      "Erreur récupération utilisateurs :",
      error
    );

    return {
      success: false,
      error: error.message
    };
  }
}