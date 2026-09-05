import { adminDb } from "../../firebaseAdmin.js"; // ✅ AJOUT
import { setupTwoFactor, enableTwoFactor, disableTwoFactor, verifyTwoFactorCode } from "../../Services/twoFactorService.js";
import { logActivity } from "../../Services/activityLogService.js";
import admin from "firebase-admin";

export async function handleTwoFactorSetup(req, res) {
  console.log("📥 [2FA] Setup appelé pour", req.user?.uid);
  try {
    const result = await setupTwoFactor(req.user.uid);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("❌ Erreur setup 2FA:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleTwoFactorEnable(req, res) {
  console.log("📥 [2FA] Enable appelé");
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: "Code requis." });
    }
    await enableTwoFactor(req.user.uid, token);
    await logActivity(req.user.uid, 'enable_2fa', {}, req);
    return res.status(200).json({ success: true, message: "2FA activée." });
  } catch (error) {
    console.error("❌ [2FA] Erreur enable:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

export async function handleTwoFactorDisable(req, res) {
  console.log("📥 [2FA] Disable appelé");
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: "Code requis." });
    }
    await disableTwoFactor(req.user.uid, token);
    await logActivity(req.user.uid, 'disable_2fa', {}, req);
    return res.status(200).json({ success: true, message: "2FA désactivée." });
  } catch (error) {
    console.error("❌ [2FA] Erreur disable:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}



export async function handleTwoFactorVerifyLogin(req, res) {
  console.log("📥 [2FA] Vérification login appelé");
  try {
    const { token, tempUserId } = req.body;
    if (!token || !tempUserId) {
      return res.status(400).json({ success: false, error: "Code et ID utilisateur requis." });
    }

    const tempDoc = await adminDb.collection("temp_2fa").doc(tempUserId).get();
    if (!tempDoc.exists) {
      return res.status(400).json({ success: false, error: "Session 2FA expirée ou invalide." });
    }
    const tempData = tempDoc.data();
    const userId = tempData.userId;
    const secret = tempData.secret;

    const verified = verifyTwoFactorCode(secret, token);
    if (!verified) {
      return res.status(400).json({ success: false, error: "Code invalide." });
    }

    await adminDb.collection("temp_2fa").doc(tempUserId).delete();
    await adminDb.collection("users").doc(userId).update({
      twoFactorVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 🔥 LOG DE CONNEXION RÉUSSIE APRÈS 2FA
    await logActivity(userId, 'login', { method: '2fa' }, req);

    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
    }
    const userData = userDoc.data();

    return res.status(200).json({
      success: true,
      message: "Authentification 2FA réussie.",
      uid: userId
    });
  } catch (error) {
    console.error("❌ [2FA] Erreur verify-login:", error);
    return res.status(500).json({ success: false, error: "Erreur interne." });
  }
}
