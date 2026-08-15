const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const fs = require("fs");

let testEnv;

async function setup() {
  testEnv = await initializeTestEnvironment({
    projectId: "backend-91067",
    storage: {
      rules: fs.readFileSync("../storage.rules", "utf8"),
      host: "127.0.0.1",
      port: 9198
    }
  });
}

async function run() {
  await setup();

  // Contexte : utilisateur authentifié uid = "user123", role employee
  const userCtx = testEnv.authenticatedContext("user123", { role: "employee" });
  const otherUserCtx = testEnv.authenticatedContext("otherUser", { role: "employee" });
  const rhCtx = testEnv.authenticatedContext("rhUser", { role: "rh" });
  const anonCtx = testEnv.unauthenticatedContext();

  const smallPdfBuffer = Buffer.from("Fake PDF content under 5MB");
  const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB, dépasse la limite

  console.log("--- Test 1: upload PDF valide par le propriétaire ---");
  await assertSucceeds(
    userCtx.storage().ref("justificatifs/user123/arret.pdf").put(smallPdfBuffer, { contentType: "application/pdf" })
  );

  console.log("--- Test 2: upload trop volumineux (6MB) ---");
  await assertFails(
    userCtx.storage().ref("justificatifs/user123/gros.pdf").put(bigBuffer, { contentType: "application/pdf" })
  );

  console.log("--- Test 3: upload type non autorisé (exe déguisé en octet-stream) ---");
  await assertFails(
    userCtx.storage().ref("justificatifs/user123/malware.pdf").put(smallPdfBuffer, { contentType: "application/octet-stream" })
  );

  console.log("--- Test 4: upload dans le dossier d'un AUTRE utilisateur ---");
  await assertFails(
    userCtx.storage().ref("justificatifs/otherUser/intrusion.pdf").put(smallPdfBuffer, { contentType: "application/pdf" })
  );

  console.log("--- Test 5: upload sans authentification ---");
  await assertFails(
    anonCtx.storage().ref("justificatifs/user123/anon.pdf").put(smallPdfBuffer, { contentType: "application/pdf" })
  );

  console.log("--- Test 6: lecture par le propriétaire ---");
  await assertSucceeds(userCtx.storage().ref("justificatifs/user123/arret.pdf").getDownloadURL());

  console.log("--- Test 7: lecture par un autre employé (doit échouer) ---");
  await assertFails(otherUserCtx.storage().ref("justificatifs/user123/arret.pdf").getDownloadURL());

  console.log("--- Test 8: lecture par un RH (doit réussir) ---");
  await assertSucceeds(rhCtx.storage().ref("justificatifs/user123/arret.pdf").getDownloadURL());

  console.log("--- Test 9: extension non autorisée (.exe) ---");
  await assertFails(
    userCtx.storage().ref("justificatifs/user123/virus.exe").put(smallPdfBuffer, { contentType: "application/pdf" })
  );

  console.log("--- Test 10: suppression (jamais autorisée) ---");
  await assertFails(userCtx.storage().ref("justificatifs/user123/arret.pdf").delete());

  console.log("\n✅ Tous les tests sont passés avec les résultats attendus.");
  await testEnv.cleanup();
}

run().catch((err) => {
  console.error("❌ Échec d'un test:", err.message);
  process.exit(1);
});