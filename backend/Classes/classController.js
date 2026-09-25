import admin from 'firebase-admin';
import { adminDb } from '../firebaseAdmin.js';
import { logActivity } from '../Services/activityLogService.js';

const classes = () => adminDb.collection('classes');

export async function handleListClasses(req, res) {
  try {
    const snapshot = await classes().orderBy('name').get();
    return res.json({ success: true, classes: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleCreateClass(req, res) {
  try {
    const name = String(req.body?.name || '').trim().replace(/\s+/g, ' ');
    const type = req.body?.type === 'exceptional' ? 'exceptional' : 'academic';
    if (name.length < 2 || name.length > 100) return res.status(400).json({ success: false, error: 'Le nom de la classe doit contenir entre 2 et 100 caractères.' });
    const duplicate = await classes().where('normalizedName', '==', name.toLocaleLowerCase('fr-FR')).limit(1).get();
    if (!duplicate.empty) return res.status(409).json({ success: false, error: 'Une classe portant ce nom existe déjà.' });
    const ref = classes().doc();
    const classData = {
      id: ref.id, name, normalizedName: name.toLocaleLowerCase('fr-FR'), type,
      active: true, createdBy: req.user.uid, createdByName: req.user.displayName || req.user.email || 'Administration',
      createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(classData);
    await logActivity(req.user.uid, 'create_class', { classId: ref.id, name, type }, req);
    return res.status(201).json({ success: true, class: { ...classData, createdAt: new Date().toISOString() } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleUpdateStudentClasses(req, res) {
  try {
    const { uid } = req.params;
    const values = Array.isArray(req.body?.studentClasses) ? req.body.studentClasses : [];
    const studentClasses = [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
    if (!studentClasses.length) return res.status(400).json({ success: false, error: 'Un étudiant doit appartenir à au moins une classe.' });
    const ref = adminDb.collection('users').doc(uid);
    const doc = await ref.get();
    if (!doc.exists || doc.data().role !== 'student') return res.status(404).json({ success: false, error: 'Étudiant introuvable.' });
    await ref.update({ studentClasses, className: studentClasses[0], department: studentClasses[0], updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    await logActivity(req.user.uid, 'update_student_classes', { studentUid: uid, studentClasses }, req);
    return res.json({ success: true, message: `${studentClasses.length} classe(s) enregistrée(s).`, studentClasses });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleDeleteClass(req, res) {
  try {
    const classId = String(req.params.classId || '');
    const classDoc = await classes().doc(classId).get();
    if (!classDoc.exists) return res.status(404).json({ success: false, error: 'Classe introuvable.' });
    const className = classDoc.data().name;
    const usersSnapshot = await adminDb.collection('users').get();
    const batch = adminDb.batch();
    usersSnapshot.docs.forEach((doc) => {
      const user = doc.data();
      if (user.role === 'student' && Array.isArray(user.studentClasses) && user.studentClasses.includes(className)) {
        const remaining = user.studentClasses.filter((item) => item !== className);
        // Une classe principale ne peut pas être supprimée si elle est la seule classe de l'étudiant.
        if (remaining.length) batch.update(doc.ref, { studentClasses: remaining, className: remaining[0], department: remaining[0] });
      }
      if (user.role === 'teacher' && Array.isArray(user.assignedClasses) && user.assignedClasses.includes(className)) {
        const remaining = user.assignedClasses.filter((item) => item !== className);
        batch.update(doc.ref, { assignedClasses: remaining, assignedClass: remaining[0] || '', department: remaining[0] || user.department || '' });
      }
    });
    const supervisions = await adminDb.collection('temporarySupervisions').where('className', '==', className).get();
    supervisions.docs.forEach((doc) => batch.delete(doc.ref));
    const plannings = await adminDb.collection('plannings').get();
    plannings.docs.forEach((doc) => {
      const courses = (doc.data().courses || []).filter((course) => course.group !== className);
      if (courses.length !== (doc.data().courses || []).length) batch.update(doc.ref, { courses, totalCourses: courses.length });
    });
    batch.delete(classDoc.ref);
    await batch.commit();
    await logActivity(req.user.uid, 'delete_class', { classId, className }, req);
    return res.json({ success: true, message: 'Classe supprimée et affectations temporaires retirées.' });
  } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
}

const isActive = (assignment) => {
  const today = new Date().toISOString().slice(0, 10);
  return assignment.active !== false && assignment.startDate <= today && assignment.endDate >= today;
};

export async function handleCreateTemporarySupervision(req, res) {
  try {
    const className = String(req.body?.className || '').trim();
    const supervisorUid = String(req.body?.supervisorUid || '').trim();
    const startDate = String(req.body?.startDate || '').slice(0, 10);
    const endDate = String(req.body?.endDate || '').slice(0, 10);
    if (!className || !supervisorUid || !startDate || !endDate || endDate < startDate) return res.status(400).json({ success: false, error: 'Classe, responsable et période valide sont requis.' });
    const supervisor = await adminDb.collection('users').doc(supervisorUid).get();
    if (!supervisor.exists || !['employee', 'student', 'teacher'].includes(supervisor.data().role)) return res.status(400).json({ success: false, error: 'Le responsable doit être un professeur, un personnel ou un étudiant.' });
    const ref = adminDb.collection('temporarySupervisions').doc();
    const item = { id: ref.id, className, supervisorUid, supervisorName: supervisor.data().displayName || supervisor.data().email || '', supervisorRole: supervisor.data().role, startDate, endDate, active: true, createdBy: req.user.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() };
    await ref.set(item);
    await logActivity(req.user.uid, 'create_temporary_supervision', { className, supervisorUid, startDate, endDate }, req);
    return res.status(201).json({ success: true, supervision: item });
  } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
}

export async function handleGetMyTemporarySupervisions(req, res) {
  try {
    const snapshot = await adminDb.collection('temporarySupervisions').where('supervisorUid', '==', req.user.uid).get();
    const supervisions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter(isActive);
    return res.json({ success: true, supervisions });
  } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
}

export async function getActiveTemporaryClasses(uid) {
  const snapshot = await adminDb.collection('temporarySupervisions').where('supervisorUid', '==', uid).get();
  return snapshot.docs.map((doc) => doc.data()).filter(isActive).map((item) => item.className);
}
