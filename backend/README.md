# Backend API - Projet Gestion des Absences (Maroc YNOV Campus)

## Overview

Ce dépôt contient l'API RESTful pour le système de gestion des absences de Maroc YNOV Campus. Le backend est développé avec Node.js, Express, Firebase (Authentication et Firestore), Stockage de Fichiers Local (`/uploads/`), et Nodemailer pour l'envoi d'e-mails HTML personnalisés.

Les comptes utilisateurs sont sécurisés via le SDK Firebase Admin avec un contrôle d'accès basé sur les rôles (RBAC) prenant en charge 7 rôles système : **Admin**, **RH**, **Manager**, **Teacher**, **Employee**, **Student**, et **Parent**.

---

## Structure du projet (Dossiers et Modules)

```text
backend/
├── Absence/                         # Module de gestion des demandes d'absence
│   ├── Controllers/
│   │   └── absenceController.js     # Handlers Express pour soumettre, réviser et consulter
│   ├── Services/
│   │   └── absenceService.js        # Logique métier, requêtes Firestore et alertes emails / notifications
│   └── Validators/
│       └── absenceValidator.js      # Validation des champs et statuts
│
├── Notifications/                   # Module de notifications In-App (Collection Firestore 'notifications')
│   ├── Controllers/
│   │   └── notificationController.js# Handlers Express pour consulter et marquer comme lu
│   └── Services/
│       └── notificationService.js   # Création, lecture et mise à jour des notifications
│
├── Auth/                            # Module d'authentification et d'administration des utilisateurs
│   ├── Authentication/              # Authentification et réinitialisation de mot de passe
│   │   ├── authController.js
│   │   ├── authService.js
│   │   └── customEmailService.js    # Envoi d'emails HTML (réinitialisation, alerte RH & notifications)
│   ├── Users/                       # Gestion des comptes et liaisons
│   │   ├── userController.js        # Endpoints Express (création compte, liaison Parent-Étudiant)
│   │   └── userService.js           # Services Admin SDK (gestion utilisateurs & Firestore)
│   └── Roles & Permissions/
│       ├── roleController.js        # Endpoint d'assignation de rôles
│       └── roleService.js           # Gestion des Custom Claims Firebase
│
├── Documents/                       # Module de téléversement des justificatifs via Stockage Local
│   ├── Controllers/
│   │   └── documentController.js    # Endpoint pour réceptionner le fichier via Multer
│   ├── Services/
│   │   └── documentService.js       # Stockage sur disque local (/uploads) & métadonnées Firestore
│   └── Validators/
│       └── documentValidator.js     # Validation de taille (5Mo max) et types MIME (PDF, PNG, JPEG)
│
├── uploads/                         # Dossier local d'hébergement des fichiers téléversés
├── Shared/
│   ├── Firebase config/
│   │   └── firebase.js              # Config Firebase Client & Admin SDK
│   ├── Authentication middleware/
│   │   └── authMiddleware.js        # Middleware Token Bearer & Vérification des Rôles (RBAC)
│   ├── Roles/
│   │   └── roles.js                 # Constantes des rôles (Admin, RH, Manager, Student, Parent...)
│   ├── Permissions/
│   │   └── permissions.js           # Constantes des permissions
│   └── Utilities/
│       └── utilities.js             # Formateurs de réponses API
│
├── .env.example                    # Modèle de variables d'environnement
├── firebaseAdmin.js                # Configuration Firebase Admin SDK
├── firebaseConfig.js               # Configuration Firebase Web Client SDK
├── seed.js                         # Script d'initialisation des 7 comptes utilisateurs par défaut
├── server.js                       # Point d'entrée du serveur Express
└── YNOV_Absence_API.postman_collection.json  # Collection de tests Postman
```

---

## Guide : Comment créer une nouvelle API (Étape par Étape)

Pour ajouter une nouvelle fonctionnalité ou un nouvel endpoint dans le projet backend, suivez l'architecture en 3 couches (Validator -> Service -> Controller -> Server Route) :

### Étape 1 : Créer le Validateur (Validator)
Dans le dossier du module correspondant (ex: `backend/<Module>/Validators/<feature>Validator.js`), définissez les règles de validation des données d'entrée (`req.body` ou `req.params`) :
```javascript
export function validateCreateItem(data) {
  if (!data.title || data.title.trim() === "") {
    return { valid: false, error: "Le titre est obligatoire." };
  }
  return { valid: true };
}
```

