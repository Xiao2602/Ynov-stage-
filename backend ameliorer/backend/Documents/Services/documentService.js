import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { adminDb } from "../../firebaseAdmin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dossier racine du stockage local des fichiers téléversés
const UPLOADS_DIR = join(__dirname, "../../uploads");

/**
 * Service pour sauvegarder le fichier justificatif sur le disque local
 * et enregistrer le document de métadonnées dans la collection Firestore 'documents'.
 * 
 * @param {Object} file - Fichier fourni par Multer (buffer, originalname, mimetype, size)
 * @param {string} userId - UID de l'utilisateur ayant soumis le fichier
 * @param {string} [category="justificatif"] - Catégorie du document ("justificatif", "autre", etc.)
 */
export async function uploadDocumentService(file, userId, category = "justificatif") {
  try {
    const timestamp = Date.now();
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const userUploadsFolder = join(UPLOADS_DIR, "justifications", userId);

    // Assurer l'existence du dossier de destination local
    if (!existsSync(userUploadsFolder)) {
      mkdirSync(userUploadsFolder, { recursive: true });
    }

    const docRef = adminDb.collection("documents").doc();
    const documentId = docRef.id;

    const savedFileName = `${documentId}-${timestamp}_${cleanFileName}`;
    const localFilePath = join(userUploadsFolder, savedFileName);

    // 1. Écriture du fichier binaire sur le disque local
    writeFileSync(localFilePath, file.buffer);

    // 2. Génération de l'URL d'accès HTTP locale
    const relativePath = `/uploads/justifications/${userId}/${savedFileName}`;
    const port = process.env.PORT || 5000;
    const publicUrl = `http://localhost:${port}${relativePath}`;

    // 3. Enregistrement des métadonnées dans la collection Firestore 'documents'
    const documentMetadata = {
      id: documentId,
      uid: userId,
      originalName: file.originalname,
      filename: savedFileName,
      mimeType: file.mimetype,
      size: file.size,
      category: category || "autre",
      status: "validated",
      storageArea: "justificatifs",
      storagePath: relativePath,
      url: publicUrl,
      archived: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await docRef.set(documentMetadata);

    return {
      success: true,
      message: "Fichier enregistré avec succès sur le disque local et métadonnées créées dans Firestore.",
      documentId,
      url: publicUrl,
      document: {
        ...documentMetadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    return { success: false, error: "Erreur lors de l'enregistrement local du fichier : " + error.message };
  }
}
