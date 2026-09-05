import { adminAuth, adminDb } from "../../Shared/Firebase config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/profile/request
 * Soumet une demande de modification de profil.
 */
export async function requestProfileUpdate(req, res) {
  try {
    const uid = req.user.uid;
    const updateData = req.body;

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: "Aucune donnée de modification fournie." });
    }

    // Récupérer le profil actuel pour avoir le nom
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const currentName = userDoc.exists
      ? (userDoc.data().displayName || userDoc.data().name || (userDoc.data().firstName ? `${userDoc.data().firstName} ${userDoc.data().lastName || ''}`.trim() : "Utilisateur"))
      : "Utilisateur";

    // Créer la demande
    const requestRef = await adminDb.collection("profile_modification_requests").add({
      uid: uid,
      userName: currentName,
      requestedChanges: updateData,
      status: "pending", // pending, approved, rejected
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      success: true,
      message: "Demande de modification soumise avec succès.",
      requestId: requestRef.id
    });
  } catch (error) {
    console.error("Erreur requestProfileUpdate :", error);
    return res.status(500).json({ success: false, error: "Erreur lors de la soumission de la demande." });
  }
}

/**
 * GET /api/profile/requests
 * Récupère toutes les demandes en attente (Admin uniquement).
 */
export async function getPendingRequests(req, res) {
  try {
    const snapshot = await adminDb.collection("profile_modification_requests")
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .get();

    const requests = [];
    snapshot.forEach(doc => {
      requests.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error("Erreur getPendingRequests :", error);
    return res.status(500).json({ success: false, error: "Erreur lors de la récupération des demandes." });
  }
}

/**
 * POST /api/profile/requests/:id/approve
 * Approuve une demande et met à jour le profil (Admin uniquement).
 */
export async function approveRequest(req, res) {
  try {
    const { id } = req.params;
    
    const requestRef = adminDb.collection("profile_modification_requests").doc(id);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ success: false, error: "Demande introuvable." });
    }

    const requestData = requestDoc.data();
    if (requestData.status !== "pending") {
      return res.status(400).json({ success: false, error: "Cette demande n'est plus en attente." });
    }

    const { uid, requestedChanges } = requestData;
    
    // 1. Mettre à jour Firestore 'users'
    await adminDb.collection("users").doc(uid).update({
      ...requestedChanges,
      updatedAt: FieldValue.serverTimestamp()
    });

    // 2. Mettre à jour Firebase Auth (displayName) si le nom a changé
    if (requestedChanges.name || requestedChanges.displayName) {
      const newName = requestedChanges.name || requestedChanges.displayName;
      try {
        await adminAuth.updateUser(uid, { displayName: newName });
      } catch (authErr) {
        console.warn("Mise à jour displayName Firebase Auth non bloquante:", authErr.message);
      }
    }

    // 3. Mettre à jour le statut de la demande
    await requestRef.update({
      status: "approved",
      processedAt: FieldValue.serverTimestamp(),
      processedBy: req.user.uid
    });

    return res.status(200).json({ success: true, message: "Demande approuvée avec succès." });
  } catch (error) {
    console.error("Erreur approveRequest :", error);
    return res.status(500).json({ success: false, error: "Erreur lors de l'approbation de la demande." });
  }
}

/**
 * POST /api/profile/requests/:id/reject
 * Rejette une demande (Admin uniquement).
 */
export async function rejectRequest(req, res) {
  try {
    const { id } = req.params;
    
    const requestRef = adminDb.collection("profile_modification_requests").doc(id);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ success: false, error: "Demande introuvable." });
    }

    if (requestDoc.data().status !== "pending") {
      return res.status(400).json({ success: false, error: "Cette demande n'est plus en attente." });
    }

    await requestRef.update({
      status: "rejected",
      processedAt: FieldValue.serverTimestamp(),
      processedBy: req.user.uid
    });

    return res.status(200).json({ success: true, message: "Demande rejetée avec succès." });
  } catch (error) {
    console.error("Erreur rejectRequest :", error);
    return res.status(500).json({ success: false, error: "Erreur lors du rejet de la demande." });
  }
}

/**
 * PUT /api/profile/admin/:uid
 * Modification directe d'un profil par un Admin.
 */
export async function adminUpdateProfile(req, res) {
  try {
    const { uid } = req.params;
    const updateData = req.body;

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: "Aucune donnée de modification fournie." });
    }

    // 1. Mettre à jour Firestore 'users'
    await adminDb.collection("users").doc(uid).update({
      ...updateData,
      updatedAt: FieldValue.serverTimestamp()
    });

    // 2. Mettre à jour Firebase Auth (displayName) si le nom a changé
    if (updateData.name || updateData.displayName) {
      const newName = updateData.name || updateData.displayName;
      try {
        await adminAuth.updateUser(uid, { displayName: newName });
      } catch (authErr) {
        console.warn("Mise à jour displayName Firebase Auth non bloquante:", authErr.message);
      }
    }

    return res.status(200).json({ success: true, message: "Profil mis à jour avec succès." });
  } catch (error) {
    console.error("Erreur adminUpdateProfile :", error);
    return res.status(500).json({ success: false, error: "Erreur lors de la mise à jour directe du profil." });
  }
}
