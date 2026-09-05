import admin from 'firebase-admin';
import { adminDb } from '../../firebaseAdmin.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const bucket = process.env.SUPABASE_BUCKET || 'ynov-documents';
const headers = (extra = {}) => ({ apikey: key, Authorization: `Bearer ${key}`, ...extra });

function ensureConfig() {
  if (!url || !key) throw new Error('Configuration Supabase manquante côté serveur.');
}

export async function createDocumentUrl(storagePath) {
  ensureConfig();
  const response = await fetch(`${url}/storage/v1/object/sign/${bucket}/${storagePath}`, {
    method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ expiresIn: 31536000 }),
  });
  if (!response.ok) throw new Error('Impossible de créer le lien sécurisé du document.');
  const data = await response.json();
  return `${url}/storage/v1${data.signedURL}`;
}

export async function storeDocument(buffer, storagePath, mimeType) {
  ensureConfig();
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${storagePath}`, {
    method: 'POST', headers: headers({ 'Content-Type': mimeType, 'x-upsert': 'false' }), body: buffer,
  });
  if (!response.ok) throw new Error('Téléversement Supabase refusé. Vérifiez que le bucket privé ynov-documents existe.');
  return { storagePath, url: await createDocumentUrl(storagePath) };
}

export async function uploadDocumentService(file, userId, category = 'justificatif') {
  try {
    const ref = adminDb.collection('documents').doc();
    const filename = `${ref.id}-${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const stored = await storeDocument(file.buffer, `justificatifs/${userId}/${filename}`, file.mimetype);
    const document = { id: ref.id, uid: userId, originalName: file.originalname, filename, mimeType: file.mimetype, size: file.size, category: category || 'autre', status: 'validated', storageArea: 'supabase', storagePath: stored.storagePath, url: stored.url, archived: false, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    await ref.set(document);
    return { success: true, message: 'Fichier centralisé avec succès.', documentId: ref.id, url: stored.url, document };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function storeGeneratedDocument(buffer, userId, filename) {
  return storeDocument(buffer, `generes/${userId}/${filename}`, 'application/pdf');
}
