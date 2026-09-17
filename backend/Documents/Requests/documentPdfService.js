import PDFDocument from "pdfkit";

/**
 * Génère le fichier PDF officiel A4 pour les documents administratifs YNOV Campus Maroc
 * (Attestation de réussite, Attestation de réussite sous réserve, Certificat de scolarité).
 */
export function generateOfficialDocumentPdf(request) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 20, left: 55, right: 55 },
        info: {
          Title: request.type || request.documentType || "Document Administratif",
          Author: "YNOV Campus Maroc - IDG",
          Subject: "Document officiel administratif"
        }
      });

      // Empêcher strictement la création d'une seconde page
      doc.addPage = () => doc;

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const type = (request.type || request.documentType || "Certificat de scolarité").trim();
      const typeLower = type.toLowerCase();
      const isSousReserve = typeLower.includes("réserve") || typeLower.includes("reserve");
      const isReussite = (typeLower.includes("réussite") || typeLower.includes("reussite")) && !isSousReserve;
      const isScolarite = typeLower.includes("scolarité") || typeLower.includes("scolarite") || typeLower.includes("certificat");

      const student = request.studentName || request.requesterName || ".....";
      const genderRaw = String(request.genre || request.gender || "").toLowerCase().trim();
      const isFemale = genderRaw === "femme" || genderRaw === "f" || genderRaw === "female";
      const isMale = genderRaw === "homme" || genderRaw === "m" || genderRaw === "male";

      const genrePrefix = isFemale ? "L'étudiante" : isMale ? "L'étudiant" : "L'étudiant(e)";
      const bornWord = isFemale ? "née" : isMale ? "né" : "né(e)";
      const interestPronom = isFemale ? "l'intéressée" : isMale ? "l'intéressé" : "l'intéressé(e)";

      let dateOfBirth = request.dateOfBirth || "../../..";
      if (dateOfBirth && dateOfBirth.includes("-") && dateOfBirth.length === 10) {
        const [y, m, d] = dateOfBirth.split("-");
        dateOfBirth = `${d}/${m}/${y}`;
      }
      const placeOfBirth = request.placeOfBirth || ".....";

      // Ordinal class helper
      const classStr = String(request.className || request.department || "2ème").toLowerCase();
      let curYear = "2ème";
      let nxtYear = "3ème";
      // Check Master 1 / Master 2 BEFORE generic digit check to avoid false match
      if (classStr.includes("master 2") || classStr.includes("master2") || classStr.includes("m2") || classStr.includes("cinquième") || classStr.includes("cinquieme")) {
        curYear = "5ème"; nxtYear = "Diplôme";
      } else if (classStr.includes("master 1") || classStr.includes("master1") || classStr.includes("m1") || classStr.includes("quatrième") || classStr.includes("quatrieme")) {
        curYear = "4ème"; nxtYear = "5ème";
      } else if (classStr.includes("bachelor 3") || classStr.includes("bachelor3") || classStr.includes("b3") || classStr.includes("troisième") || classStr.includes("troisieme")) {
        curYear = "3ème"; nxtYear = "4ème";
      } else if (classStr.includes("bachelor 1") || classStr.includes("bachelor1") || classStr.includes("b1") || classStr.includes("première") || classStr.includes("premiere")) {
        curYear = "1ère"; nxtYear = "2ème";
      } else if (classStr.includes("bachelor 2") || classStr.includes("bachelor2") || classStr.includes("b2") || classStr.includes("deuxième") || classStr.includes("deuxieme")) {
        curYear = "2ème"; nxtYear = "3ème";
      } else if (classStr.includes("3")) {
        curYear = "3ème"; nxtYear = "4ème";
      } else if (classStr.includes("1")) {
        curYear = "1ère"; nxtYear = "2ème";
      }

      const currentYear = new Date().getFullYear();
      const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;
      const anneeAcad = request.academicYear || request.schoolYear || defaultAcademicYear;
      const anneeUniv = request.academicYear || request.schoolYear || defaultAcademicYear;

      const dateEmission = new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

      // --- 1. EN-TÊTE LOGO MAROC YNOV CAMPUS ---
      doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(8.5).text("MAROC", 55, 45, { characterSpacing: 1.5 });
      doc.fillColor("#334155").font("Helvetica-Bold").fontSize(26).text("ynov", 55, 56, { characterSpacing: -1 });
      doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(7.5).text("CAMPUS", 55, 85, { characterSpacing: 3.5 });

      // --- 2. TITRE CENTRÉ ET SOULIGNÉ ---
      let titleText = "CERTIFICAT DE SCOLARITE";
      if (isSousReserve) {
        titleText = "ATTESTATION DE REUSSITE SOUS RESERVE";
      } else if (isReussite || typeLower.includes("réussite") || typeLower.includes("reussite")) {
        titleText = "ATTESTATION DE REUSSITE";
      } else if (typeLower.includes("stage") || typeLower.includes("convention")) {
        titleText = (request.type || request.documentType || "CONVENTION DE STAGE").toUpperCase();
      } else if (request.type || request.documentType) {
        titleText = (request.type || request.documentType).toUpperCase();
      }

      doc.y = 140;
      doc.fillColor("#000000")
        .font("Times-Bold")
        .fontSize(14.5)
        .text(titleText, { align: "center", underline: true });

      // --- 3. CORPS DU TEXTE ---
      doc.y = 200;
      doc.font("Times-Roman").fontSize(11.5).fillColor("#000000");

      // Paragraphe 1 : Déclaration d'introduction
      doc.text("Je soussigné ", { continued: true, lineGap: 6, align: "justify" });
      doc.font("Times-Bold").text("M. Amine ZNIBER", { continued: true });
      doc.font("Times-Roman").text(" – Directeur Général de IDG – YNOV CAMPUS, sise au 8, rue Ibnou Khatima – Quartier des Hôpitaux – Casablanca, atteste par la présente que :");

      doc.moveDown(1.3);

      // Paragraphe 2 : Identité de l'étudiant
      doc.font("Times-Roman").text(`${genrePrefix} `, { continued: true, lineGap: 6, align: "justify" });
      doc.font("Times-Bold").text(student, { continued: true });
      doc.font("Times-Roman").text(`, ${bornWord} le `, { continued: true });
      doc.font("Times-Bold").text(dateOfBirth, { continued: true });
      doc.font("Times-Roman").text(" à ", { continued: true });
      doc.font("Times-Bold").text(placeOfBirth, { continued: true });
      doc.font("Times-Roman").text(",");

      doc.moveDown(1.3);

      // Paragraphe 3 : Clause spécifique selon document
      if (isSousReserve) {
        const enrolledWord = isFemale ? "Est inscrite" : isMale ? "Est inscrit" : "Est inscrit(e)";
        doc.text(`${enrolledWord} en ${curYear} année au sein de notre établissement pour l'année universitaire ${anneeUniv} et a obtenu les notes et résultats requis pour le passage en ${nxtYear} année `, { continued: true, lineGap: 6, align: "justify" });
        doc.font("Times-Bold").text("sous réserve de valider le stage d'été.", { continued: false });
      } else if (isReussite || typeLower.includes("réussite") || typeLower.includes("reussite")) {
        const enrolledPastWord = isFemale ? "Était inscrite" : isMale ? "Était inscrit" : "Était inscrit(e)";
        doc.text(`${enrolledPastWord} en `, { continued: true, lineGap: 6, align: "justify" });
        doc.font("Times-Bold").text(`${curYear} année`, { continued: true });
        doc.font("Times-Roman").text(" au sein de notre établissement au titre de l'année universitaire ", { continued: true });
        doc.font("Times-Bold").text(`${anneeUniv}`, { continued: true });
        if (nxtYear === "Diplôme") {
          doc.font("Times-Roman").text(" et a obtenu les résultats requis pour ", { continued: true });
          doc.font("Times-Bold").text("l'obtention de son diplôme.", { continued: false });
        } else {
          doc.font("Times-Roman").text(" et a obtenu les résultats requis pour le passage en ", { continued: true });
          doc.font("Times-Bold").text(`${nxtYear} année.`, { continued: false });
        }
      } else if (typeLower.includes("stage") || typeLower.includes("convention")) {
        const enrolledWord = isFemale ? "Est inscrite" : isMale ? "Est inscrit" : "Est inscrit(e)";
        const company = request.companyName || "l'organisme d'accueil";
        const period = request.internshipPeriod || "l'année académique en cours";
        doc.text(`${enrolledWord} en ${curYear} année au sein de notre établissement (Filière ${request.department || 'Informatique & Numérique'}) pour l'année académique ${anneeAcad}, et est autorisé(e) à réaliser son stage d'immersion professionnelle auprès de `, { continued: true, lineGap: 6, align: "justify" });
        doc.font("Times-Bold").text(`${company}`, { continued: true });
        doc.font("Times-Roman").text(` durant la période suivante : ${period}.`, { continued: false });
      } else {
        // Certificat de scolarité ou Document officiel standard
        const enrolledWord = isFemale ? "Est inscrite" : isMale ? "Est inscrit" : "Est inscrit(e)";
        doc.text(`${enrolledWord} en ${curYear} année au sein de notre établissement pour l'année académique ${anneeAcad}.`, { lineGap: 6, align: "justify" });
      }

      if (request.customNote) {
        doc.moveDown(0.8);
        doc.font("Times-Italic").fontSize(10).fillColor("#334155").text(`Mention spécifique : ${request.customNote}`, { lineGap: 4, align: "justify" });
        doc.font("Times-Roman").fontSize(11.5).fillColor("#000000");
      }

      doc.moveDown(1.3);

      // Paragraphe 4 : Délivrance
      doc.font("Times-Roman").text(`Cette attestation est délivrée à ${interestPronom}, à sa demande, pour servir et valoir ce que de droit.`, { lineGap: 6, align: "justify" });

      // --- 4. SIGNATURE DIRECTEUR ---
      doc.y = 425;
      const signatureX = 335;
      doc.font("Times-Roman").fontSize(11).fillColor("#000000");
      doc.text(`Fait à Casablanca, le ${dateEmission}`, signatureX, doc.y, { width: 205, align: "right" });
      doc.moveDown(0.3);
      doc.text("DIRECTEUR GENERAL", signatureX, doc.y, { width: 205, align: "right" });
      doc.moveDown(0.2);
      doc.font("Times-Bold").fontSize(11.5).text("Amine ZNIBER", signatureX, doc.y, { width: 205, align: "right" });

      // --- 5. PIED DE PAGE OFFICIEL IDG MAROC ---
      // Désactiver la marge basse pour le pied de page afin d'éviter tout saut de page automatique
      doc.page.margins.bottom = 0;
      const footerY = 720;

      // Colonne gauche
      doc.fillColor("#6ba4c7").font("Helvetica-Bold").fontSize(7.5).text("IDG Maroc – YNOV CAMPUS", 55, footerY);
      doc.fillColor("#333333").font("Helvetica").fontSize(6.8).text(
        "Société Anonyme au capital de 6.400.000 DH – 8, Rue Ibnou Khatima – Casablanca\nCNSS : 7164833 – IF : 1023591 – RC : 144155 – Patente : 36330905 – ICE : 001645521000037",
        55,
        footerY + 12,
        { width: 350, lineGap: 1.5 }
      );
      doc.fillColor("#555555").font("Helvetica-Oblique").fontSize(6.5).text(
        "Ce document est la propriété exclusive de la société IDG et ne peut être diffusé sans accord préalable",
        55,
        footerY + 34
      );

      // Colonne droite
      doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(5.5).text("MAROC", 460, footerY - 5, { characterSpacing: 1 });
      doc.fillColor("#334155").font("Helvetica-Bold").fontSize(15).text("ynov", 460, footerY + 1, { characterSpacing: -0.8 });
      doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(5).text("CAMPUS", 460, footerY + 18, { characterSpacing: 2 });
      doc.fillColor("#333333").font("Helvetica").fontSize(6.5).text(
        "IDG, représentant de la\nMarque YNOV CAMPUS\nau Maroc",
        460,
        footerY + 28,
        { width: 110, lineGap: 1 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
