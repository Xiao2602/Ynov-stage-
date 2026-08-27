import admin from "firebase-admin";
import { adminAuth, adminDb } from "../../Shared/Firebase config/firebase.js";
import { createUserService, getAllUsersService } from "./userService.js";
import { logActivity } from "../../Services/activityLogService.js";

export async function handleCreateUser(req, res) {
  try {
    const { email, password, displayName, role, department } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ success: false, error: "Veuillez fournir un email, un mot de passe et un nom." });
    }
    const result = await createUserService({ email, password, displayName, role, department });
    if (!result.success) return res.status(400).json(result);
    
    await logActivity(req.user.uid, 'create_user', { createdUid: result.data.uid, role }, req);
    return res.status(201).json(result);
  } catch (error) {
    console.error("Erreur handleCreateUser:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleGetAllUsers(req, res) {
  try {
    const result = await getAllUsersService();
    if (!result.success) return res.status(500).json(result);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Erreur handleGetAllUsers:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleLinkParentStudent(req, res) {
  try {
    const { parentUid, studentUid } = req.body;
    if (!parentUid || !studentUid) {
      return res.status(400).json({ success: false, error: "Veuillez fournir parentUid et studentUid." });
    }
    const studentDoc = await adminDb.collection("users").doc(studentUid).get();
    if (!studentDoc.exists) return res.status(404).json({ success: false, error: "Étudiant introuvable." });
    const studentData = studentDoc.data();
    if (studentData.role !== "student") return res.status(400).json({ success: false, error: "L'utilisateur n'est pas un étudiant." });
    const parentDoc = await adminDb.collection("users").doc(parentUid).get();
    if (!parentDoc.exists) return res.status(404).json({ success: false, error: "Parent introuvable." });
    const parentData = parentDoc.data();
    if (parentData.role !== "parent") return res.status(400).json({ success: false, error: "L'utilisateur n'est pas un parent." });
    const childrenUids = parentData.childrenUids || [];
    if (!childrenUids.includes(studentUid)) {
      childrenUids.push(studentUid);
      await adminDb.collection("users").doc(parentUid).update({ childrenUids });
    }
    const parentUids = studentData.parentUids || [];
    if (!parentUids.includes(parentUid)) {
      parentUids.push(parentUid);
      await adminDb.collection("users").doc(studentUid).update({ parentUids });
    }
    await logActivity(req.user.uid, 'link_parent_student', { parentUid, studentUid }, req);
    return res.status(200).json({ success: true, message: "Parent et étudiant liés avec succès." });
  } catch (error) {
    console.error("Erreur handleLinkParentStudent:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleGetLinkedChildren(req, res) {
  try {
    const parentDoc = await adminDb.collection("users").doc(req.user.uid).get();
    if (!parentDoc.exists) return res.status(404).json({ success: false, error: "Parent introuvable." });
    const parentData = parentDoc.data();
    const childrenUids = parentData.childrenUids || [];
    const children = [];
    for (const uid of childrenUids) {
      const childDoc = await adminDb.collection("users").doc(uid).get();
      if (childDoc.exists) children.push({ uid: childDoc.id, ...childDoc.data() });
    }
    return res.status(200).json({ success: true, children });
  } catch (error) {
    console.error("Erreur handleGetLinkedChildren:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Professeur
export async function handleGetMyStudents(req, res) {
  try {
    const teacherUid = req.user.uid;
    const teacherDoc = await adminDb.collection("users").doc(teacherUid).get();
    if (!teacherDoc.exists) return res.status(404).json({ success: false, error: "Professeur introuvable." });
    const teacherData = teacherDoc.data();
    const assignedClasses = teacherData.assignedClasses || [];

    const snapshot = await adminDb.collection("users").where("role", "==", "student").get();
    const students = [];
    snapshot.forEach(doc => {
      const studentData = doc.data();
      const studentClass = studentData.className || studentData.department || "";
      if (assignedClasses.length === 0) {
        students.push({ uid: doc.id, ...studentData });
        return;
      }
      const match = assignedClasses.some(cls => 
        studentClass.toLowerCase().includes(cls.toLowerCase()) ||
        cls.toLowerCase().includes(studentClass.toLowerCase())
      );
      if (match) students.push({ uid: doc.id, ...studentData });
    });
    return res.status(200).json({ success: true, students });
  } catch (error) {
    console.error("Erreur handleGetMyStudents:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleGetMyCourses(req, res) {
  try {
    const teacherUid = req.user.uid;
    const teacherDoc = await adminDb.collection("users").doc(teacherUid).get();
    if (!teacherDoc.exists) return res.status(404).json({ success: false, error: "Professeur introuvable." });
    const teacherData = teacherDoc.data();
    const department = teacherData.department || "";
    const courses = {
      "informatique": [
        { day: 'Lundi', start: '09:00', duration: 2, title: 'Architecture des systèmes web', group: 'Bachelor 2 - Informatique', room: 'Salle 402' },
        { day: 'Lundi', start: '13:00', duration: 1, title: 'Développement web avancé', group: 'Bachelor 3 - Informatique', room: 'Salle 308' },
        { day: 'Mardi', start: '11:00', duration: 2, title: 'Revue de projets', group: 'Bachelor 2 - Informatique', room: 'Salle 215' },
        { day: 'Jeudi', start: '14:00', duration: 2, title: 'Bases de données', group: 'Bachelor 1 - Informatique', room: 'Salle 204' },
      ],
      "design": [
        { day: 'Lundi', start: '10:00', duration: 2, title: 'Design thinking', group: 'Bachelor 2 - Design', room: 'Salle 102' },
        { day: 'Mardi', start: '14:00', duration: 2, title: 'UI/UX avancé', group: 'Bachelor 3 - Design', room: 'Salle 103' },
      ],
      "marketing": [
        { day: 'Mercredi', start: '09:00', duration: 2, title: 'Marketing digital', group: 'Bachelor 2 - Marketing', room: 'Salle 201' },
        { day: 'Jeudi', start: '10:00', duration: 2, title: 'Stratégie de marque', group: 'Bachelor 3 - Marketing', room: 'Salle 202' },
      ]
    };
    const deptKey = Object.keys(courses).find(key => department.toLowerCase().includes(key));
    const teacherCourses = deptKey ? courses[deptKey] : courses.informatique;
    return res.status(200).json({ success: true, courses: teacherCourses });
  } catch (error) {
    console.error("Erreur handleGetMyCourses:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Admin
export async function handleAssignTeacherClass(req, res) {
  try {
    const { teacherUid, assignedClasses } = req.body;
    if (!teacherUid || !assignedClasses || !Array.isArray(assignedClasses)) {
      return res.status(400).json({ success: false, error: "teacherUid et assignedClasses (tableau) sont requis." });
    }
    const teacherRef = adminDb.collection("users").doc(teacherUid);
    const teacherDoc = await teacherRef.get();
    if (!teacherDoc.exists) return res.status(404).json({ success: false, error: "Professeur introuvable." });
    const teacherData = teacherDoc.data();
    if (teacherData.role !== "teacher") return res.status(400).json({ success: false, error: "L'utilisateur n'est pas un professeur." });
    await teacherRef.update({ assignedClasses });
    await logActivity(req.user.uid, 'assign_teacher_class', { teacherUid, assignedClasses }, req);
    return res.status(200).json({ success: true, message: `${assignedClasses.length} classe(s) assignée(s).` });
  } catch (error) {
    console.error("Erreur handleAssignTeacherClass:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleSuspendUser(req, res) {
  try {
    const { uid } = req.params;
    const { disabled } = req.body;
    if (typeof disabled !== 'boolean') {
      return res.status(400).json({ success: false, error: "Le champ 'disabled' doit être un booléen." });
    }
    const userRef = adminDb.collection("users").doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
    await userRef.update({ disabled });
    try {
      await adminAuth.updateUser(uid, { disabled });
    } catch (authError) {
      console.warn("Impossible de mettre à jour le statut dans Auth:", authError.message);
    }
    await logActivity(req.user.uid, 'suspend_user', { targetUid: uid, disabled }, req);
    return res.status(200).json({ success: true, message: `Utilisateur ${disabled ? 'suspendu' : 'réactivé'}.` });
  } catch (error) {
    console.error("Erreur handleSuspendUser:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleDeleteUser(req, res) {
  try {
    const { uid } = req.params;
    const userRef = adminDb.collection("users").doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
    await userRef.delete();
    try {
      await adminAuth.deleteUser(uid);
    } catch (authError) {
      console.warn("Impossible de supprimer l'utilisateur dans Auth:", authError.message);
    }
    await logActivity(req.user.uid, 'delete_user', { deletedUid: uid }, req);
    return res.status(200).json({ success: true, message: "Utilisateur supprimé." });
  } catch (error) {
    console.error("Erreur handleDeleteUser:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleUpdateUser(req, res) {
  try {
    const { uid } = req.params;
    const updateData = req.body;
    if (!uid) return res.status(400).json({ success: false, error: "UID manquant." });

    const userRef = adminDb.collection("users").doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });

    const allowedFields = ['displayName', 'email', 'department', 'className', 'assignedClasses', 'phone', 'level', 'field', 'speciality'];
    const filteredData = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) filteredData[key] = updateData[key];
    }
    filteredData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await userRef.update(filteredData);

    if (updateData.email) {
      try { await adminAuth.updateUser(uid, { email: updateData.email }); } catch (authError) { console.warn("Impossible de mettre à jour l'email dans Auth:", authError.message); }
    }

    await logActivity(req.user.uid, 'update_user', { updatedUid: uid, fields: Object.keys(filteredData) }, req);
    return res.status(200).json({ success: true, message: "Utilisateur mis à jour." });
  } catch (error) {
    console.error("Erreur handleUpdateUser:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleGetUser(req, res) {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ success: false, error: "UID manquant." });
    const doc = await adminDb.collection("users").doc(uid).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
    return res.status(200).json({ success: true, user: { uid: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("Erreur handleGetUser:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}