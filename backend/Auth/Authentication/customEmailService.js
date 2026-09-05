import { adminAuth } from "../../Shared/Firebase config/firebase.js";
import nodemailer from "nodemailer";

/**
 * Créer un transporteur Nodemailer configuré à partir des variables d'environnement
 */
function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: { user, pass }
  });
}

/**
 * Template HTML pour Réinitialisation du Mot de Passe
 */
function getResetPasswordEmailTemplate(email, link) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Réinitialisation de votre mot de passe</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333333;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 35px 20px; border-bottom: 4px solid #06b6d4;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">MAROC YNOV CAMPUS</h1>
              <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 14px;">Plateforme de Gestion des Absences</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #0f172a; font-size: 18px;">Bonjour,</h2>
              <p style="font-size: 15px; color: #475569; line-height: 1.6;">
                Une demande de réinitialisation de mot de passe a été soumise pour le compte <strong>${email}</strong>.
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${link}" target="_blank" style="background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; display: inline-block;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 20px; font-size: 12px; color: #94a3b8;">
              © 2026 Maroc YNOV Campus. Tous droits réservés.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Template HTML pour Alerte Nouvelle Absence (Envoyé au RH / Manager)
 */
function getNewAbsenceHREmailTemplate(absence) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Nouvelle Demande d'Absence</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333333;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; border-bottom: 4px solid #f59e0b;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">MAROC YNOV CAMPUS - ALERTE RH</h1>
              <p style="color: #cbd5e1; margin: 4px 0 0 0; font-size: 14px;">Nouvelle demande d'absence à réviser</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px;">
              <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Une nouvelle demande a été soumise :</h2>
              <table border="0" cellpadding="8" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <tr><td><strong>Demandeur :</strong></td><td>${absence.displayName} (${absence.userEmail})</td></tr>
                <tr><td><strong>Département :</strong></td><td>${absence.department || "Non spécifié"}</td></tr>
                <tr><td><strong>Type d'absence :</strong></td><td><span style="text-transform: uppercase; font-weight: bold; color: #0284c7;">${absence.type}</span></td></tr>
                <tr><td><strong>Période :</strong></td><td>Du ${absence.startDate} au ${absence.endDate}</td></tr>
                <tr><td><strong>Motif :</strong></td><td>${absence.reason}</td></tr>
                ${absence.justificationUrl ? `<tr><td><strong>Justificatif :</strong></td><td><a href="${absence.justificationUrl}" style="color: #0284c7; text-decoration: underline;">Consulter le document</a></td></tr>` : ""}
              </table>
              <p style="font-size: 14px; color: #64748b;">
                Connectez-vous au portail d'administration pour approuver ou rejeter cette demande.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 15px; font-size: 12px; color: #94a3b8;">
              © 2026 Maroc YNOV Campus - Service des Ressources Humaines
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Template HTML pour Décision sur la Demande d'Absence (Envoyé à l'Étudiant / Employé)
 */