### Étape 2 : Créer le Service Métier (Service)
Dans le dossier `Services` (ex: `backend/<Module>/Services/<feature>Service.js`), implémentez la logique métier et les requêtes Firestore / Stockage / Emails :
```javascript
import { adminDb } from "../../firebaseAdmin.js";

export async function createItemService(data, userId) {
  try {
    const docRef = adminDb.collection("items").doc();
    const item = { id: docRef.id, ...data, userId, createdAt: new Date().toISOString() };
    await docRef.set(item);
    return { success: true, item };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Étape 3 : Créer le Contrôleur Express (Controller)
Dans le dossier `Controllers` (ex: `backend/<Module>/Controllers/<feature>Controller.js`), réceptionnez les requêtes HTTP, appelez le validateur puis le service, et renvoyez le statut HTTP approprié :
```javascript
import { validateCreateItem } from "../Validators/itemValidator.js";
import { createItemService } from "../Services/itemService.js";

export async function handleCreateItem(req, res) {
  const validation = validateCreateItem(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }
  const result = await createItemService(req.body, req.user.uid);
  if (result.success) {
    return res.status(201).json(result);
  } else {
    return res.status(500).json(result);
  }
}
```

### Étape 4 : Enregistrer la Route dans `server.js`
Ouvrez `backend/server.js`, importez votre contrôleur et enregistrez la route avec les middlewares de sécurité appropriés :
```javascript
import { handleCreateItem } from "./Item/Controllers/itemController.js";
import { authenticateToken, authorizeRoles } from "./Shared/Authentication middleware/authMiddleware.js";
import { ROLES } from "./Shared/Roles/roles.js";

// Endpoint sécurisé avec vérification du jeton Bearer et des rôles autorisés
app.post("/api/items", authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.RH), handleCreateItem);
```

---

## Explication Complète des APIs et Endpoints

### 1. Authentification (`/api/auth`)
* `POST /api/auth/login` (Public) : Authentifie un utilisateur avec email et mot de passe. Renvoie le jeton ID Token et les informations de profil.
* `POST /api/auth/reset-password` (Public) : Génère un lien sécurisé de réinitialisation de mot de passe et l'envoie par e-mail HTML via Nodemailer.
* `POST /api/auth/logout` (Public) : Déconnecte l'utilisateur actuel.

### 2. Gestion des Utilisateurs et Rôles (`/api/users` & `/api/roles`)
* `GET /api/users` (Authentifié) : Récupère la liste de tous les comptes utilisateurs depuis Firestore.
* `POST /api/users/create` (Admin / RH) : Crée un compte utilisateur dans Firebase Auth avec Custom Claims et enregistre son profil Firestore.
* `POST /api/roles/assign` (Admin) : Assigne ou modifie le rôle Custom Claim d'un utilisateur.
* `POST /api/users/link-parent-student` (Admin / RH) : Lie un compte Parent à un compte Étudiant dans Firestore (`childrenUids` et `parentUids`).
* `GET /api/users/my-children` (Parent / Admin / RH) : Récupère la liste des profils étudiants liés au compte Parent connecté.

### 3. Module des Absences (`/api/absences`)
* `POST /api/absences` (Authentifié) : Soumet une nouvelle demande d'absence. Déclenche automatiquement l'alerte e-mail RH et la notification In-App.
* `GET /api/absences/my` (Authentifié) : Récupère l'historique des absences soumises par l'utilisateur connecté.
* `GET /api/absences/children` (Parent / Admin / RH) : Permet aux parents de consulter les demandes d'absence de leurs enfants liés.
* `GET /api/absences/pending` (Admin / RH / Manager) : Récupère toutes les demandes d'absence en attente de révision (`pending`).
* `GET /api/absences` (Admin / RH / Manager / Teacher) : Récupère l'ensemble des absences avec possibilité de filtrer par statut, département ou type.
* `PATCH /api/absences/:id/review` (Admin / RH / Manager) : Approuve ou rejette une demande d'absence. Déclenche l'e-mail de décision et la notification In-App à l'étudiant.
* `DELETE /api/absences/:id` (Propriétaire uniquement) : Annule et supprime une demande d'absence tant qu'elle est en statut `pending`.

### 4. Module des Notifications In-App (`/api/notifications`)
* `GET /api/notifications/my` (Authentifié) : Récupère la liste des notifications In-App de l'utilisateur connecté et le compteur non-lu.
* `PATCH /api/notifications/:id/read` (Authentifié) : Marque une notification spécifique comme lue (`read: true`).
* `POST /api/notifications/read-all` (Authentifié) : Marque toutes les notifications de l'utilisateur comme lues.

### 5. Module des Documents (`/api/documents/upload`)
* `POST /api/documents/upload` (Authentifié) : Réceptionne un fichier justificatif via `Multer`, l'enregistre sur le disque local dans `backend/uploads/justifications/`, et crée le document de métadonnées dans la collection Firestore `documents`.

---

## Initialisation des Comptes de Test (Seed)

Pour créer les 7 comptes de démonstration par défaut (Admin, RH, Manager, Teacher, Employee, Student, Parent), exécutez :
```bash
cd backend
node seed.js
```
