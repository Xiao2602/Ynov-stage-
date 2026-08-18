import { validateUploadedFile } from "../Validators/documentValidator.js";
import { uploadDocumentService } from "../Services/documentService.js";

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
