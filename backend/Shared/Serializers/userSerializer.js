const FIELDS = ['uid', 'email', 'displayName', 'role', 'phone', 'department', 'service', 'className', 'studentClasses', 'assignedClass', 'assignedClasses', 'level', 'field', 'speciality', 'childrenUids', 'parentUids', 'disabled', 'photoURL', 'avatarUrl', 'bio', 'mustChangePassword', 'consentVersion', 'consentAcceptedAt', 'createdAt', 'updatedAt'];

export function serializeUser(data = {}, uid = data.uid) {
  const user = {};
  for (const field of FIELDS) if (data[field] !== undefined) user[field] = data[field];
  user.uid = uid || data.uid;
  user.id = user.uid;
  user.twoFactorEnabled = data.twoFactorEnabled === true;
  return user;
}

export function serializeTeacherIdentity(data = {}, uid) {
  return { uid: uid || data.uid, displayName: data.displayName || data.email || 'Professeur' };
}
