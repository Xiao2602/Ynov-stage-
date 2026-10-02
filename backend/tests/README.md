# Tests d’intégration API

Ces scénarios ne doivent jamais être joués contre Firebase, Supabase ou SMTP de production.

## Préparation

1. Démarrer les émulateurs Firebase avec le projet factice `demo-ynov`.
2. Définir `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9199`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8085`, `GCLOUD_PROJECT=demo-ynov` et un compte de service jetable dans `FIREBASE_SERVICE_ACCOUNT_PATH`.
3. Lancer le backend avec un SMTP volontairement indisponible.
4. Utiliser des jetons des émulateurs correspondant aux rôles indiqués.

## Scénarios de sécurité prioritaires

| ID | Action | Résultat attendu |
|---|---|---|
| P0-1 | `POST /api/auth/reset-password` | `404` |
| P0-2 | Lire `/users`, `/users/:uid`, `/auth/me`, `/users/my-children`, `/plannings/catalog` | jamais `twoFactorSecret` ou `twoFactorVerifiedAt`; catalogue : enseignants limités à `uid`, `displayName` |
| P0-3 | employee crée `admin` | `403`; super_admin crée `admin` : `201`; rôle inconnu/super_admin : `400` |
| P0-4 | Jeton Firebase sans rôle/profil puis `/auth/me` ou `/auth/consent` | `403`, aucun profil créé |
| P0-5 | `GET /uploads/test.pdf` sans jeton | `404` |
| ACL-ABS-01 | teacher appelle `GET /absences` | `403` |
| ACL-ABS-02 | utilisateur A supprime l’absence de B | `400`/refus |
| ACL-ABS-03 | teacher déclare un étudiant hors de sa classe/cours | `403` |
| ACL-PLAN-01 | teacher appelle `/plannings/catalog` | uniquement son identité et ses cours |
| ACL-PLAN-03 | teacher A lit `/plannings/teacherB` | `403` |
| SEC-01 | 11 appels `POST /auth/login` depuis la même IP en 15 min | le dernier est `429` |
| 2FA-04 | code incorrect 5 fois | session temporaire invalidée ; 6e appel refusé |
| DOC-06 | document local via `/uploads/*` | indisponible ; accès seulement par `/documents/:id/view` autorisé |

Les contrôles sans Firebase sont automatisés par `npm test`. Les scénarios de ce tableau doivent être automatisés dans une prochaine itération contre les émulateurs ; ils sont documentés explicitement pour être reproductibles sans toucher aux données réelles.

