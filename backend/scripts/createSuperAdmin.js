import { adminAuth, adminDb } from '../Shared/Firebase config/firebase.js';
import admin from 'firebase-admin';

const email = 'super.admin@ynov.com';
const password = 'Ynov!SuperAdmin2026#';
const displayName = 'Super Administrateur';

try {
  let record;
  try {
    record = await adminAuth.getUserByEmail(email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    record = await adminAuth.createUser({ email, password, displayName, disabled: false });
  }
  await adminAuth.setCustomUserClaims(record.uid, { role: 'super_admin' });
  await adminDb.collection('users').doc(record.uid).set({
    uid: record.uid, email, displayName, role: 'super_admin',
    department: 'Administration centrale', disabled: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`Super admin prêt: ${record.uid}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
