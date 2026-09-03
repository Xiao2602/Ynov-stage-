import { existsSync, unlinkSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import PDFDocument from "pdfkit";
import { adminDb } from "../../firebaseAdmin.js";
import { validateUploadedFile } from "../Validators/documentValidator.js";
import { uploadDocumentService } from "../Services/documentService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BACKEND_DIR = resolve(__dirname, "../..");
const UPLOADS_DIR = resolve(BACKEND_DIR, "uploads");

function getUploadedFile(req) {
  return req.file || req.files?.document?.[0] || req.files?.file?.[0];
}

async function canAccessUserDocuments(req, userId) {
  if (req.user.uid === userId) return true;
  if (['admin', 'employee', 'manager', 'rh'].includes(req.user.role)) return true;
  if (req.user.role !== "parent") return false;

  const parentDoc = await adminDb.collection("users").doc(req.user.uid).get();
  return parentDoc.exists && (parentDoc.data().childrenUids || []).includes(userId);
}

async function getAccessibleDocument(req, id) {
  const snapshot = await adminDb.collection("documents").doc(id).get();
  if (!snapshot.exists) return { error: "Document introuvable.", status: 404 };

  const document = { id: snapshot.id, ...snapshot.data() };
  if (!(await canAccessUserDocuments(req, document.uid))) {
    return { error: "Vous n’êtes pas autorisé à accéder à ce document.", status: 403 };
  }
  return { document };
}

export async function handleUploadDocument(req, res) {
  const file = getUploadedFile(req);
  const validation = validateUploadedFile(file);
  if (!validation.valid) return res.status(400).json({ success: false, error: validation.error });
  if (req.user.role === "parent") return res.status(403).json({ success: false, error: "Un parent ne peut pas importer de document au nom de son enfant." });

  const result = await uploadDocumentService(file, req.user.uid, req.body?.category);
  return res.status(result.success ? 201 : 400).json(result);
}

const generatedDocumentTypes = {
  attestation_reussite: 'Attestation de réussite',
  attestation_sous_reserve: 'Attestation de réussite sous réserve',
  certificat_scolarite: 'Certificat de scolarité',
};

function textValue(value, fallback = '', maxLength = 500) {
  const normalized = String(value ?? '').trim();
  return (normalized || fallback).slice(0, maxLength);
}

function formatDocumentDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toLocaleDateString('fr-FR') : date.toLocaleDateString('fr-FR');
}

function createGeneratedPdf({ title, type, fields }) {
  return new Promise((resolvePdf, rejectPdf) => {
    const pdf = new PDFDocument({ margin: 56 });
    const chunks = [];
    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('error', rejectPdf);
    pdf.on('end', () => resolvePdf(Buffer.concat(chunks)));
    const studentName = textValue(fields.studentName, 'Étudiant');
    const studentEmail = textValue(fields.studentEmail, 'Non renseignée');
    const program = textValue(fields.program, 'Formation non renseignée');
    const className = textValue(fields.className);
    const academicYear = textValue(fields.academicYear, 'Année académique non renseignée');
    const issuedAt = formatDocumentDate(fields.issuedAt);
    const place = textValue(fields.place, 'Casablanca');
    const signatoryName = textValue(fields.signatoryName, 'Le service administratif');
    const reference = textValue(fields.reference);

    pdf.fontSize(20).fillColor('#0f172a').text('Maroc Ynov Campus', { align: 'center' });
    if (reference) pdf.fontSize(9).fillColor('#64748b').text(`Référence : ${reference}`, { align: 'right' });
    pdf.moveDown(2);
    pdf.fontSize(18).text(title.toUpperCase(), { align: 'center' });
    pdf.moveDown(2);
    pdf.fontSize(12).fillColor('#334155').text('Le service administratif de Maroc Ynov Campus atteste que :');
    pdf.moveDown();
    pdf.fontSize(16).fillColor('#0f172a').text(studentName, { align: 'center' });
    pdf.moveDown();
    pdf.fontSize(12).fillColor('#334155').text(`Adresse e-mail : ${studentEmail}`);
    pdf.text(`Formation : ${program}`);
    if (className) pdf.text(`Classe / promotion : ${className}`);
    pdf.text(`Année académique : ${academicYear}`);
    pdf.moveDown(2);
    if (type === 'attestation_reussite') {
      pdf.text(`a validé avec succès la formation indiquée ci-dessus au titre de l’année académique ${academicYear}.`, { align: 'justify' });
    } else if (type === 'attestation_sous_reserve') {
      const conditions = textValue(fields.conditions, 'la validation des éléments pédagogiques restant à satisfaire.');
      pdf.text(`est admis(e) sous réserve de satisfaire aux conditions suivantes : ${conditions}`, { align: 'justify' });
    } else {
      const studentNumber = textValue(fields.studentNumber);
      pdf.text(`est régulièrement inscrit(e) dans la formation indiquée ci-dessus pour l’année académique ${academicYear}.`, { align: 'justify' });
      if (studentNumber) pdf.moveDown(0.5).text(`Numéro étudiant : ${studentNumber}`);
    }
    pdf.moveDown(3);
    pdf.text(`Fait à ${place}, le ${issuedAt}.`, { align: 'right' });
    pdf.moveDown(2);
    pdf.text(signatoryName, { align: 'right' });
    pdf.end();
  });
}

