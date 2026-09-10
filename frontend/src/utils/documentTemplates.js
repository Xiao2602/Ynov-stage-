/**
 * Modèles officiels de documents administratifs - YNOV CAMPUS MAROC
 */

export function isAttestationReussiteSousReserve(request) {
  if (!request) return false;
  const type = (request.type || request.documentType || '').toLowerCase();
  return type.includes('réserve') || type.includes('reserve');
}

export function isAttestationReussite(request) {
  if (!request) return false;
  const type = (request.type || request.documentType || '').toLowerCase();
  return (
    type.includes('réussite') ||
    type.includes('reussite') ||
    isAttestationReussiteSousReserve(request)
  );
}

export function isCertificatScolarite(request) {
  if (!request) return false;
  const type = (request.type || request.documentType || '').toLowerCase();
  return (
    type.includes('scolarité') ||
    type.includes('scolarite') ||
    type.includes('certificat')
  );
}

export function isHtmlDocument(request) {
  return isAttestationReussite(request) || isCertificatScolarite(request);
}

function formatDateFR(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (s.includes('/') && s.length >= 8) return s;
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (_) {
    return s;
  }
}

function getYearsFromClass(className) {
  const str = String(className || '').toLowerCase();
  // Check Master 1 / Master 2 BEFORE generic digit check to avoid false match
  if (str.includes('master 2') || str.includes('master2') || str.includes('m2') || str.includes('cinquième') || str.includes('cinquieme') || str.includes('5ème') || str.includes('5eme')) {
    return { current: '5<sup>ème</sup>', next: 'Diplôme' };
  }
  if (str.includes('master 1') || str.includes('master1') || str.includes('m1') || str.includes('quatrième') || str.includes('quatrieme') || str.includes('4ème') || str.includes('4eme')) {
    return { current: '4<sup>ème</sup>', next: '5<sup>ème</sup>' };
  }
  if (str.includes('bachelor 3') || str.includes('bachelor3') || str.includes('b3') || str.includes('troisième') || str.includes('troisieme') || str.includes('3ème') || str.includes('3eme')) {
    return { current: '3<sup>ème</sup>', next: '4<sup>ème</sup>' };
  }
  if (str.includes('bachelor 1') || str.includes('bachelor1') || str.includes('b1') || str.includes('première') || str.includes('premiere') || str.includes('1ère') || str.includes('1ere')) {
    return { current: '1<sup>ère</sup>', next: '2<sup>ème</sup>' };
  }
  if (str.includes('bachelor 2') || str.includes('bachelor2') || str.includes('b2') || str.includes('deuxième') || str.includes('deuxieme') || str.includes('2ème') || str.includes('2eme')) {
    return { current: '2<sup>ème</sup>', next: '3<sup>ème</sup>' };
  }
  // Fallback: check for lone digits last
  if (str.includes('3')) return { current: '3<sup>ème</sup>', next: '4<sup>ème</sup>' };
  if (str.includes('1')) return { current: '1<sup>ère</sup>', next: '2<sup>ème</sup>' };
  return { current: '2<sup>ème</sup>', next: '3<sup>ème</sup>' };
}

function getAcademicYear(request) {
  if (request?.academicYear) return request.academicYear;
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth();
  const start = month >= 7 ? currentYear : currentYear - 1;
  return `${start}-${start + 1}`;
}

