import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { adminDb } from "../firebaseAdmin.js"; // ✅ AJOUT

export async function setupTwoFactor(userId) {
  console.log(`🔐 Setup 2FA pour ${userId}`);
  const secret = speakeasy.generateSecret({
    name: `Ynov Absences (${userId})`,
    issuer: 'Ynov Campus'
  });
  await adminDb.collection("users").doc(userId).set({
    twoFactorTempSecret: secret.base32,
    twoFactorEnabled: false
  }, { merge: true });
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
  console.log(`✅ QR Code généré pour ${userId}`);
  return { secret: secret.base32, qrCodeUrl };
}

export function verifyTwoFactorCode(secret, token) {
  const result = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 1
  });
  console.log(`🔑 Vérification 2FA: ${result ? '✅ OK' : '❌ ÉCHEC'}`);
  return result;
}

export async function enableTwoFactor(userId, token) {
  console.log(`🔐 Activation 2FA pour ${userId}`);
  const userDoc = await adminDb.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    console.log(`⚠️ Document utilisateur manquant, création`);
    await adminDb.collection("users").doc(userId).set({
      twoFactorTempSecret: null,
      twoFactorEnabled: false
    }, { merge: true });
    const newDoc = await adminDb.collection("users").doc(userId).get();
    if (!newDoc.exists) throw new Error("Impossible de créer le document.");
    const newData = newDoc.data();
    const secret = newData.twoFactorTempSecret;
    if (!secret) throw new Error("Aucun secret temporaire.");
    const verified = verifyTwoFactorCode(secret, token);
    if (!verified) throw new Error("Code invalide.");
    await adminDb.collection("users").doc(userId).set({
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      twoFactorTempSecret: null
    }, { merge: true });
  } else {
    const userData = userDoc.data();
    const secret = userData.twoFactorTempSecret;
    if (!secret) throw new Error("Aucun secret temporaire.");
    const verified = verifyTwoFactorCode(secret, token);
    if (!verified) throw new Error("Code invalide.");
    await adminDb.collection("users").doc(userId).update({
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      twoFactorTempSecret: null
    });
  }
  console.log(`✅ 2FA activée pour ${userId}`);
  return true;
}

export async function disableTwoFactor(userId, token) {
  console.log(`🔐 Désactivation 2FA pour ${userId}`);
  const userDoc = await adminDb.collection("users").doc(userId).get();
  if (!userDoc.exists) throw new Error("Utilisateur introuvable.");
  const userData = userDoc.data();
  if (!userData.twoFactorEnabled) throw new Error("La 2FA n'est pas activée.");
  const verified = verifyTwoFactorCode(userData.twoFactorSecret, token);
  if (!verified) throw new Error("Code invalide.");
  await adminDb.collection("users").doc(userId).update({
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorTempSecret: null
  });
  console.log(`✅ 2FA désactivée pour ${userId}`);
  return true;
}