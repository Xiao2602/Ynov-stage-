const { initializeApp } = require("firebase/app");
const { getAuth, connectAuthEmulator, signInAnonymously } = require("firebase/auth");
const { getStorage, connectStorageEmulator, ref, uploadBytes, getMetadata } = require("firebase/storage");
const fs = require("fs");

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

  const fileBuffer = fs.readFileSync("./malware-deguise.pdf");
  const fileRef = ref(storage, `justificatifs/${uid}/malware-deguise.pdf`);

  console.log("Upload en cours (déclaré comme application/pdf, contenu réel = .exe)...");
  await uploadBytes(fileRef, fileBuffer, { contentType: "application/pdf" });
  console.log("Upload accepté par storage.rules (comportement attendu, Content-Type déclaré était correct).");

  console.log("Attente jusqu'à 15 secondes pour laisser la Cloud Function s'exécuter...");

  let deleted = false;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      await getMetadata(fileRef);
      // fichier encore présent, on continue d'attendre
    } catch (err) {
      deleted = true;
      console.log(`✅ SUCCÈS : le fichier a été supprimé automatiquement après ~${i + 1} seconde(s).`);
      break;
    }
  }

  if (!deleted) {
    console.log("❌ ÉCHEC : le fichier existe toujours après 15 secondes.");
  }
}

run();