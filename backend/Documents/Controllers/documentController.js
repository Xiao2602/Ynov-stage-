import { validateUploadedFile } from "../Validators/documentValidator.js";
import { uploadDocumentService } from "../Services/documentService.js";

export async function handleUploadDocument(req, res) {
  console.log("📥 [handleUploadDocument] Requête reçue");
  console.log("👤 Utilisateur:", req.user?.uid);
  console.log("📦 Fichier:", req.file?.originalname);

  const validation = validateUploadedFile(req.file);
  if (!validation.valid) {
    console.log("❌ Validation échouée:", validation.error);
    return res.status(400).json({ success: false, error: validation.error });
  }

  const result = await uploadDocumentService(req.file, req.user.uid);
  console.log("📤 Résultat upload:", result);

  if (result.success) {
    return res.status(201).json(result);
  } else {
    return res.status(400).json(result);
  }
}