const { initializeApp } = require("firebase/app");
const { getAuth, connectAuthEmulator, signInAnonymously } = require("firebase/auth");
const { getStorage, connectStorageEmulator, ref, uploadBytes, getMetadata } = require("firebase/storage");

const app = initializeApp({
  apiKey: "fake-api-key",
  projectId: "backend-91067",
  storageBucket: "backend-91067.firebasestorage.app"
});
const auth = getAuth(app);
const storage = getStorage(app);
connectAuthEmulator(auth, "http://127.0.0.1:9199");
connectStorageEmulator(storage, "127.0.0.1", 9198);

// Signature binaire minimale d'un vrai PDF valide (%PDF-1.4 ... %%EOF)
const realPdfBuffer = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
);

async function run() {
  const cred = await signInAnonymously(auth);
  const uid = cred.user.uid;
  const fileRef = ref(storage, `justificatifs/${uid}/vrai-justificatif.pdf`);

  console.log("Upload d'un vrai PDF...");
  await uploadBytes(fileRef, realPdfBuffer, { contentType: "application/pdf" });

  console.log("Attente jusqu'à 15 secondes...");
  let stillExists = false;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      await getMetadata(fileRef);
      stillExists = true;
    } catch (err) {
      console.log(`❌ ÉCHEC : le fichier légitime a été supprimé à tort après ~${i + 1}s (faux positif).`);
      return;
    }
  }
  if (stillExists) {
    console.log("✅ SUCCÈS : le PDF légitime est toujours présent après 15 secondes (aucun faux positif).");
  }
}

run();