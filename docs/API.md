# Référence de l’API

Base locale : `http://localhost:5000/api`. Toutes les routes, sauf `GET /health`, requièrent un jeton Firebase dans `Authorization: Bearer <idToken>`. Les droits réels sont vérifiés côté serveur : le rôle affiché par le navigateur ne suffit jamais.

## Tests

- Tests statiques de sécurité reproductibles : `cd backend && npm test`.
- Vérification de syntaxe : `npm run lint`.
- Les tests HTTP nécessitant Firebase se lancent uniquement contre les émulateurs du projet factice `demo-ynov`, jamais contre le projet réel. Les scénarios sont décrits dans [tests/README.md](../backend/tests/README.md).
- Le fichier [openapi.yaml](openapi.yaml) fournit une base OpenAPI importable et les routes listées ci-dessous restent la source contractuelle.

## Authentification et consentement

| Méthode | Route | Rôle | Test associé |
|---|---|---|---|
| POST | `/auth/login` | public, limité | SEC-01 |
| POST | `/auth/change-password` | connecté | AUTH-01 |
| POST | `/auth/logout` | public | AUTH-02 |
| GET | `/auth/me` | connecté | P0-2 |
| POST | `/auth/consent` | connecté, profil existant | P0-4 |
| GET | `/auth/2fa/setup` | connecté | 2FA-01 |
| POST | `/auth/2fa/enable` | connecté | 2FA-02 |
| POST | `/auth/2fa/disable` | connecté | 2FA-03 |
| POST | `/auth/2fa/verify-login` | public, limité | 2FA-04 |

La route `POST /auth/reset-password` n’existe volontairement plus. La réinitialisation est effectuée côté client via Firebase.

## Utilisateurs, rôles et classes

| Méthode | Route | Rôle | Test associé |
|---|---|---|---|
| GET | `/classes` | connecté | CLASS-01 |
| POST | `/classes` | admin/super_admin | CLASS-02 |
| DELETE | `/classes/:classId` | admin/super_admin | CLASS-03 |
| PATCH | `/users/:uid/classes` | admin/super_admin | CLASS-04 |
| POST | `/temporary-supervisions` | admin/super_admin | CLASS-05 |
| GET | `/temporary-supervisions/my` | connecté | CLASS-06 |
| GET | `/users` | admin/employee | P0-2 |
| POST | `/users/create` | admin/employee/super_admin | P0-3 |
| POST | `/users/link-parent-student` | admin/employee | USER-01 |
| GET | `/users/my-children` | parent/admin/employee | P0-2 |
| GET | `/users/my-students` | teacher/employee/student | USER-02 |
| GET | `/users/my-courses` | teacher/employee/student | USER-03 |
| GET | `/users/:uid` | admin/employee | P0-2 |
| PATCH | `/users/:uid` | admin/employee | USER-04 |
| PATCH | `/users/:uid/suspend` | admin/employee | USER-05 |
| DELETE | `/users/:uid` | admin/super_admin | USER-06 |
| POST | `/users/assign-teacher` | admin/employee | USER-07 |
| POST | `/roles/assign` | admin/super_admin | USER-08 |

Un rôle hors liste blanche retourne `400`; la création de `admin` n’est autorisée qu’au `super_admin`; `super_admin` n’est jamais créable par API.

## Absences

| Méthode | Route | Rôle | Test associé |
|---|---|---|---|
| POST | `/absences` | connecté | ABS-01 |
| GET | `/absences/my` | connecté | ABS-02 |
| GET | `/absences/children` | parent/admin/employee | ABS-03 |
| GET | `/absences/pending` | admin/employee | ABS-04 |
| GET | `/absences` | admin/employee | ACL-ABS-01 |
| PATCH | `/absences/:id/review` | admin/employee | ABS-05 |
| DELETE | `/absences/:id` | propriétaire uniquement | ACL-ABS-02 |
| POST | `/absences/teacher/declare` | teacher/délégation temporaire | ACL-ABS-03 |
| GET | `/absences/by-course` | teacher | ACL-ABS-04 |
| POST | `/absences/:id/justify` | propriétaire uniquement | ACL-ABS-05 |
| POST | `/absences/transform-lates` | admin/employee | ABS-06 |
| POST | `/absences/archive` | admin/super_admin | ABS-07 |
| GET | `/absences/archived` | admin/employee | ABS-08 |
| GET | `/absences/statistics` | admin/employee | ABS-09 |
| GET/POST | `/absences/export/excel` | admin/employee | ABS-10 |
| GET/POST | `/absences/export/pdf` | admin/employee | ABS-11 |

## Plannings

| Méthode | Route | Rôle | Test associé |
|---|---|---|---|
| POST | `/plannings/assign` | admin/employee | PLAN-01 |
| GET | `/plannings/catalog` | admin/employee/teacher | P0-2, ACL-PLAN-01 |
| GET | `/plannings/student/my` | étudiant ou parent lié | ACL-PLAN-02 |
| GET | `/plannings/:teacherUid` | propriétaire, admin, employee, super_admin | ACL-PLAN-03 |

## Documents

| Méthode | Route | Rôle | Test associé |
|---|---|---|---|
| POST | `/documents/upload` | connecté (hors parent) | DOC-01 |
| POST | `/documents/generate` | admin/employee/super_admin | DOC-02 |
| GET | `/documents/dashboard` | connecté, périmètre contrôlé | DOC-03 |
| GET | `/documents/my` | connecté, enfant lié admis | DOC-04 |
| GET | `/documents/:id` | propriétaire, staff ou parent lié | DOC-05 |
| GET | `/documents/:id/view` | propriétaire, staff ou parent lié | P0-5, DOC-06 |
| PATCH | `/documents/:id/archive` | propriétaire | DOC-07 |
| PATCH | `/documents/:id/unarchive` | propriétaire | DOC-08 |
| DELETE | `/documents/:id` | propriétaire | DOC-09 |

Les anciens fichiers locaux ne sont jamais accessibles par `/uploads/*` : seule la route authentifiée `/documents/:id/view` peut les servir.

## Profil, notifications, audit et santé

| Méthode | Route | Rôle | Test associé |
|---|---|---|---|
| POST | `/profile/request` | connecté | PROF-01 |
| GET | `/profile/requests` | admin/rh/super_admin | PROF-02 |
| POST | `/profile/requests/:id/approve` | admin/rh/super_admin | PROF-03 |
| POST | `/profile/requests/:id/reject` | admin/rh/super_admin | PROF-04 |
| PUT | `/profile/admin/:uid` | admin/rh/super_admin | PROF-05 |
| GET | `/notifications/my` | connecté | NOTIF-01 |
| PATCH | `/notifications/:id/read` | propriétaire | NOTIF-02 |
| POST | `/notifications/read-all` | connecté | NOTIF-03 |
| DELETE | `/notifications/:id` | propriétaire | NOTIF-04 |
| DELETE | `/notifications/read` | connecté | NOTIF-05 |
| GET | `/activity-logs` | admin/super_admin | LOG-01 |
| GET | `/health` | public | HEALTH-01 |

## Codes d’erreur

- `400` : entrée invalide ;
- `401` : jeton absent ou invalide ;
- `403` : rôle, propriété, consentement ou seconde étape 2FA insuffisant ;
- `404` : ressource ou route absente ;
- `429` : trop de tentatives d’authentification ;
- `500` : erreur serveur non divulguée au client.

