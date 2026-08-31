import nodemailer from 'nodemailer';

// Configuration SMTP (à personnaliser)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Envoyer un email de bienvenue à un nouvel utilisateur
 * @param {Object} params
 * @param {string} params.email - Email du destinataire
 * @param {string} params.displayName - Nom de l'utilisateur
 * @param {string} params.password - Mot de passe initial
 * @param {string} params.role - Rôle de l'utilisateur
 * @param {string} params.loginUrl - URL de connexion
 */
export async function sendWelcomeEmail({ email, displayName, password, role, loginUrl }) {
  const roleLabels = {
    admin: 'Administrateur',
    rh: 'Ressources humaines',
    manager: 'Manager',
    employee: 'Personnel',
    student: 'Étudiant',
    teacher: 'Professeur',
    parent: 'Parent'
  };

  const roleLabel = roleLabels[role] || role || 'Utilisateur';

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Montserrat', Arial, sans-serif; background: #f8fafc; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { text-align: center; border-bottom: 2px solid #23b2a4; padding-bottom: 20px; margin-bottom: 24px; }
        .header h1 { color: #0f172a; font-size: 24px; margin: 0; }
        .header .subtitle { color: #64748b; font-size: 14px; }
        .content { color: #1e293b; line-height: 1.6; }
        .info-box { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #23b2a4; }
        .info-box strong { color: #0f172a; }
        .btn { display: inline-block; padding: 12px 32px; background: #23b2a4; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 16px; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
        .footer a { color: #23b2a4; text-decoration: none; }
        .badge { display: inline-block; padding: 4px 12px; background: #23b2a4; color: #fff; border-radius: 20px; font-size: 12px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Bienvenue sur Ynov Campus</h1>
          <p class="subtitle">Votre compte a été créé avec succès</p>
        </div>
        <div class="content">
          <p>Bonjour <strong>${displayName}</strong>,</p>
          <p>Votre compte sur la plateforme <strong>Ynov Campus - Gestion des Absences</strong> a été créé.</p>
          <div class="info-box">
            <p><strong>👤 Rôle :</strong> ${roleLabel}</p>
            <p><strong>📧 Email :</strong> ${email}</p>
            <p><strong>🔑 Mot de passe initial :</strong> <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
          </div>
          <p>Pour vous connecter, utilisez vos identifiants ci-dessus. Vous pourrez changer votre mot de passe après la première connexion.</p>
          <div style="text-align: center;">
            <a href="${loginUrl}" class="btn">🔗 Accéder à la plateforme</a>
          </div>
          <p style="margin-top: 16px; font-size: 14px; color: #64748b;">
            <strong>📌 Recommandations :</strong>
            <ul>
              <li>Changez votre mot de passe dès votre première connexion</li>
              <li>Si vous rencontrez des difficultés, utilisez le lien "Mot de passe oublié"</li>
            </ul>
          </p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
          <p>© 2026 Ynov Campus - Tous droits réservés</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textTemplate = `
    Bonjour ${displayName},

    Votre compte sur la plateforme Ynov Campus - Gestion des Absences a été créé.

    👤 Rôle : ${roleLabel}
    📧 Email : ${email}
    🔑 Mot de passe initial : ${password}

    Connectez-vous ici : ${loginUrl}

    Vous pourrez changer votre mot de passe après la première connexion.

    ---
    Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
    © 2026 Ynov Campus
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || `"Ynov Campus" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🎓 Bienvenue sur Ynov Campus - Votre compte est créé',
    html: htmlTemplate,
    text: textTemplate
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email de bienvenue envoyé à ${email} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envoyer un email de confirmation (optionnel)
 */
export async function sendEmail(to, subject, html, text) {
  const mailOptions = {
    from: process.env.SMTP_FROM || `"Ynov Campus" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
}