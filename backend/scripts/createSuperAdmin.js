import { adminAuth, adminDb } from '../Shared/Firebase config/firebase.js';
import admin from 'firebase-admin';

const email = process.env.SUPER_ADMIN_EMAIL;
const password = process.env.SUPER_ADMIN_PASSWORD;
if (!email || !password) throw new Error('SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD sont requis.');

try {
  let record;
  try { record = await adminAuth.getUserByEmail(email); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw error; record = await adminAuth.createUser({ email, password, displayName: 'Super Administrateur', disabled: false }); }
  await adminAuth.setCustomUserClaims(record.uid, { role: 'super_admin' });
  await adminDb.collection('users').doc(record.uid).set({ uid: record.uid, email, displayName: 'Super Administrateur', role: 'super_admin', department: 'Administration centrale', disabled: false, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  console.log(`Super administrateur prêt : ${record.uid}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
