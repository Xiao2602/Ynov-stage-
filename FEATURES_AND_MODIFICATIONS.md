# Release Notes & New Features (Manager Role Purge & Parent Functionality Upgrade)

> **Branch:** `mokhta-develop`  
> **Scope:** Complete elimination and purge of the legacy `manager` role across backend and frontend; comprehensive upgrade of the `parent` role into a first-class citizen with live student linking, dynamic parent dashboard, children absence tracking, and timetable viewing.

---

## 1. New Features & Modifications

### 1.1. Complete Purge of the Legacy `manager` Role
* **Backend Role Definitions & Verification**:
  * Removed `MANAGER: "manager"` from [`backend/Shared/Roles/roles.js`](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/backend/Shared/Roles/roles.js).
  * Removed `"manager"` from `ALLOWED_ROLES` in [`backend/Auth/Roles & Permissions/roleService.js`](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/backend/Auth/Roles%20&%20Permissions/roleService.js).
  * Removed `ROLES.MANAGER` authorizations from `/api/absences/pending`, `/api/absences`, and `/api/absences/:id/review` in [`backend/server.js`](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/backend/server.js).
  * Purged the demo `manager@ynov.com` account from [`backend/seed.js`](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/backend/seed.js) and normalized the database seed recap to 6 core roles.
  * Cleaned up role notifications and labels in [`backend/Services/emailService.js`](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/backend/Services/emailService.js).
* **Frontend Access & Interface Cleanup**:
  * Removed `manager` from `roleLabels` and `staffRoles` in [`frontend/src/components/DashboardLayout.jsx`](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/frontend/src/components/DashboardLayout.jsx).
  * Removed `manager` routing case and role permissions in [`frontend/src/pages/DashboardPage.jsx`](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/frontend/src/pages/DashboardPage.jsx) and [`frontend/src/pages/DashboardOverview.jsx`](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/frontend/src/pages/DashboardOverview.jsx).
  * Removed `manager` badge styles and creation modal references in [`frontend/src/pages/UsersPage.jsx`](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/frontend/src/pages/UsersPage.jsx).

---

### 1.2. Parent Role Functional Activation & Upgrades
* **Backend Child Identity Hydration (`GET /api/auth/me`)**:
  * Updated `handleGetMe` in [`backend/Auth/Authentication/authController.js`](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/backend/Auth/Authentication/authController.js) so that parent accounts automatically retrieve hydrated student objects (`uid`, `displayName`, `email`, `className`, `department`) based on their `childrenUids` array.
* **Child Timetable Viewing for Parents (`GET /api/plannings/student/my`)**:
  * Updated planning endpoint in [`backend/server.js`](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/backend/server.js) to accept a `studentUid` query parameter when requested by a parent.
  * Enforced authorization checks ensuring the requested `studentUid` belongs to the parent's `childrenUids`.
  * Returns `studentClass`, `studentName`, and full schedule sessions.
* **Live Parent Dashboard Overview ([DashboardOverview.jsx](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/frontend/src/pages/DashboardOverview.jsx))**:
  * Replaced static placeholders with a real-time reactive family dashboard.
  * Real KPI cards for active student absences, unexcused tardiness, and deadlines requiring justification.
  * Per-child interactive overview cards showing class, student email, absence summary, and direct jump buttons to their timetable and absence history.
* **Multi-Child Absence Tracking ([MyAbsencesPage.jsx](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/frontend/src/pages/MyAbsencesPage.jsx))**:
  * Seamlessly switches to `/api/absences/children` when accessed by a parent user.
  * Displays a child switcher dropdown selector when a parent has multiple enrolled children.
  * Added dedicated `Élève` column to the table displaying student name and class badge.
* **Parent Timetable Child Switcher ([StudentSchedulePage.jsx](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/frontend/src/pages/StudentSchedulePage.jsx))**:
  * Added child switcher selector in the schedule navigation toolbar.
  * Allows switching between children and updating URL query parameters (`?studentUid=...`).
  * Dynamic header displaying the active child's name and class.
