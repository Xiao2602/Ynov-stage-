# Ynov Stage — Gestion des absences et documents

Application web interne pour la gestion des utilisateurs, plannings, appels, absences, justificatifs et documents administratifs de Maroc Ynov Campus.

## Fonctionnalités principales

- Authentification Firebase avec gestion des rôles et double authentification.
- Tableaux de bord adaptés aux administrateurs, personnels, professeurs, étudiants et parents.
- Déclaration, justification et traitement des absences et retards.
- Génération et gestion de documents administratifs.
- Stockage centralisé des nouveaux documents dans un bucket privé Supabase.
- Gestion des comptes, des plannings et des notifications.

## Prérequis

- Node.js 20 ou plus récent
- npm
- Un projet Firebase déjà configuré (Authentication et Firestore)
- Un projet Supabase avec un bucket privé nommé `ynov-documents`

## Installation

```bash
git clone -b moise-dev https://github.com/Xiao2602/Ynov-stage-.git
cd Ynov-stage-
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Le frontend démarre habituellement sur `http://localhost:5173`.

### Backend

Dans un second terminal :

```bash
cd backend
npm install
npm run dev
```

Le backend démarre habituellement sur `http://localhost:5000`.

## Configuration privée

Les fichiers contenant des secrets ne sont volontairement pas inclus dans Git.

### Backend

1. Copiez `backend/.env.example` vers `backend/.env`.
2. Demandez moi les valeurs SMTP, Supabase et les accès Firebase.
3. Ajoutez le fichier de compte de service Firebase à la racine du projet ou dans `backend/`. Ce fichier reste local et est ignoré par Git.

Variables Supabase requises dans `backend/.env` :

```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SECRET_KEY=sb_secret_votre_cle_secrete
SUPABASE_BUCKET=ynov-documents
```

La clé Supabase est utilisée uniquement par le backend. Le bucket doit rester privé.

### Frontend

Si l’URL du backend diffère de `http://localhost:5000/api`, créez `frontend/.env.local` :

```env
VITE_API_URL=http://localhost:5000/api
```

## Vérification rapide

1. Démarrez backend et frontend.
2. Connectez-vous avec un compte de test autorisé.
3. Vérifiez la création d’une absence, l’ajout d’un justificatif et la consultation du document.
4. Vérifiez que les nouveaux documents apparaissent dans Supabase Storage, bucket `ynov-documents`.

## Sécurité

- Les clés privées, `.env`, comptes de service Firebase, documents locaux et `node_modules` sont ignorés par Git.
- Les permissions ne doivent jamais être accordées uniquement par le frontend : le backend applique les rôles et contrôles d’accès.
- En cas de partage accidentel d’une clé secrète, révoquez-la puis créez-en une nouvelle immédiatement.
