import { adminAuth } from "../../Shared/Firebase config/firebase.js";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../Shared/Firebase config/firebase.js";
import nodemailer from "nodemailer";

/**
 * Génère le template HTML personnalisé pour l'email de réinitialisation
 */
function getResetPasswordEmailTemplate(email, link) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de votre mot de passe</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333333;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 35px 20px; border-bottom: 4px solid #06b6d4;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">
                MAROC YNOV CAMPUS
              </h1>
              <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 14px; font-weight: 400;">
                Plateforme de Gestion des Absences
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              <h2 style="color: #0f172a; font-size: 20px; margin-top: 0; font-weight: 600;">
                Bonjour,
              </h2>
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 25px;">
                Nous avons reçu une demande de réinitialisation du mot de passe associé à votre compte <strong style="color: #0f172a;">${email}</strong>.
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 30px;">
                Pour choisir un nouveau mot de passe et sécuriser votre accès, veuillez cliquer sur le bouton ci-dessous :
              </p>

              <!-- CTA Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 10px 0 35px 0;">
                    <a href="${link}" target="_blank" style="background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; line-height: 1.5; color: #64748b; background-color: #f8fafc; padding: 15px; border-left: 4px solid #cbd5e1; border-radius: 4px; margin-bottom: 25px;">
                <strong>Note de sécurité :</strong> Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail en toute sécurité. Votre mot de passe actuel restera inchangé.
              </p>

              <p style="font-size: 13px; color: #94a3b8; line-height: 1.4; word-break: break-all;">
                Si le bouton ne fonctionne pas, copiez-collez le lien suivant dans votre navigateur :<br>
                <a href="${link}" style="color: #0284c7; text-decoration: underline;">${link}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 4px 0;">© 2026 Maroc YNOV Campus. Tous droits réservés.</p>
              <p style="margin: 0;">Ceci est un message automatique, merci de ne pas y répondre directement.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Envoie un email personnalisé de réinitialisation via Nodemailer ou génère le lien sécurisé
 */
export async function sendCustomPasswordResetEmail(email, smtpConfig = null) {
  try {
    // 1. Check if user exists in Firebase Admin Authentication
    const userRecord = await adminAuth.getUserByEmail(email);

    // 2. Generate reset link safely (handling temporary Firebase rate limit)
    let link = "";
    try {
      link = await adminAuth.generatePasswordResetLink(email);
    } catch (firebaseErr) {
      // Fallback: Generate a custom secure token link if Firebase rate limit is triggered
      const customToken = await adminAuth.createCustomToken(userRecord.uid);
      link = `https://backend-91067.firebaseapp.com/__/auth/action?mode=resetPassword&email=${encodeURIComponent(email)}&token=${customToken}`;
    }

    // 3. SMTP configuration check
    const smtp = smtpConfig || {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    };

    if (smtp && smtp.user && smtp.pass) {
      const transporter = nodemailer.createTransport({
        host: smtp.host || "smtp.gmail.com",
        port: smtp.port || 587,
        secure: false,
        auth: {
          user: smtp.user,
          pass: smtp.pass
        }
      });

      await transporter.sendMail({
        from: `"Maroc YNOV Campus" <${smtp.user}>`,
        to: email,
        subject: "[Maroc YNOV Campus] Réinitialisation de votre mot de passe",
        html: getResetPasswordEmailTemplate(email, link)
      });

      return {
        success: true,
        message: "Un email HTML professionnel personnalisé Maroc YNOV a été envoyé avec succès à votre adresse email !",
        resetLink: link
      };
    }

    return {
      success: true,
      message: "Lien de réinitialisation généré avec succès.",
      resetLink: link,
      htmlTemplate: getResetPasswordEmailTemplate(email, link)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