* **Administrative Parent-Student Linking ([UsersPage.jsx](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/frontend/src/pages/UsersPage.jsx))**:
  * Added `parent` to `roleOptions` and role filtering dropdown.
  * Distinct soft-blue badge styling for the `parent` role.
  * Column 4 displays linked children count for parent accounts.
  * Added action button (`IconUsers`) opening an interactive modal allowing administrators to assign **multiple children** to a single parent in one batch:
    * Real-time student search filter by name, email, or class.
    * Interactive checklist with current children pre-selected.
    * Real-time selection counter badge and quick "Tout décocher" button.
    * Full synchronization via `POST /api/users/link-parent-student` supporting an array of `studentUids` with bidirectional cleanup.
* **Automatic Teacher Absence Notifications to Students & Parents ([absenceService.js](file:///c:/Users/mokht/OneDrive/Desktop/Stage%202026/backend/Absence/Services/absenceService.js))**:
  * Upon admin/RH approval of a teacher's absence (`PATCH /api/absences/:id/review`), the system resolves all affected courses in the teacher's schedule.
  * Resolves all students enrolled in matching classes and **bidirectionally indexes all linked parents** (checking both `student.parentUids` and `parent.childrenUids`).
  * Dispatches real-time **In-App notifications** to both the student and all linked parents with personalized details (child name, course title, date, time, room, teacher name).
  * Sends automated **Email Alerts** (`sendCourseCancellationEmail`) via Nodemailer to students and parents when SMTP is configured.
  * Deduplicates alerts per course/recipient to prevent redundant messages.
  * Timetable UI (`StudentSchedulePage.jsx`) reflects cancelled sessions with red visual badges.

---

## 2. Summary of Modified Files

| File Path | Component | Summary of Changes |
|---|---|---|
| `backend/Shared/Roles/roles.js` | Backend Roles | Purged `MANAGER: "manager"`. |
| `backend/Auth/Roles & Permissions/roleService.js` | Backend Auth | Removed `"manager"` from `ALLOWED_ROLES`. |
| `backend/Auth/Authentication/authController.js` | Backend Auth | Hydrated `children` profile details (`uid`, `displayName`, `email`, `className`) in `handleGetMe` for parents. |
| `backend/server.js` | Backend Server | Removed `ROLES.MANAGER` from absence routes; added parent support with `studentUid` query parameter in `GET /api/plannings/student/my`. |
| `backend/seed.js` | Backend Seed | Removed demo `manager@ynov.com` account and normalized recap output. |
| `backend/Services/emailService.js` | Backend Service | Removed `manager` from `roleLabels`. |
| `frontend/src/components/DashboardLayout.jsx` | Frontend Layout | Removed `manager` role label; fixed `childCount` calculation for parents. |
| `frontend/src/pages/ProfilePage.jsx` | Frontend Page | Removed `manager` from staff checks; enhanced children list display with student name, class, and email. |
| `frontend/src/pages/DashboardPage.jsx` | Frontend Page | Removed `manager` role allowance and navigation handler. |
| `frontend/src/pages/DashboardOverview.jsx` | Frontend Page | Removed `manager` from admin roles; built complete reactive Parent Dashboard with KPIs and child cards. |
| `frontend/src/pages/MyAbsencesPage.jsx` | Frontend Page | Calls `/api/absences/children` for parents; added child selector dropdown and `Élève` table column. |
| `frontend/src/pages/StudentSchedulePage.jsx` | Frontend Page | Added child selector toolbar for parents; fetches timetable for selected child (`?studentUid=...`). |
| `frontend/src/pages/UsersPage.jsx` | Frontend Page | Replaced `manager` with `parent`; added parent-student linking action modal and linked children count. |
| `FEATURES_AND_MODIFICATIONS.md` | Documentation | Updated release notes with complete documentation of changes. |

---

## 3. Updated API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/plannings/student/my` | Student, Parent | Returns schedule of current student or, for a parent, of the child specified by `studentUid` (verified against `childrenUids`). |
| `GET` | `/api/absences/children` | Parent | Returns all absences for students linked to the authenticated parent account. |
| `POST` | `/api/users/link-parent-student` | Admin, RH | Bidirectionally links a parent user document and one or multiple student user documents (`parentUids` & `childrenUids`). Accepts `studentUids` array or `studentUid`. |
