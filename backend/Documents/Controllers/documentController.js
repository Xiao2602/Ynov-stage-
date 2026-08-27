import { validateUploadedFile } from "../Validators/documentValidator.js";
import { uploadDocumentService, getMyDocumentsService, getAllDocumentsService } from "../Services/documentService.js";

/**
 * Controller pour gérer le téléversement d'un justificatif (POST /api/documents/upload)
 */
export async function handleUploadDocument(req, res) {
  const validation = validateUploadedFile(req.file);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const result = await uploadDocumentService(req.file, req.user.uid);
  if (result.success) {
    return res.status(201).json(result);
  } else {
    return res.status(400).json(result);
  }
}

/**
 * Controller pour obtenir les documents de l'utilisateur connecté (GET /api/documents/my)
 */
export async function handleGetMyDocuments(req, res) {
  const result = await getMyDocumentsService(req.user.uid);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
}

/**
 * Controller pour obtenir tous les documents (GET /api/documents)
 */
export async function handleGetAllDocuments(req, res) {
  const result = await getAllDocumentsService(req.query);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
}

