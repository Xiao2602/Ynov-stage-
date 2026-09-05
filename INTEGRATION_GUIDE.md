# 📘 YNOV Stage - Guide d'Intégration & Protocole de Test Manuel

Ce document récapitule l'ensemble des intégrations réalisées sur la branche `mokhta-develop`, combinant le travail de consolidation (Profils, Notifications réelles, Compatibilité des rôles, Fiabilisation Firebase) et les fonctionnalités récentes de planning et d'émargement de Moïse.

---

## 📋 1. Synthèse de ce qui a été consolidé sur `mokhta-develop`

### 🌿 Branche & Hygiène Git
- **Branche `mokhta-develop`** basée sur `origin/moise-dev` (Absences v1.3).
- **Nettoyage des binaires** : Tous les fichiers PDF et uploads utilisateurs (`backend/uploads/justifications/*.pdf`) ont été retirés de l'index Git sans impacter le stockage local.
- **Mise à jour de `.gitignore`** : Exclusion stricte de `storage-local/`, `backend/uploads/`, `uploads/`, `*.pdf`, et des clés de compte de service.
- **Assainissement des dépendances** : Suppression des dépendances frontend mal placées (`chart.js`, `react-chartjs-2`) dans `backend/package.json`, et installation correcte de `xlsx` dans `frontend/package.json`.

---

### 👤 Backend Profil & Services Utilisateurs
- **Module Profil créé et monté sur `/api/profile`** dans `backend/server.js` :
  - `POST /api/profile/request` : Soumission d'une demande de modification (Étudiant / Professeur / Parent).
  - `GET /api/profile/requests` : Récupération des demandes en attente (Admin & RH).
  - `POST /api/profile/requests/:id/approve` : Approbation et mise à jour automatique Firestore & Firebase Auth.
  - `POST /api/profile/requests/:id/reject` : Rejet d'une demande avec historisation.
  - `PUT /api/profile/admin/:uid` : Modification directe du profil par un administrateur.
- **Nouveaux services ajoutés dans `backend/Auth/Users/userService.js`** :
  - `updateMyProfileService(uid, updateData)` : Validation et mise à jour sécurisée des champs modifiables.
  - `uploadAvatarService(uid, avatarUrl)` : Gestion de l'avatar et synchronisation du profil Auth.

---

### 🔔 Notifications en Temps Réel & Synchronisation
- **Page Notifications connectée aux APIs réelles** (`frontend/src/pages/NotificationsPage.jsx`) :
  - Remplacement des données mockées par `GET /api/notifications/my`.
  - Action unitaire "Marquer comme lu" (`PATCH /api/notifications/:id/read`).
  - Action globale "Tout marquer comme lu" (`POST /api/notifications/read-all`).
  - Suppression de notification (`DELETE /api/notifications/:id`).
- **Synchronisation dynamique avec le menu déroulant** (`frontend/src/pages/NotificationsDropdown.jsx`) :
  - Utilisation d'événements personnalisés `notifications-updated` pour maintenir le compteur de badge et la liste synchronisés sans rechargement de page.

---

### 📑 Demandes de Profil & Formatage Résilient des Dates
- **Page des demandes administratives** (`frontend/src/pages/ProfileRequestsPage.jsx`) :
  - Connectée aux endpoints d'approbation et de rejet en direct.
  - Parseur de date universel prenant en charge les timestamps Firestore (`_seconds`, `seconds`, `toDate()`), les chaînes ISO et les timestamps Unix.

---

### 🎨 Paramètres, Thèmes & Icônes
- **Ajout de l'icône manquante** `IconRefreshCw` dans `frontend/src/components/Icons.jsx`.
- **Persistance du thème Clair / Sombre** :
  - Application immédiate au démarrage dans `frontend/src/main.jsx` via `localStorage.getItem('ynov-theme-preference')`.
  - Sélecteur et bascule réactive dans `frontend/src/pages/SettingsPage.jsx`.

---

### 🎭 Compatibilité Multilingue des Rôles (FR / EN)
- **Tableaux de bord unifiés** (`frontend/src/pages/DashboardOverview.jsx` & `frontend/src/pages/DashboardPage.jsx`) :
  - **Étudiants** : Supporte `['student', 'etudiant']`.
  - **Enseignants** : Supporte `['teacher', 'professeur', 'enseignant']`.
  - **Administrateurs & Personnel** : Supporte `['admin', 'rh', 'administrateur', 'personnel', 'manager', 'employee']`.
  - **Parents** : Supporte `['parent']`.

---

