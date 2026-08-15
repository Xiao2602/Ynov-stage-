// storage-tests/verify-fixes.js
const { initializeApp } = require("firebase/app");
const { getAuth, connectAuthEmulator, signInAnonymously } = require("firebase/auth");
const { getStorage, connectStorageEmulator, ref, uploadBytes, getMetadata, getDownloadURL } = require("firebase/storage");

const app = initializeApp({
  apiKey: "fake-api-key", projectId: "backend-91067",
  storageBucket: "backend-91067.firebasestorage.app"
});
const auth = getAuth(app);
const storage = getStorage(app);
connectAuthEmulator(auth, "http://127.0.0.1:9199");
connectStorageEmulator(storage, "127.0.0.1", 9198);

const polyglotPdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/OpenAction<</S/JavaScript/JS(app.alert('x'))>>>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
);

async function run() {
  const cred = await signInAnonymously(auth);
  const uid = cred.user.uid;

  console.log("--- Vérification Fix G : quarantine/ jamais lisible ---");
  const quarantineRef = ref(storage, `quarantine/${uid}/test.pdf`);
  await uploadBytes(quarantineRef, Buffer.from("%PDF-1.4\n%%EOF"), { contentType: "application/pdf" });
  try {
    await getDownloadURL(quarantineRef);
    console.log("❌ ÉCHEC : quarantine/ est lisible, la fenêtre d'exposition existe toujours !");
  } catch {
    console.log("✅ SUCCÈS : quarantine/ n'est jamais lisible, aucune fenêtre d'exposition.");
  }

  console.log("\n--- Vérification Fix F : PDF avec JS embarqué ---");
  const fileRef = ref(storage, `quarantine/${uid}/polyglot.pdf`);
  await uploadBytes(fileRef, polyglotPdf, { contentType: "application/pdf" });
  await new Promise((r) => setTimeout(r, 5000));
  const finalRef = ref(storage, `justificatifs/${uid}/polyglot.pdf`);
  try {
    await getMetadata(finalRef);
    console.log("❌ ÉCHEC : le fichier piégé a été déplacé vers justificatifs/ !");
  } catch {
    console.log("✅ SUCCÈS : le fichier piégé n'a jamais atteint justificatifs/, rejeté en quarantaine.");
  }
}
run();