export async function handleGenerateAdministrativeDocument(req, res) {
  try {
    const { userId, type, fields: submittedFields = {} } = req.body || {};
    const title = generatedDocumentTypes[type];
    if (!userId || !title) return res.status(400).json({ success: false, error: 'Le bénéficiaire et le type de document sont requis.' });

    const userSnapshot = await adminDb.collection('users').doc(userId).get();
    if (!userSnapshot.exists) return res.status(404).json({ success: false, error: 'Bénéficiaire introuvable.' });
    const beneficiary = userSnapshot.data();
    if (beneficiary.role !== 'student') return res.status(400).json({ success: false, error: 'Le bénéficiaire sélectionné doit être un étudiant.' });

    const fields = {
      studentName: textValue(submittedFields.studentName, beneficiary.displayName || beneficiary.name || beneficiary.email || 'Étudiant'),
      studentEmail: textValue(submittedFields.studentEmail, beneficiary.email || 'Non renseignée'),
      program: textValue(submittedFields.program, beneficiary.program || beneficiary.department || beneficiary.className || 'Formation non renseignée'),
      className: textValue(submittedFields.className, beneficiary.className || beneficiary.program || beneficiary.department || ''),
      academicYear: textValue(submittedFields.academicYear, `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`),
      studentNumber: textValue(submittedFields.studentNumber, beneficiary.studentNumber || beneficiary.studentId || beneficiary.registrationNumber || ''),
      issuedAt: textValue(submittedFields.issuedAt, new Date().toISOString().slice(0, 10)),
      place: textValue(submittedFields.place, 'Casablanca'),
      signatoryName: textValue(submittedFields.signatoryName, 'Le service administratif'),
      reference: textValue(submittedFields.reference),
      conditions: textValue(submittedFields.conditions),
    };
    if (!fields.studentName || !fields.program || !fields.academicYear || !fields.place || !fields.signatoryName) {
      return res.status(400).json({ success: false, error: 'Les informations obligatoires du document sont incomplètes.' });
    }
    if (type === 'attestation_sous_reserve' && !fields.conditions) {
      return res.status(400).json({ success: false, error: 'Les conditions à remplir sont requises pour une attestation sous réserve.' });
    }

    const pdfBuffer = await createGeneratedPdf({ title, type, fields });
    const documentRef = adminDb.collection('documents').doc();
    const filename = `${documentRef.id}-${Date.now()}_${type}.pdf`;
    const directory = join(UPLOADS_DIR, 'generated', userId);
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, filename), pdfBuffer);
    const storagePath = `/uploads/generated/${userId}/${filename}`;
    const port = process.env.PORT || 5000;
    const document = {
      id: documentRef.id,
      uid: userId,
      originalName: `${title}.pdf`,
      filename,
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
      category: type,
      status: 'validated',
      storageArea: 'generated',
      storagePath,
      url: `http://localhost:${port}${storagePath}`,
      archived: false,
      generationData: fields,
      generatedBy: req.user.uid,
      generatedByName: req.user.displayName || req.user.email || 'Administration',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await documentRef.set(document);
    return res.status(201).json({ success: true, document: { ...document, createdAt: new Date().toISOString() } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'Impossible de générer le document.' });
  }
}