### 🛡️ Initialisation Firebase Résiliente
- **Découverte multi-chemins du compte de service** (`backend/firebaseAdmin.js` & `backend/Shared/Firebase config/firebase.js`) :
  - Recherche automatique à la racine du projet, dans `backend/`, via variable d'environnement ou nom wildcard `*-firebase-adminsdk-*.json`.
  - Mode dégradé sans crash si le fichier n'est pas encore présent (permet l'accès au healthcheck et aux tests).

---

## ⚙️ 2. Configuration restante à effectuer

Avant de lancer l'application, assurez-vous que les éléments suivants sont configurés :

### 1. Fichier de compte de service Firebase
Vérifiez que votre fichier de clé privée Firebase Admin SDK est placé à la racine du projet sous le nom :
```text
firebase-service-account.json
```
*(Ce fichier est ignoré par Git pour des raisons de sécurité).*

### 2. Variables d'environnement
- **Backend (`backend/.env`)** :
  ```ini
  PORT=5000
  JWT_SECRET=votre_cle_secrete_jwt
  ```
- **Frontend (`frontend/.env` ou `frontend/.env.local`)** :
  ```ini
  VITE_API_URL=http://localhost:5000/api
  ```

### 3. Démarrage des serveurs
Dans deux terminaux séparés :
```bash
# Terminal 1 : Backend
cd backend
npm run dev

# Terminal 2 : Frontend
cd frontend
npm run dev
```

---

## 🧪 3. Protocole de Test Manuel Pas-à-Pas

### Test 1 : Vérification de l'API Healthcheck
1. Démarrez le backend : `cd backend && npm run dev`
2. Ouvrez votre navigateur ou terminal et accédez à :
   ```http
   GET http://localhost:5000/api/health
   ```
3. **Résultat attendu** :
   ```json
   {
     "success": true,
     "message": "API opérationnelle."
   }
   ```

---

### Test 2 : Test des Rôles sur le Tableau de Bord
1. Connectez-vous avec un compte ayant le rôle **Étudiant** (`role: "student"` ou `"etudiant"`).
   - **Vérification** : La vue affiche le volume d'absence, la moyenne semestrielle et le suivi des demandes.
2. Connectez-vous avec un compte **Professeur** (`role: "teacher"` ou `"professeur"`).
   - **Vérification** : La vue affiche les promotions assignées, les appels en cours et le planning.
3. Connectez-vous avec un compte **Parent** (`role: "parent"`).
   - **Vérification** : La vue affiche le statut du dossier et les heures d'absences justifiées/non justifiées.
4. Connectez-vous avec un compte **Admin / RH** (`role: "admin"` ou `"rh"`).
   - **Vérification** : La vue affiche les graphiques de statistiques (Camembert et Barres).

---

### Test 3 : Demande de Modification de Profil & Validation Admin
1. **Étape 1 (Utilisateur)** : Connectez-vous en tant qu'Étudiant ou Professeur.
   - Allez sur la page **Mon Profil** (`/profile` ou via les Paramètres).
   - Modifiez votre téléphone ou département et cliquez sur **Enregistrer**.
   - **Vérification** : Un message confirme l'envoi de la demande de modification à l'administration.
2. **Étape 2 (Admin)** : Déconnectez-vous et connectez-vous avec un compte **Admin**.
   - Accédez à la page **Demandes de profil** (`/profile-requests`).
   - **Vérification** : La demande apparaît avec la date formatée en français et le détail des modifications.
   - Cliquez sur le bouton vert **Approuver** (ou **Rejeter**).
   - **Vérification** : La demande disparaît de la liste et le profil Firestore / Auth de l'utilisateur est mis à jour.

---

### Test 4 : Notifications & Synchronisation en Direct
1. Accédez à l'icône de cloche en haut à droite (Dropdown) et à la page **Notifications** (`/notifications`).
2. Cliquez sur **Tout marquer comme lu** sur la page Notifications.
   - **Vérification** : Le badge rouge sur la cloche se met immédiatement à jour à `0` sans avoir besoin de recharger la page.
3. Supprimez une notification ou marquez-en une comme lue depuis le Dropdown.
   - **Vérification** : La page Notifications se synchronise instantanément.

---

### Test 5 : Persistance du Thème
1. Rendez-vous sur la page **Paramètres** (`/settings`), onglet **Apparence**.
2. Basculez sur le thème **Clair** (ou **Sombre**).
3. Rechargez la page (`F5`).
4. **Vérification** : L'interface conserve immédiatement le thème choisi sans flash blanc/noir grâce à l'initialisation dans `main.jsx`.

---

### Test 6 : Validation du Build Production
Dans le dossier `frontend/` :
```bash
npm run build
```
- **Résultat attendu** : `✓ built in ~1s` avec 0 erreur de compilation TypeScript/ESLint/Vite.
