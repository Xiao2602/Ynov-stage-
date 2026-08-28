import { describe, it, before } from "node:test";
import assert from "node:assert";

const BASE_URL = process.env.API_URL || "http://localhost:5001/api";

function generateMockToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({
    iss: "https://securetoken.google.com/backend-91067",
    aud: "backend-91067",
    auth_time: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payload
  })).toString("base64url");
  return `${header}.${body}.mock_signature`;
}

function createValidPdfBuffer(title = "Document Test") {
  return Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n` +
    `4 0 obj\n<< /Length 20 >>\nstream\nBT /F1 12 Tf (${title}) Tj ET\nendstream\nendobj\n` +
    `xref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n` +
    `0000000115 00000 n \n0000000185 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\n` +
    `startxref\n270\n%%EOF`
  );
}

function createValidJpegBuffer() {
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const footer = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([header, Buffer.alloc(100, 0x12), footer]);
}

describe("🧪 SUITE DE TESTS : Module Documents (Backend 1)", () => {
  const studentUid = "test_student_uid_123";
  const parentUid = "test_parent_uid_456";
  const otherStudentUid = "test_other_student_789";

  let studentToken = "";
  let parentToken = "";
  let otherStudentToken = "";

  let testPdfDocId = "";
  let testJpegDocId = "";

  before(async () => {
    // Essayer de se connecter via auth si dispo, sinon utiliser un mock token
    try {
      const studentRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "etudiant@ynov.com", password: "StudentPassword123!" })
      });
      const studentData = await studentRes.json();
      if (studentRes.status === 200 && studentData.data?.token) {
        studentToken = studentData.data.token;
      }
    } catch (e) {}

    if (!studentToken) {
      studentToken = generateMockToken({
        uid: studentUid,
        user_id: studentUid,
        email: "etudiant@ynov.com",
        role: "student"
      });
    }

    parentToken = generateMockToken({
      uid: parentUid,
      user_id: parentUid,
      email: "parent@ynov.com",
      role: "parent",
      childrenUids: [studentUid, "WSNKoWoLQgRCpp43tfQDx9sVrOy2"]
    });

    otherStudentToken = generateMockToken({
      uid: otherStudentUid,
      user_id: otherStudentUid,
      email: "autre.etudiant@ynov.com",
      role: "student"
    });
  });

  /*
  |--------------------------------------------------------------------------
  | 1. UPLOAD PDF & JPEG
  |--------------------------------------------------------------------------
  */

  it("✅ 1. Upload d'un document PDF valide (Quarantaine -> Validation -> Stockage local)", async () => {
    const form = new FormData();
    const pdfBlob = new Blob([createValidPdfBuffer("Attestation")], { type: "application/pdf" });
    form.append("document", pdfBlob, "attestation_scolarite.pdf");
    form.append("category", "attestation_scolarite");

    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: form
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.ok(data.document.id, "L'ID du document doit être retourné");
    assert.strictEqual(data.document.category, "attestation_scolarite");
    assert.strictEqual(data.document.mimeType, "application/pdf");
    testPdfDocId = data.document.id;
  });

  it("✅ 2. Upload d'une image JPEG valide", async () => {
    const form = new FormData();
    const jpegBlob = new Blob([createValidJpegBuffer()], { type: "image/jpeg" });
    form.append("file", jpegBlob, "photo_justificatif.jpg");
    form.append("category", "justificatif_absence");

    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: form
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.document.mimeType, "image/jpeg");
    testJpegDocId = data.document.id;
  });

  /*
  |--------------------------------------------------------------------------
  | 2. VALIDATION FICHIER TROP VOLUMINEUX OU INVALIDE
  |--------------------------------------------------------------------------
  */

  it("❌ 3. Rejet d'un fichier trop volumineux (> 5 Mo)", async () => {
    const form = new FormData();
    const largeBlob = new Blob([Buffer.alloc(6 * 1024 * 1024, 0x41)], { type: "application/pdf" });
    form.append("document", largeBlob, "gros_fichier.pdf");
    form.append("category", "autre");

    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: form
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.error.toLowerCase().includes("volumineux") || data.error.includes("5 Mo"));
  });

  it("❌ 4. Rejet d'un faux fichier / corrompu / format non autorisé", async () => {
    const form = new FormData();
    const fakePdfBlob = new Blob(["CECI_N_EST_PAS_UN_PDF"], { type: "application/pdf" });
    form.append("document", fakePdfBlob, "faux_document.pdf");
    form.append("category", "autre");

    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: form
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
  });

  /*
  |--------------------------------------------------------------------------
  | 3. CONTRÔLE D'ACCÈS / SÉCURITÉ CROSS-USER
  |--------------------------------------------------------------------------
  */

  it("🔒 5. Refus d'accès à un document d'un autre utilisateur", async () => {
    const res = await fetch(`${BASE_URL}/documents/${testPdfDocId}`, {
      headers: { Authorization: `Bearer ${otherStudentToken}` }
    });
    const data = await res.json();

    assert.ok(res.status === 404 || res.status === 403);
    assert.strictEqual(data.success, false);
  });

  /*
  |--------------------------------------------------------------------------
  | 4. DROITS PARENT / ENFANT
  |--------------------------------------------------------------------------
  */

  it("👨‍👦 6. Consultation par le compte Parent des documents de son enfant", async () => {
    const res = await fetch(`${BASE_URL}/documents/my`, {
      headers: { Authorization: `Bearer ${parentToken}` }
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.some(d => d.id === testPdfDocId));
  });

  /*
  |--------------------------------------------------------------------------
  | 5. CONSULTATION (VIEW) & TÉLÉCHARGEMENT (DOWNLOAD)
  |--------------------------------------------------------------------------
  */

  it("👁️ 7. Consultation en ligne (GET /:id/view)", async () => {
    const res = await fetch(`${BASE_URL}/documents/${testPdfDocId}/view`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get("content-type")?.includes("pdf"));
    assert.ok(res.headers.get("content-disposition")?.includes("inline"));
  });

  it("📥 8. Téléchargement direct (GET /:id/download)", async () => {
    const res = await fetch(`${BASE_URL}/documents/${testPdfDocId}/download`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get("content-disposition")?.includes("attachment"));
  });

  /*
  |--------------------------------------------------------------------------
  | 6. ARCHIVAGE & DÉSARCHIVAGE
  |--------------------------------------------------------------------------
  */

  it("📦 9. Archivage du document (PATCH /:id/archive)", async () => {
    const res = await fetch(`${BASE_URL}/documents/${testPdfDocId}/archive`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    // Vérification filtre archivé
    const listRes = await fetch(`${BASE_URL}/documents/my?archived=true`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const listData = await listRes.json();
    assert.ok(listData.data.some(d => d.id === testPdfDocId));
  });

  it("♻️ 10. Désarchivage / Restauration (PATCH /:id/unarchive)", async () => {
    const res = await fetch(`${BASE_URL}/documents/${testPdfDocId}/unarchive`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    // Vérification filtre actif
    const listRes = await fetch(`${BASE_URL}/documents/my?archived=false`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const listData = await listRes.json();
    assert.ok(listData.data.some(d => d.id === testPdfDocId));
  });

  /*
  |--------------------------------------------------------------------------
  | 7. PAGINATION & FILTRES DE DATES ET DE CATÉGORIE
  |--------------------------------------------------------------------------
  */

  it("📄 11. Pagination et filtres de recherche et de dates", async () => {
    const res = await fetch(`${BASE_URL}/documents/my?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.length, 1);
    assert.ok(data.pagination, "L'objet pagination doit être présent");
    assert.strictEqual(data.pagination.page, 1);
    assert.strictEqual(data.pagination.limit, 1);
    assert.ok(data.pagination.total >= 1);

    // Filtre de catégorie
    const catRes = await fetch(`${BASE_URL}/documents/my?category=attestation_scolarite`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const catData = await catRes.json();
    assert.ok(catData.data.every(d => d.category === "attestation_scolarite"));
  });

  /*
  |--------------------------------------------------------------------------
  | 8. SUPPRESSION
  |--------------------------------------------------------------------------
  */

  it("🗑️ 12. Suppression d'un document (DELETE /:id)", async () => {
    const res = await fetch(`${BASE_URL}/documents/${testJpegDocId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    // Vérification que le document n'existe plus
    const checkRes = await fetch(`${BASE_URL}/documents/${testJpegDocId}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(checkRes.status, 404);
  });
});