export async function handleGetMyDocuments(req, res) {
  try {
    const requestedUid = req.query.childUid;
    const userId = requestedUid || req.user.uid;
    if (!(await canAccessUserDocuments(req, userId))) {
      return res.status(403).json({ success: false, error: "Vous n’êtes pas autorisé à consulter les documents de cet enfant." });
    }

    const snapshot = await adminDb.collection("documents").where("uid", "==", userId).get();
    const { search = "", category, archived } = req.query;
    const searchTerm = String(search).trim().toLowerCase();
    const documents = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((document) => !category || document.category === category)
      .filter((document) => archived === undefined || document.archived === (archived === "true"))
      .filter((document) => !searchTerm || [document.originalName, document.category, document.mimeType].filter(Boolean).join(" ").toLowerCase().includes(searchTerm))
      .sort((first, second) => {
        const firstDate = first.createdAt?.toDate?.() || new Date(first.createdAt || 0);
        const secondDate = second.createdAt?.toDate?.() || new Date(second.createdAt || 0);
        return secondDate - firstDate;
      });

    return res.status(200).json({ success: true, documents });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Impossible de charger les documents." });
  }
}

export async function handleGetDocumentsDashboard(req, res) {
  try {
    const isStaff = ['admin', 'employee', 'manager', 'rh'].includes(req.user.role);
    const requestedUid = req.query.childUid;
    let documents = [];

    if (isStaff) {
      const snapshot = await adminDb.collection('documents').get();
      documents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      const userId = requestedUid || req.user.uid;
      if (!(await canAccessUserDocuments(req, userId))) {
        return res.status(403).json({ success: false, error: 'Vous n’êtes pas autorisé à consulter les documents de cet enfant.' });
      }
      const snapshot = await adminDb.collection('documents').where('uid', '==', userId).get();
      documents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    const userIds = [...new Set(documents.map((document) => document.uid).filter(Boolean))];
    const users = await Promise.all(userIds.map(async (uid) => {
      const user = await adminDb.collection('users').doc(uid).get();
      return [uid, user.exists ? user.data() : null];
    }));
    const usersById = new Map(users);
    const sortedDocuments = documents
      .map((document) => ({
        ...document,
        userName: usersById.get(document.uid)?.displayName || usersById.get(document.uid)?.name || usersById.get(document.uid)?.email || document.userName || document.userEmail,
      }))
      .sort((first, second) => {
        const firstDate = first.createdAt?.toDate?.() || new Date(first.createdAt || 0);
        const secondDate = second.createdAt?.toDate?.() || new Date(second.createdAt || 0);
        return secondDate - firstDate;
      });

    return res.status(200).json({ success: true, documents: sortedDocuments });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'Impossible de charger le tableau de bord des documents.' });
  }
}

export async function handleGetDocument(req, res) {
  try {
    const result = await getAccessibleDocument(req, req.params.id);
    if (result.error) return res.status(result.status).json({ success: false, error: result.error });
    return res.status(200).json({ success: true, document: result.document });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleViewDocument(req, res) {
  try {
    const result = await getAccessibleDocument(req, req.params.id);
    if (result.error) return res.status(result.status).json({ success: false, error: result.error });

    const storagePath = String(result.document.storagePath || "").replace(/^[\\/]+/, "");
    const filePath = resolve(BACKEND_DIR, storagePath);
    if (!storagePath || !filePath.startsWith(`${UPLOADS_DIR}\\`) || !existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Fichier introuvable." });
    }
    return res.type(result.document.mimeType || "application/octet-stream").sendFile(filePath);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function updateArchiveState(req, res, archived) {
  try {
    const result = await getAccessibleDocument(req, req.params.id);
    if (result.error) return res.status(result.status).json({ success: false, error: result.error });
    if (result.document.uid !== req.user.uid) return res.status(403).json({ success: false, error: "Seul le propriétaire peut modifier ce document." });

    await adminDb.collection("documents").doc(req.params.id).update({ archived, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export function handleArchiveDocument(req, res) {
  return updateArchiveState(req, res, true);
}

export function handleUnarchiveDocument(req, res) {
  return updateArchiveState(req, res, false);
}

export async function handleDeleteDocument(req, res) {
  try {
    const result = await getAccessibleDocument(req, req.params.id);
    if (result.error) return res.status(result.status).json({ success: false, error: result.error });
    if (result.document.uid !== req.user.uid) return res.status(403).json({ success: false, error: "Seul le propriétaire peut supprimer ce document." });

    const storagePath = String(result.document.storagePath || "").replace(/^[\\/]+/, "");
    const filePath = resolve(BACKEND_DIR, storagePath);
    if (storagePath && filePath.startsWith(`${UPLOADS_DIR}\\`) && existsSync(filePath)) unlinkSync(filePath);
    await adminDb.collection("documents").doc(req.params.id).delete();
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
