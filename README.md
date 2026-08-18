# YNOV Absence Management System - Backend API & Auth Interface

Dans le cadre de notre stage de 2 mois (Août – Septembre) au sein de Maroc YNOV Campus, nous réalisons deux applications web destinées à moderniser et simplifier la gestion administrative de l'établissement.

Ce projet est mené par une équipe de 17 stagiaires, répartis en deux groupes de développement, sous la supervision d'un chef de projet unique chargé de coordonner les travaux, d'assurer le suivi des différentes phases et de veiller au respect du planning.

L'objectif principal est de concevoir deux solutions fiables, intuitives et sécurisées répondant aux besoins exprimés dans le cahier des charges fourni par l'établissement.

---

## Overview

This repository contains the RESTful API backend for the YNOV Absence Management System. Built with Node.js, Express, Firebase (Authentication and Firestore Database), Local Disk Storage (`/uploads/`), and Nodemailer for customized HTML email delivery.

User accounts are managed securely via Firebase Admin SDK with Role-Based Access Control (RBAC) supporting 7 system roles: **Admin**, **RH**, **Manager**, **Teacher**, **Employee**, **Student**, and **Parent**.

---

## Guide : How to Create a New API Endpoint (Step-by-Step)

Follow this 4-step architectural pattern to add any new API endpoint to the codebase:

1. **Step 1: Input Validator (`backend/<Module>/Validators/<name>Validator.js`)**:
   Create a validation function that verifies request payload fields (`req.body` or `req.params`) and returns `{ valid: true }` or `{ valid: false, error: "Error message" }`.

2. **Step 2: Business Service (`backend/<Module>/Services/<name>Service.js`)**:
   Implement core business logic, Firestore database queries, Local File Storage operations, or email/notification triggers.

3. **Step 3: Express Controller (`backend/<Module>/Controllers/<name>Controller.js`)**:
   Receive Express HTTP request `req`, invoke the validator, call the service, and return JSON responses with standard HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `403 Forbidden`, `500 Internal Error`).

4. **Step 4: Server Route Registration (`backend/server.js`)**:
   Import your controller in `server.js` and attach it to an Express route using security middleware:
   ```javascript
   app.post("/api/your-endpoint", authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.RH), handleYourController);
   ```

---

## Complete API Reference

### 1. Authentication (`/api/auth`)
- `POST /api/auth/login` (Public): Authenticate user with email and password. Returns Firebase ID Token and user claims.
- `POST /api/auth/reset-password` (Public): Generates a secure password reset link and sends customized HTML email via Nodemailer.
- `POST /api/auth/logout` (Public): Invalidates user session.

### 2. User & Parent Management (`/api/users`)
- `GET /api/users` (Authenticated): Fetch list of all user profiles from Firestore.
- `POST /api/users/create` (Admin / RH): Create user account in Firebase Auth with Custom User Claims and store profile in Firestore.
- `POST /api/roles/assign` (Admin): Assign or update custom claim role for a user.
- `POST /api/users/link-parent-student` (Admin / RH): Link a Parent UID to a Student UID in Firestore (`childrenUids` and `parentUids`).
- `GET /api/users/my-children` (Parent / Admin / RH): Retrieve student profile(s) linked to the logged-in Parent account.

### 3. Absence Core Module (`/api/absences`)
- `POST /api/absences` (Authenticated): Submit a new absence request. Auto-triggers HR email alert and In-App notification.
- `GET /api/absences/my` (Authenticated): Retrieve absence history for the logged-in user.
- `GET /api/absences/children` (Parent / Admin / RH): Retrieve absence records for all students linked to the logged-in Parent.
- `GET /api/absences/pending` (Admin / RH / Manager): Retrieve all requests awaiting review (`status: pending`).
- `GET /api/absences` (Admin / RH / Manager / Teacher): Fetch all absence records with optional status, department, or type filters.
- `PATCH /api/absences/:id/review` (Admin / RH / Manager): Approve or reject an absence request. Triggers email decision alert and In-App notification to student.
- `DELETE /api/absences/:id` (Owner Only): Cancel and delete a pending absence request.

### 4. In-App Notifications Module (`/api/notifications`)
- `GET /api/notifications/my` (Authenticated): Fetch unread and read notifications for current user with unread counter.
- `PATCH /api/notifications/:id/read` (Authenticated): Mark a single notification as read (`read: true`).
- `POST /api/notifications/read-all` (Authenticated): Batch mark all notifications for current user as read.

### 5. Document Uploads (`/api/documents/upload`)
- `POST /api/documents/upload` (Authenticated): Upload medical proof PDF/image file via Multer, save file locally in `backend/uploads/justifications/`, and record metadata in Firestore `documents` collection.

---

## Default Seed Accounts Setup

Run the seed script to automatically create test accounts for all 7 system roles:
```bash
cd backend
node seed.js
```
