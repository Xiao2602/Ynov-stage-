const { initializeApp } = require("firebase/app");
const { getAuth, connectAuthEmulator, signInAnonymously } = require("firebase/auth");
const { getStorage, connectStorageEmulator, ref, uploadBytes } = require("firebase/storage");

const app = initializeApp({
  apiKey: "fake-api-key",
  projectId: "backend-91067",
  storageBucket: "backend-91067.firebasestorage.app"
});
const auth = getAuth(app);
const storage = getStorage(app);
connectAuthEmulator(auth, "http://127.0.0.1:9199");
connectStorageEmulator(storage, "127.0.0.1", 9198);

async function run() {
  const cred = await signInAnonymously(auth);
  const uid = cred.user.uid;
  const fileRef = ref(storage, `justificatifs/${uid}/trop-gros.pdf`);

  const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

  try {
    await uploadBytes(fileRef, bigBuffer, { contentType: "application/pdf" });
    console.log("❌ ÉCHEC : l'upload de 6MB a été accepté alors qu'il devrait être rejeté par storage.rules.");
  } catch (err) {
    console.log("✅ SUCCÈS : l'upload de 6MB a été rejeté immédiatement par storage.rules.");
    console.log("Erreur reçue :", err.code || err.message);
  }
}

run();