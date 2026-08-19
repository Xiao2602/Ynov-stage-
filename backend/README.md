# Backend API - Projet Gestion des Absences (Maroc YNOV Campus)

## Structure du projet (Dossiers et Modules)

```text
backend/
├── Auth/
│   ├── Authentication/
│   │   ├── authController.js        # Endpoints Express (login, reset password, logout)
│   │   ├── authService.js           # Services Firebase Auth Client
│   │   └── customEmailService.js    # Envoi d'emails HTML personnalisés
│   ├── Users/
│   │   ├── userController.js        # Endpoints Express (create user, get users)
│   │   └── userService.js           # Services Admin SDK (création compte & Firestore)
│   └── Roles & Permissions/
│       ├── roleController.js        # Endpoint d'assignation de rôles
│       └── roleService.js           # Gestion des Custom Claims Firebase
│
├── Absence/                         # Réservé pour la suite du projet
│   ├── Controllers/
│   ├── Services/
│   └── Validators/
│
├── Documents/                       # Réservé pour la suite du projet
│   ├── Controllers/
│   ├── Services/
│   └── Validators/
│
└── Shared/
    ├── Firebase config/
    │   └── firebase.js              # Config Firebase Client & Admin SDK
    ├── Authentication middleware/
    │   └── authMiddleware.js        # Middleware Token Bearer & Vérification des Rôles (RBAC)
    ├── Roles/
    │   └── roles.js                 # Constantes des rôles (Admin, RH, Manager, Student...)
    ├── Permissions/
    │   └── permissions.js           # Constantes des permissions
    └── Utilities/
        └── utilities.js             # Formateurs de réponses API
```

---

## Démarrage du serveur pour Postman

1. **Installer les dépendances** :
   ```bash
   cd backend
   npm install
   ```

2. **Lancer le serveur API REST** :
   ```bash
   npm start
   # ou en mode developpement avec rechargement automatique :
   npm run dev
   ```
   Le serveur démarrera sur **`http://localhost:5000`**.

---

## Endpoints à tester dans Postman

### 1. Auth - Connexion (Login)
* **Méthode** : `POST`
* **URL** : `http://localhost:5000/api/auth/login`
* **Headers** : `Content-Type: application/json`
* **Body** (JSON) :
  ```json
  {
    "email": "votre_email@ynov.com",
    "password": "votre_mot_de_passe"
  }
  ```
* **Réponse** : Renvoie les infos de l'utilisateur + le `token` JWT Bearer à utiliser pour les requêtes sécurisées.

### 2. Auth - Réinitialiser le mot de passe (Reset Password)
* **Méthode** : `POST`
* **URL** : `http://localhost:5000/api/auth/reset-password`
* **Headers** : `Content-Type: application/json`
* **Body** (JSON) :
  ```json
  {
    "email": "votre_email@ynov.com"
  }
  ```

### 3. Users - Créer un compte utilisateur (Admin / RH uniquement)
* **Méthode** : `POST`
* **URL** : `http://localhost:5000/api/users/create`
* **Headers** : 
  * `Content-Type: application/json`
  * `Authorization: Bearer <ID_TOKEN_ADMIN>`
* **Body** (JSON) :
  ```json
  {
    "email": "etudiant@ynov.com",
    "password": "Password123!",
    "displayName": "Yassine Alami",
    "role": "student",
    "department": "Informatique"
  }
  ```

### 4. Fichier de collection Postman inclus
Vous pouvez importer le fichier **`YNOV_Absence_API.postman_collection.json`** directement dans Postman pour tester tous ces endpoints en 1 clic.
