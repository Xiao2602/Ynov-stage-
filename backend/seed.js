import { randomBytes } from 'crypto';
import { createUserService } from './Auth/Users/userService.js';
import { ROLES } from './Shared/Roles/roles.js';

if (process.env.NODE_ENV === 'production') throw new Error('Le seed est interdit en production.');
const password = () => randomBytes(24).toString('base64url');
const accounts = [
  ['admin.seed@ynov.com', 'Administrateur démo', ROLES.ADMIN],
  ['rh.seed@ynov.com', 'RH démo', ROLES.RH],
  ['teacher.seed@ynov.com', 'Professeur démo', ROLES.TEACHER],
  ['employee.seed@ynov.com', 'Personnel démo', ROLES.EMPLOYEE],
  ['student.seed@ynov.com', 'Étudiant démo', ROLES.STUDENT],
  ['parent.seed@example.test', 'Parent démo', ROLES.PARENT],
];
for (const [email, displayName, role] of accounts) await createUserService({ email, displayName, role, password: password(), department: 'Démonstration' });
console.log('Seed terminé. Les mots de passe aléatoires ne sont pas affichés.');