// ============================================================
// CSS OFFICIEL PARTAGÉ POUR TOUS LES DOCUMENTS ADMINISTRATIFS
// ============================================================
const OFFICIAL_DOC_CSS = `
  @page {
    size: A4 portrait;
    margin: 12mm 18mm 12mm 18mm;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html, body {
    height: 100%;
    background-color: #ffffff;
    color: #111111;
  }
  body {
    font-family: 'Times New Roman', Times, 'Nimbus Roman No9 L', serif;
    font-size: 11pt;
    line-height: 1.5;
    padding: 16px 24px;
    max-width: 780px;
    margin: 0 auto;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .content-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* LOGO MAROC YNOV CAMPUS */
  .logo-top {
    margin-bottom: 20px;
    display: inline-block;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  .logo-top .maroc {
    font-size: 7.5pt;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .logo-top .ynov {
    font-size: 24pt;
    font-weight: 900;
    color: #334155;
    letter-spacing: -1px;
    line-height: 0.95;
    margin-top: 1px;
  }
  .logo-top .campus {
    font-size: 6.8pt;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 3.5px;
    text-transform: uppercase;
    line-height: 1.1;
    margin-top: 2px;
  }

  /* TITRE DU DOCUMENT */
  h1.doc-title {
    text-align: center;
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    text-decoration: underline;
    text-underline-offset: 3px;
    letter-spacing: 0.5px;
    margin: 18px 0 30px 0;
    font-family: 'Times New Roman', Times, serif;
    color: #000000;
  }

  /* CORPS DU TEXTE */
  .doc-body {
    text-align: justify;
    line-height: 1.8;
    font-size: 11pt;
    color: #000000;
  }
  .doc-body p {
    margin-bottom: 16px;
    text-indent: 0;
  }
  .bold {
    font-weight: bold;
  }
  sup {
    font-size: 0.72em;
    vertical-align: super;
  }

  /* SIGNATURE DIRECTEUR */
  .signature-area {
    margin-top: 25px;
    text-align: right;
    font-size: 10.5pt;
    line-height: 1.6;
    padding-right: 15px;
  }
  .signature-area .date-line {
    margin-bottom: 3px;
  }
  .signature-area .role-line {
    text-transform: uppercase;
    font-weight: normal;
    margin-bottom: 2px;
  }
  .signature-area .name-line {
    font-weight: bold;
    font-size: 11pt;
  }

  /* PIED DE PAGE */
  .doc-footer {
    margin-top: auto;
    padding-top: 15px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 6.8pt;
    color: #333333;
    line-height: 1.4;
    page-break-inside: avoid;
  }
  .doc-footer-left {
    max-width: 68%;
  }
  .doc-footer-brand {
    font-weight: bold;
    color: #6ba4c7;
    font-size: 7.5pt;
    margin-bottom: 2px;
  }
  .doc-footer-legal {
    color: #333333;
    margin-bottom: 5px;
  }
  .doc-footer-notice {
    font-style: italic;
    color: #555555;
    font-size: 6.5pt;
  }
  .doc-footer-right {
    text-align: left;
    font-size: 6.5pt;
    color: #333333;
    line-height: 1.3;
  }
  .doc-footer-right .logo-footer {
    margin-bottom: 3px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  .doc-footer-right .logo-footer .maroc-sm {
    font-size: 5.5pt;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 1px;
    line-height: 1;
  }
  .doc-footer-right .logo-footer .ynov-sm {
    font-size: 15pt;
    font-weight: 900;
    color: #334155;
    letter-spacing: -0.8px;
    line-height: 0.95;
    margin-top: 1px;
  }
  .doc-footer-right .logo-footer .campus-sm {
    font-size: 5pt;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 2px;
    line-height: 1;
  }

  @media print {
    html, body {
      height: 100% !important;
      overflow: hidden !important;
    }
    body {
      padding: 0 !important;
      max-width: 100% !important;
    }
    .no-print {
      display: none !important;
    }
  }
`;

/**
 * 1. ATTESTATION DE REUSSITE (Modèle officiel)
 */