function getAbsenceDecisionEmailTemplate(displayName, status, reviewNotes) {
  const isApproved = status === "approved";
  const statusColor = isApproved ? "#10b981" : "#ef4444";
  const statusText = isApproved ? "APPROUVÉE" : "REFUSÉE";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Décision sur votre demande d'absence</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333333;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; border-bottom: 4px solid ${statusColor};">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">MAROC YNOV CAMPUS</h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 14px;">Mise à jour du statut d'absence</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Bonjour ${displayName},</h2>
              <p style="font-size: 15px; color: #475569; line-height: 1.6;">
                Votre demande d'absence a été examinée par le service d'administration / RH.
              </p>
              <div style="background-color: #f8fafc; border-left: 4px solid ${statusColor}; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Statut de la demande :</p>
                <p style="margin: 0; font-size: 20px; font-weight: bold; color: ${statusColor};">${statusText}</p>
                ${reviewNotes ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #334155;"><strong>Remarques du modérateur :</strong> ${reviewNotes}</p>` : ""}
              </div>
              <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
                Pour toute question relative à cette décision, veuillez contacter l'administration de l'établissement.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 15px; font-size: 12px; color: #94a3b8;">
              © 2026 Maroc YNOV Campus. Tous droits réservés.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Service 1 : Envoi de l'email de réinitialisation du mot de passe
 */
export async function sendCustomPasswordResetEmail(email, smtpConfig = null) {
  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    let link = "";
    try {
      link = await adminAuth.generatePasswordResetLink(email);
    } catch (firebaseErr) {
      const customToken = await adminAuth.createCustomToken(userRecord.uid);
      link = `https://backend-91067.firebaseapp.com/__/auth/action?mode=resetPassword&email=${encodeURIComponent(email)}&token=${customToken}`;
    }

    const transporter = createTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: `"Maroc YNOV Campus" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "[Maroc YNOV Campus] Réinitialisation de votre mot de passe",
        html: getResetPasswordEmailTemplate(email, link)
      });
      return { success: true, message: "Email de réinitialisation envoyé avec succès.", resetLink: link };
    }

    return { success: true, message: "Lien de réinitialisation généré avec succès.", resetLink: link };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Service 2 : Envoi d'une alerte email au RH / Manager lors d'une nouvelle demande d'absence
 */
export async function sendNewAbsenceAlertToHR(absenceData) {
  try {
    const transporter = createTransporter();
    if (!transporter) return { success: false, error: "SMTP non configuré dans .env" };

    const hrEmail = process.env.HR_EMAIL || process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"Maroc YNOV Campus Alertes" <${process.env.SMTP_USER}>`,
      to: hrEmail,
      subject: `[Alerte RH] Nouvelle demande d'absence - ${absenceData.displayName}`,
      html: getNewAbsenceHREmailTemplate(absenceData)
    });

    return { success: true, message: "Alerte RH envoyée par email." };
  } catch (error) {
    console.error("Erreur d'envoi email alerte RH :", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Service 3 : Envoi de la notification de décision par email au demandeur d'absence
 */
export async function sendAbsenceStatusEmail(userEmail, displayName, status, reviewNotes = "") {
  try {
    const transporter = createTransporter();
    if (!transporter) return { success: false, error: "SMTP non configuré dans .env" };

    const statusText = status === "approved" ? "Approuvée" : "Refusée";

    await transporter.sendMail({
      from: `"Maroc YNOV Campus" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `[Maroc YNOV Campus] Votre demande d'absence a été ${statusText}`,
      html: getAbsenceDecisionEmailTemplate(displayName, status, reviewNotes)
    });

    return { success: true, message: "Notification de décision envoyée par email au demandeur." };
  } catch (error) {
    console.error("Erreur d'envoi email décision :", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Template HTML pour Alerte Annulation de Cours (Absence Professeur)
 */
function getCourseCancellationEmailTemplate({ recipientName, studentName, isParent, courseTitle, courseDate, courseTime, courseRoom, teacherName }) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Alerte : Cours annulé</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333333;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; border-bottom: 4px solid #f59e0b;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">MAROC YNOV CAMPUS</h1>
              <p style="color: #fef3c7; margin: 4px 0 0 0; font-size: 14px; font-weight: bold;">⚠️ AVIS D'ANNULATION DE COURS</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Bonjour ${recipientName},</h2>
              <p style="font-size: 15px; color: #475569; line-height: 1.6;">
                ${isParent 
                  ? `Nous vous informons qu'un cours concernant votre enfant <strong>${studentName}</strong> est annulé en raison de l'absence confirmée de son professeur.`
                  : `Nous vous informons qu'un cours de votre emploi du temps est annulé en raison de l'absence confirmée de votre professeur.`
                }
              </p>
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 15px; color: #92400e;"><strong>Matière :</strong> ${courseTitle}</p>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400e;"><strong>Professeur absent :</strong> ${teacherName}</p>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400e;"><strong>Date :</strong> ${courseDate}</p>
                <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Horaire :</strong> ${courseTime}${courseRoom ? ` (${courseRoom})` : ''}</p>
              </div>
              <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
                Consultez votre espace personnel sur la plateforme pour retrouver votre emploi du temps mis à jour en temps réel.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 15px; font-size: 12px; color: #94a3b8;">
              © 2026 Maroc YNOV Campus. Tous droits réservés.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Service 4 : Envoi de la notification d'annulation de cours par email aux étudiants et parents
 */
export async function sendCourseCancellationEmail({
  toEmail,
  recipientName,
  isParent = false,
  studentName = "",
  courseTitle,
  courseDate,
  courseTime,
  courseRoom = "",
  teacherName
}) {
  try {
    if (!toEmail) return { success: false, error: "Adresse email manquante" };
    const transporter = createTransporter();
    if (!transporter) return { success: false, error: "SMTP non configuré dans .env" };

    const subject = isParent
      ? `[Maroc YNOV Campus] Cours annulé pour ${studentName || 'votre enfant'} : ${courseTitle}`
      : `[Maroc YNOV Campus] Cours annulé : ${courseTitle}`;

    await transporter.sendMail({
      from: `"Maroc YNOV Campus" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject,
      html: getCourseCancellationEmailTemplate({
        recipientName,
        studentName,
        isParent,
        courseTitle,
        courseDate,
        courseTime,
        courseRoom,
        teacherName
      })
    });

    return { success: true, message: "Email d'annulation envoyé avec succès." };
  } catch (error) {
    console.error("Erreur d'envoi email annulation cours :", error.message);
    return { success: false, error: error.message };
  }
}
