Dans le cadre de notre stage de 2 mois (Août – Septembre) au sein de Maroc YNOV Campus, nous réalisons deux applications web destinées à moderniser et simplifier la gestion administrative de l'établissement.

Ce projet est mené par une équipe de 17 stagiaires, répartis en deux groupes de développement, sous la supervision d'un chef de projet unique chargé de coordonner les travaux, d'assurer le suivi des différentes phases et de veiller au respect du planning.

L'objectif principal est de concevoir deux solutions fiables, intuitives et sécurisées répondant aux besoins exprimés dans le cahier des charges fourni par l'établissement.

# 🔐 Interface d'Authentification - Portail Ynov

Ce dépôt contient l'intégration front-end du module d'authentification (connexion et récupération de mot de passe). L'interface a été conçue en respectant strictement la charte graphique Ynov Campus (code couleurs, typographie Montserrat, biseau à 21°).

> ⚠️ **État d'avancement : Interface Uniquement (Front-end)**
> Ce projet est actuellement une maquette fonctionnelle côté client destinée à la validation visuelle. Les formulaires ne sont pas encore reliés au back-end. L'intégration de la base de données (Firestore) pour la vérification des identifiants et la sécurisation de l'accès aux modules collaboratifs de gestion (absences, documents) sera implémentée dans la prochaine étape du développement.

## 🛠️ Technologies Utilisées

* **Framework :** React (via Vite)
* **Routage :** React Router DOM (`react-router-dom`)
* **Stylisation :** CSS pur (Variables CSS, Flexbox)
* **Contrôle de version :** Git / GitHub

## ✨ Fonctionnalités Implémentées

* **Page de Connexion (`/`) :** Formulaire de saisie pour l'e-mail institutionnel Ynov et le mot de passe.
* **Page Mot de passe oublié (`/forgot-password`) :** Formulaire de demande de lien de réinitialisation avec simulation d'un message de confirmation.
* **Composant Layout Mutualisé (`AuthLayout`) :** Gestion centralisée du design asymétrique (branding Ynov) pour optimiser la maintenabilité et éviter la duplication de code entre les vues.
* **Navigation interactive :** Redirections fluides entre les interfaces sans rechargement de la page via React Router.

## 📂 Structure du Projet

Voici l'arborescence des fichiers impliqués dans ce module de développement :

```
src/
├── assets/
│   └── ynov-logo.png             # Logo officiel Ynov Campus
├── components/
│   ├── AuthLayout.jsx            # Composant conteneur (panneau gauche branding + formulaire)
│   └── AuthLayout.css            # Styles globaux et structurels partagés
├── pages/
│   ├── LoginPage.jsx             # Vue : Espace de connexion
│   └── ForgotPasswordPage.jsx    # Vue : Demande de réinitialisation
├── App.jsx                       # Configuration du routage (Routes)
└── main.jsx                      # Point d'entrée de l'application

```

# 🚀 Installation et Lancement (Environnement Local)

Cloner le dépôt et basculer sur la branche correspondante :

```
git clone https://github.com/Xiao2602/YNOV-Stage.git
cd YNOV-Stage
git checkout manel-front-end (pour switch dans cette branche du git)
```

Installer les dépendances du projet :
    
  * npm install

Démarrer le serveur de développement :

  * npm run dev