export function buildAttestationReussiteSimpleHTML(request) {
  const student = request?.studentName || request?.requesterName || '';
  const genderRaw = String(request?.genre || request?.gender || '').toLowerCase().trim();

  const isFemale = genderRaw === 'femme' || genderRaw === 'f' || genderRaw === 'female';
  const isMale = genderRaw === 'homme' || genderRaw === 'm' || genderRaw === 'male';

  const genrePrefix = isFemale ? "L'étudiante" : isMale ? "L'étudiant" : "L'étudiant(e)";
  const bornWord = isFemale ? 'née' : isMale ? 'né' : 'né(e)';
  const enrolledPastWord = isFemale ? 'Était inscrite' : isMale ? 'Était inscrit' : 'Était inscrit(e)';
  const interestPronom = isFemale ? "l'intéressée" : isMale ? "l'intéressé" : "l'intéressé(e)";

  const dateOfBirth = formatDateFR(request?.dateOfBirth) || '../../...';
  const placeOfBirth = request?.placeOfBirth || '....';
  const studentDisplay = student ? student : '....';

  const years = getYearsFromClass(request?.className || request?.department || request?.class);
  const anneeUniv = getAcademicYear(request);

  const dateEmission = formatDateFR(new Date()) ||
    new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>ATTESTATION DE REUSSITE</title>
<style>
${OFFICIAL_DOC_CSS}
</style>
</head>
<body>

  <div class="content-wrap">
    <!-- LOGO OFFICIEL EN TÊTE HAUT GAUCHE -->
    <div class="logo-top">
      <div class="maroc">MAROC</div>
      <div class="ynov">ynov</div>
      <div class="campus">CAMPUS</div>
    </div>

    <!-- TITRE OFFICIEL -->
    <h1 class="doc-title">ATTESTATION DE REUSSITE</h1>

    <!-- TEXTE PRINCIPAL -->
    <div class="doc-body">
      <p>
        Je soussigné <span class="bold">M. Amine ZNIBER</span> – Directeur Général de IDG – YNOV CAMPUS, sise au 8, rue Ibnou Khatima – Quartier des Hôpitaux – Casablanca, atteste par la présente que :
      </p>

      <p>
        ${genrePrefix} <span class="bold">${studentDisplay}</span>, ${bornWord} le <span class="bold">${dateOfBirth}</span> à <span class="bold">${placeOfBirth}</span>,
      </p>

      <p>
        ${enrolledPastWord} en <span class="bold">${years.current} année</span> au sein de notre établissement au titre de l'année universitaire <span class="bold">${anneeUniv}</span> ${years.next === 'Diplôme' ? "et a obtenu les résultats requis pour <span class=\"bold\">l'obtention de son diplôme</span>." : `et a obtenu les résultats requis pour le passage en <span class=\"bold\">${years.next} année</span>.`}
      </p>

      <p>
        Cette attestation est délivrée à ${interestPronom}, à sa demande, pour servir et valoir ce que de droit.
      </p>
    </div>

    <!-- ZONE SIGNATURE -->
    <div class="signature-area">
      <div class="date-line">Fait à Casablanca, le ${dateEmission}</div>
      <div class="role-line">DIRECTEUR GENERAL</div>
      <div class="name-line">Amine ZNIBER</div>
    </div>
  </div>

  <!-- PIED DE PAGE OFFICIEL -->
  <div class="doc-footer">
    <div class="doc-footer-left">
      <div class="doc-footer-brand">IDG Maroc – YNOV CAMPUS</div>
      <div class="doc-footer-legal">
        <div>Société Anonyme au capital de 6.400.000 DH – 8, Rue Ibnou Khatima – Casablanca</div>
        <div>CNSS : 7164833 – IF : 1023591 – RC : 144155 – Patente : 36330905 – ICE : 001645521000037</div>
      </div>
      <div class="doc-footer-notice">
        Ce document est la propriété exclusive de la société IDG et ne peut être diffusé sans accord préalable
      </div>
    </div>

    <div class="doc-footer-right">
      <div class="logo-footer">
        <div class="maroc-sm">MAROC</div>
        <div class="ynov-sm">ynov</div>
        <div class="campus-sm">CAMPUS</div>
      </div>
      <div>IDG, représentant de la</div>
      <div>Marque YNOV CAMPUS</div>
      <div>au Maroc</div>
    </div>
  </div>

</body>
</html>`;
}

/**
 * 2. ATTESTATION DE REUSSITE SOUS RESERVE (Modèle officiel)
 */
export function buildAttestationReussiteSousReserveHTML(request) {
  const student = request?.studentName || request?.requesterName || '';
  const genderRaw = String(request?.genre || request?.gender || '').toLowerCase().trim();

  const isFemale = genderRaw === 'femme' || genderRaw === 'f' || genderRaw === 'female';
  const isMale = genderRaw === 'homme' || genderRaw === 'm' || genderRaw === 'male';

  const genrePrefix = isFemale ? "L'étudiante" : isMale ? "L'étudiant" : "L'étudiant(e)";
  const bornWord = isFemale ? 'née' : isMale ? 'né' : 'né(e)';
  const enrolledWord = isFemale ? 'Est inscrite' : isMale ? 'Est inscrit' : 'Est inscrit(e)';
  const interestPronom = isFemale ? "l'intéressée" : isMale ? "l'intéressé" : "l'intéressé(e)";

  const dateOfBirth = formatDateFR(request?.dateOfBirth) || '../../..';
  const placeOfBirth = request?.placeOfBirth || '.....';
  const studentDisplay = student ? student : '.....';

  const years = getYearsFromClass(request?.className || request?.department || request?.class);
  const anneeUniv = getAcademicYear(request);

  const dateEmission = formatDateFR(new Date()) ||
    new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>ATTESTATION DE REUSSITE SOUS RESERVE</title>
<style>
${OFFICIAL_DOC_CSS}
</style>
</head>
<body>

  <div class="content-wrap">
    <!-- LOGO OFFICIEL EN TÊTE HAUT GAUCHE -->
    <div class="logo-top">
      <div class="maroc">MAROC</div>
      <div class="ynov">ynov</div>
      <div class="campus">CAMPUS</div>
    </div>

    <!-- TITRE OFFICIEL -->
    <h1 class="doc-title">ATTESTATION DE REUSSITE SOUS RESERVE</h1>

    <!-- TEXTE PRINCIPAL -->
    <div class="doc-body">
      <p>
        Je soussigné <span class="bold">M. Amine ZNIBER</span> – Directeur général de IDG – Maroc YNOV CAMPUS, sise au 8, rue ibnou khatima – Quartier des Hôpitaux – Casablanca, atteste par la présente que :
      </p>

      <p>
        ${genrePrefix} <span class="bold">${studentDisplay}</span>, ${bornWord} le <span class="bold">${dateOfBirth}</span> à <span class="bold">${placeOfBirth}</span>,
      </p>

      <p>
        ${enrolledWord} en ${years.current} année au sein de notre établissement pour l’année universitaire ${anneeUniv} et a obtenu les notes et résultats requis pour le passage en ${years.next} année <span class="bold">sous réserve de valider le stage d’été</span>.
      </p>

      <p>
        Cette attestation est délivrée à ${interestPronom}, à sa demande, pour servir et valoir ce que de droit.
      </p>
    </div>

    <!-- ZONE SIGNATURE -->
    <div class="signature-area">
      <div class="date-line">Fait à Casablanca, ${dateEmission}</div>
      <div class="role-line">Directeur général</div>
      <div class="name-line">Amine ZNIBER</div>
    </div>
  </div>

  <!-- PIED DE PAGE OFFICIEL -->
  <div class="doc-footer">
    <div class="doc-footer-left">
      <div class="doc-footer-brand">IDG Maroc – YNOV CAMPUS</div>
      <div class="doc-footer-legal">
        <div>Société Anonyme au capital de 6.400.000 DH – 8, Rue Ibnou Khatima – Casablanca</div>
        <div>CNSS : 7164833 – IF : 1023591 – RC : 144155 – Patente : 36330905 – ICE : 001645521000037</div>
      </div>
      <div class="doc-footer-notice">
        Ce document est la propriété exclusive de la société IDG et ne peut être diffusé sans accord préalable
      </div>
    </div>

    <div class="doc-footer-right">
      <div class="logo-footer">
        <div class="maroc-sm">MAROC</div>
        <div class="ynov-sm">ynov</div>
        <div class="campus-sm">CAMPUS</div>
      </div>
      <div>IDG, représentant de la</div>
      <div>Marque YNOV CAMPUS</div>
      <div>au Maroc</div>
    </div>
  </div>

</body>
</html>`;
}

