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
 * Attribuer ou modifier le rôle d'un utilisateur.
 *
 * Cette opération est réservée aux administrateurs
 * par le middleware authorizeRoles() dans server.js.
 */
export async function assignUserRoleService(uid, role) {
  try {
    // --------------------------------------------------
    // 1. Validation de l'UID
    // --------------------------------------------------

    if (!uid || typeof uid !== "string") {
      return {
        success: false,
        error: "L'UID de l'utilisateur est obligatoire."
      };
    }

    // --------------------------------------------------
    // 2. Normalisation du rôle
    // --------------------------------------------------

    const normalizedRole =
      typeof role === "string"
        ? role.trim().toLowerCase()
        : "";

    // --------------------------------------------------
    // 3. Vérification du rôle
    // --------------------------------------------------

    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return {
        success: false,
        error: `Rôle invalide. Les rôles autorisés sont : ${ALLOWED_ROLES.join(", ")}.`
      };
    }

    // --------------------------------------------------
    // 4. Vérifier que l'utilisateur existe
    // --------------------------------------------------

    let userRecord;

    try {
      userRecord = await adminAuth.getUser(uid);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        return {
          success: false,
          error: "Utilisateur introuvable."
        };
      }

      throw error;
    }

    // --------------------------------------------------
    // 5. Modifier le Custom Claim Firebase
    // --------------------------------------------------

    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: normalizedRole
    });

    // --------------------------------------------------
    // 6. Synchroniser le rôle dans Firestore
    // --------------------------------------------------

    await adminDb.collection("users").doc(userRecord.uid).set(
      {
        role: normalizedRole,
        updatedAt: new Date().toISOString()
      },
      {
        merge: true
      }
    );

    // --------------------------------------------------
    // 7. Réponse
    // --------------------------------------------------

    return {
      success: true,
      message: `Rôle '${normalizedRole}' attribué à l'utilisateur ${userRecord.uid} avec succès.`,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: normalizedRole
      }
    };

  } catch (error) {
    console.error("Erreur attribution rôle :", error);

    return {
      success: false,
      error: error.message
    };
  }
}