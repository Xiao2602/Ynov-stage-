import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

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

describe("🧪 SUITE DE TESTS : Module Demandes de Documents (Backend 2)", async () => {
  const studentUid = "test_student_req_123";
  const adminUid = "test_admin_req_456";
  const parentUid = "test_parent_req_789";
  const otherStudentUid = "test_other_student_999";

  let studentToken = "";
  let adminToken = "";
  let parentToken = "";
  let otherStudentToken = "";

  let createdRequestId = "";
  let cancelTestRequestId = "";

  before(async () => {
    studentToken = generateMockToken({
      uid: studentUid,
      user_id: studentUid,
      email: "etudiant.test@ynov.com",
      role: "student",
      name: "Étudiant Test"
    });

    adminToken = generateMockToken({
      uid: adminUid,
      user_id: adminUid,
      email: "admin.test@ynov.com",
      role: "admin",
      name: "Administrateur Test"
    });

    parentToken = generateMockToken({
      uid: parentUid,
      user_id: parentUid,
      email: "parent.test@ynov.com",
      role: "parent",
      childrenUids: [studentUid],
      name: "Parent Test"
    });

    otherStudentToken = generateMockToken({
      uid: otherStudentUid,
      user_id: otherStudentUid,
      email: "autre.etudiant@ynov.com",
      role: "student",
      name: "Autre Étudiant"
    });
  });

  test("✅ 1. Créer une demande de document (POST /api/document-requests)", async () => {
    const res = await fetch(`${BASE_URL}/document-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        type: "Attestation de scolarité",
        message: "Bonjour, j'ai besoin d'une attestation de scolarité pour mon dossier de logement. Merci.",
        urgency: "normal"
      })
    });

    assert.equal(res.status, 201, `Status attendu: 201, reçu: ${res.status}`);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.id, "L'ID de la demande doit être présent");
    assert.equal(body.data.type, "Attestation de scolarité");
    assert.equal(body.data.status, "pending");

    createdRequestId = body.data.id;
  });

  test("❌ 2. Rejet de création avec type manquant ou message trop court", async () => {
    const res = await fetch(`${BASE_URL}/document-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        type: "",
        message: "Hi"
      })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test("📄 3. Lister ses demandes (GET /api/document-requests/my)", async () => {
    const res = await fetch(`${BASE_URL}/document-requests/my`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data), "data doit être une liste");
    assert.ok(body.data.length >= 1, "La liste doit contenir au moins la demande créée");
    assert.ok(body.pagination, "La pagination doit être présente");

    const found = body.data.find(r => r.id === createdRequestId);
    assert.ok(found, "La demande créée doit figurer dans les demandes de l'étudiant");
  });

  test("👨‍👦 4. Consultation par le parent des demandes de son enfant lié (GET /api/document-requests/my)", async () => {
    const res = await fetch(`${BASE_URL}/document-requests/my`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${parentToken}`
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    const found = body.data.find(r => r.id === createdRequestId);
    assert.ok(found, "Le parent doit voir la demande de son enfant lié");
  });

  test("🔍 5. Consulter le détail d'une demande (GET /api/document-requests/:id)", async () => {
    const res = await fetch(`${BASE_URL}/document-requests/${createdRequestId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, createdRequestId);
    assert.equal(body.data.type, "Attestation de scolarité");
  });

  test("🔒 6. Refus de consultation d'une demande d'un autre utilisateur", async () => {
    const res = await fetch(`${BASE_URL}/document-requests/${createdRequestId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${otherStudentToken}`
      }
    });

    assert.equal(res.status, 403, `Attendu 403 Forbidden, reçu: ${res.status}`);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test("🚫 7. Accès interdit à la file d'attente administrative pour un étudiant", async () => {
    const res = await fetch(`${BASE_URL}/document-requests/queue`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });

    assert.equal(res.status, 403, `Attendu 403 Forbidden, reçu: ${res.status}`);
  });

  test("📋 8. Consultation de la file administrative par l'admin (GET /api/document-requests/queue)", async () => {
    const res = await fetch(`${BASE_URL}/document-requests/queue`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    const found = body.data.find(r => r.id === createdRequestId);
    assert.ok(found, "La demande doit être présente dans la file administrative");
  });

  test("👤 9. Affecter une demande à un agent (PATCH /api/document-requests/:id/assign)", async () => {
    const res = await fetch(`${BASE_URL}/document-requests/${createdRequestId}/assign`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assignedTo: "agent_admin_01",
        assignedToName: "Sophie Martin (RH)"
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "in_progress");
    assert.equal(body.data.assignedTo, "agent_admin_01");
    assert.equal(body.data.assignedToName, "Sophie Martin (RH)");
  });

  test("📎 10. Associer un document à la demande (PATCH /api/document-requests/:id/attach-document)", async () => {
    const res = await fetch(`${BASE_URL}/document-requests/${createdRequestId}/attach-document`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        documentId: "doc_attestation_2026",
        documentUrl: "http://localhost:5001/api/documents/doc_attestation_2026/view"
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.documentId, "doc_attestation_2026");
  });

  test("✅ 11. Approuver une demande (PATCH /api/document-requests/:id/approve)", async () => {
    const res = await fetch(`${BASE_URL}/document-requests/${createdRequestId}/approve`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        documentId: "doc_attestation_2026",
        note: "Attestation générée et signée par le secrétariat."
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "approved");
    assert.equal(body.data.statusLabel, "Disponible");
  });

  test("❌ 12. Refuser une demande avec motif (PATCH /api/document-requests/:id/reject)", async () => {
    // Créer une autre demande à rejeter
    const createRes = await fetch(`${BASE_URL}/document-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        type: "Convention de stage",
        message: "Demande de convention pour entreprise X"
      })
    });
    const createBody = await createRes.json();
    const rejectRequestId = createBody.data.id;

    // Tentative sans motif
    const badRes = await fetch(`${BASE_URL}/document-requests/${rejectRequestId}/reject`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ reason: "" })
    });
    assert.equal(badRes.status, 400, "Le refus sans motif doit renvoyer 400");

    // Refus avec motif valide
    const res = await fetch(`${BASE_URL}/document-requests/${rejectRequestId}/reject`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        reason: "Entreprise non agréée pour l'année en cours."
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "rejected");
    assert.equal(body.data.rejectionReason, "Entreprise non agréée pour l'année en cours.");
  });

  test("🚫 13. Annuler une demande par le demandeur (PATCH /api/document-requests/:id/cancel)", async () => {
    // Créer une demande à annuler
    const createRes = await fetch(`${BASE_URL}/document-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        type: "Relevé de notes",
        message: "Demande de relevé semestre 1"
      })
    });
    const createBody = await createRes.json();
    cancelTestRequestId = createBody.data.id;

    const res = await fetch(`${BASE_URL}/document-requests/${cancelTestRequestId}/cancel`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "cancelled");
  });
});