/**
 * Dispatcher vers la bonne attestation de réussite (avec ou sans réserve)
 */
export function buildAttestationReussiteHTML(request) {
  if (isAttestationReussiteSousReserve(request)) {
    return buildAttestationReussiteSousReserveHTML(request);
  }
  return buildAttestationReussiteSimpleHTML(request);
}

/**
 * 3. CERTIFICAT DE SCOLARITE (Modèle officiel)
 */
export function buildCertificatScolariteHTML(request) {
  const student = request?.studentName || request?.requesterName || '';
  const genderRaw = String(request?.genre || request?.gender || '').toLowerCase().trim();

  const isFemale = genderRaw === 'femme' || genderRaw === 'f' || genderRaw === 'female';
  const isMale = genderRaw === 'homme' || genderRaw === 'm' || genderRaw === 'male';

  const genrePrefix = isFemale ? "L'étudiante" : isMale ? "L'étudiant" : "L'étudiant(e)";
  const bornWord = isFemale ? 'née' : isMale ? 'né' : 'né(e)';
  const enrolledWord = isFemale ? 'Est inscrite' : isMale ? 'Est inscrit' : 'Est inscrit(e)';
  const interestPronom = isFemale ? "l'intéressée" : isMale ? "l'intéressé" : "l'intéressé(e)";

  const dateOfBirth = formatDateFR(request?.dateOfBirth) || '../../..';
  const placeOfBirth = request?.placeOfBirth || '.....';
  const studentDisplay = student ? student : '.....';

  const years = getYearsFromClass(request?.className || request?.department || request?.class);
  const anneeAcad = request?.academicYear || '2025-2026';

  const dateEmission = formatDateFR(new Date()) ||
    new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>CERTIFICAT DE SCOLARITE</title>
<style>
${OFFICIAL_DOC_CSS}
</style>
</head>
<body>

  <div class="content-wrap">
    <!-- LOGO OFFICIEL EN TÊTE HAUT GAUCHE -->
    <div class="logo-top">
      <div class="maroc">MAROC</div>
      <div class="ynov">ynov</div>
      <div class="campus">CAMPUS</div>
    </div>

    <!-- TITRE OFFICIEL -->
    <h1 class="doc-title">CERTIFICAT DE SCOLARITE</h1>

    <!-- TEXTE PRINCIPAL -->
    <div class="doc-body">
      <p>
        Je soussigné <span class="bold">M. Amine ZNIBER</span> – Directeur Général de IDG – YNOV CAMPUS, sise au 8, rue Ibnou Khatima – Quartier des Hôpitaux – Casablanca, atteste par la présente que :
      </p>

      <p>
        ${genrePrefix} <span class="bold">${studentDisplay}</span>, ${bornWord} le <span class="bold">${dateOfBirth}</span> à <span class="bold">${placeOfBirth}</span>,
      </p>

      <p>
        ${enrolledWord} en ${years.current} année au sein de notre établissement pour l'année académique ${anneeAcad}.
      </p>

      <p>
        Cette attestation est délivrée à ${interestPronom}, à sa demande, pour servir et valoir ce que de droit.
      </p>
    </div>

    <!-- ZONE SIGNATURE -->
    <div class="signature-area">
      <div class="date-line">Fait à Casablanca, le ${dateEmission}</div>
      <div class="role-line">DIRECTEUR GENERAL</div>
      <div class="name-line">Amine ZNIBER</div>
    </div>
  </div>

  <!-- PIED DE PAGE OFFICIEL -->
  <div class="doc-footer">
    <div class="doc-footer-left">
      <div class="doc-footer-brand">IDG Maroc – YNOV CAMPUS</div>
      <div class="doc-footer-legal">
        <div>Société Anonyme au capital de 6.400.000 DH – 8, Rue Ibnou Khatima – Casablanca</div>
        <div>CNSS : 7164833 – IF : 1023591 – RC : 144155 – Patente : 36330905 – ICE : 001645521000037</div>
      </div>
      <div class="doc-footer-notice">
        Ce document est la propriété exclusive de la société IDG et ne peut être diffusé sans accord préalable
      </div>
    </div>

    <div class="doc-footer-right">
      <div class="logo-footer">
        <div class="maroc-sm">MAROC</div>
        <div class="ynov-sm">ynov</div>
        <div class="campus-sm">CAMPUS</div>
      </div>
      <div>IDG, représentant de la</div>
      <div>Marque YNOV CAMPUS</div>
      <div>au Maroc</div>
    </div>
  </div>

</body>
</html>`;
}

/**
 * Routeur principal vers le bon gabarit HTML officiel
 */
export function buildOfficialDocumentHTML(request) {
  if (isCertificatScolarite(request)) {
    return buildCertificatScolariteHTML(request);
  }
  if (isAttestationReussiteSousReserve(request)) {
    return buildAttestationReussiteSousReserveHTML(request);
  }
  if (isAttestationReussite(request)) {
    return buildAttestationReussiteSimpleHTML(request);
  }
  return null;
}

/**
 * Générateur pour les documents administratifs génériques texte
 */
export function buildGenericDocument(request) {
  const type = request?.type || request?.documentType || 'Document administratif';
  const student = request?.studentName || request?.requesterName || 'Étudiant';
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const id = request?.id || 'DOC-000';

  return `══════════════════════════════════════════════
         YNOV – CAMPUS ADMINISTRATIF
         ${type.toUpperCase()}
══════════════════════════════════════════════

N° dossier : ${id}
Date d'émission : ${date}

Étudiant(e) : ${student}
E-mail : ${request?.requesterEmail || request?.studentEmail || '—'}

──────────────────────────────────────────────
Il est certifié par la présente que
${student} est bien inscrit(e) à YNOV et a
sollicité le document suivant :

  « ${type} »

Ce document a été validé par le service
administratif d'YNOV et est officiel.
──────────────────────────────────────────────

Fait à Casablanca, le ${date}

[Signature — Amine ZNIBER, Directeur général]

══════════════════════════════════════════════
  Ce document est généré automatiquement.
══════════════════════════════════════════════`;
}

/**
 * Déclenche l'impression directe via une iframe isolée
 * permettant d'imprimer ou d'enregistrer au format PDF.
 */
export function printHtmlDocument(htmlContent) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow.print();
    } catch (_) {}
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  }, 400);
}
