# Release Notes & New Features (Post-Planning Update)

> **Branch:** `mokhta-develop`  
> **Scope:** Additions, fixes, and architectural enhancements implemented after the initial planning module release.

---

## 1. New Features & Fixes

### 1.1. Automatic Student Notifications on Confirmed Teacher Absence
* **Admin-Approval Trigger (`PATCH /api/absences/:id/review`)**:
  * Automatically activates **only** when an administrator or HR approves a teacher's absence request (`status === 'approved'` and `role === 'teacher'`).
  * If the request is pending or rejected, no notifications are triggered.
* **Targeted Course Identification**:
  * Queries `plannings/{teacherUid}` to find all sessions scheduled within the absence window (`startDate <= course.date <= endDate`).
* **Automated Multi-Recipient Delivery**:
  * For each cancelled session, identifies all students enrolled in the corresponding class (`course.group`).
  * Dispatches In-App warning notifications (`type: "warning"`) to every affected student:
    * **Title**: `⚠️ Cours annulé : [Nom du cours]`
    * **Message**: `Le cours "[Nom du cours]" prévu le [Date] à [Heure] (Salle [X]) est annulé en raison de l'absence confirmée de [Nom du professeur].`
  * Automatically alerts linked parents (`parentUids`) if applicable.
* **Timetable Visual Cancellation Badges (`isCancelled: true`)**:
  * Both student schedule (`GET /api/plannings/student/my`) and teacher schedule (`GET /api/plannings/:teacherUid`) cross-reference approved teacher absences in real-time.
  * Sessions falling within an approved absence display a **`⚠️ Annulé`** badge across Week, Month, and List views.
  * Opening the session modal displays an alert banner explaining the cancellation.

---

### 1.2. Complete Overhaul of the PDF & Excel Export Engine
* **Resolved the 0 MB Empty PDF Bug**:
  * Wrapped PDFKit stream generation into an asynchronous `Promise` that awaits the stream `end` event before buffer concatenation, preventing empty 0-byte file generation.
  * Added `Content-Length` response header in `absenceController.js`.
* **Inclusion & Accurate Status Mapping for Treated Absences**:
  * Accurately displays treated requests (**Validée** and **Rejetée**) instead of mislabeling them as "En attente".
  * Color-coded status badges:
    * **Validée** (Green `#16a34a`) for approved requests.
    * **Rejetée** (Red `#dc2626`) for rejected and non-justified requests (`to_justify`).
    * **En attente** (Amber `#d97706`) for pending requests.
  * Includes the reviewer name (*"Traité par"*) and admin review notes.
* **Fixed Date Filter State Collision in `RequestsPage.jsx`**:
  * Resolved variable collision where export was reading `startDate` / `endDate` (creation modal state defaulted to today) instead of the table filter variables (`startDateFilter` / `endDateFilter`).
* **Direct Table Synchronization (`POST` + `GET`)**:
  * `RequestsPage.jsx` transmits the currently filtered table rows (`filteredRequests`) via `POST /api/absences/export/pdf` and `/excel` to ensure 100% fidelity between on-screen data and the exported file.
  * Standalone `GET` queries with URL parameters are also fully supported.
* **Executive Multi-Page Layout**:
  * A4 Landscape format (780 pt printable width), dark brand header banner (`#0f172a`), zebra striping, and repeating table headers across all pages.

---

## 2. Summary of Modified Files

| File Path | Component | Summary of Changes |
|---|---|---|
| `backend/Absence/Services/absenceService.js` | Backend Service | • Asynchronous Promise-wrapped PDF buffer resolution.<br>• Accurate status mapping for treated absences.<br>• Implementation of `notifyStudentsOfTeacherAbsence` on admin confirmation.<br>• Support for custom dataset payload (`POST`). |
| `backend/Absence/Controllers/absenceController.js` | Backend Controller | • Added `Content-Length` header for binary PDF responses.<br>• Forwarded `req.body.absences` to PDF and Excel services. |
| `backend/server.js` | Backend Routing | • Enabled `app.all` on export routes (`GET` + `POST`).<br>• Dynamically flagged courses occurring during confirmed teacher absences with `isCancelled: true` in student and teacher planning endpoints. |
| `frontend/src/pages/RequestsPage.jsx` | Frontend Page | • Fixed `startDateFilter` / `endDateFilter` variable collision.<br>• Export handler now sends active `filteredRequests` via `POST`. |
| `frontend/src/pages/StudentSchedulePage.jsx` | Frontend Page | • Added `⚠️ Annulé` badges on course cards (Week, Month, List views).<br>• Added prominent cancellation alert banner in course detail modal. |
| `frontend/src/pages/TeacherSchedulePage.jsx` | Frontend Page | • Added `⚠️ Annulé` badges on course cards and cancellation warning in modal. |

---

## 3. Updated API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `ALL` | `/api/absences/export/pdf` | Admin / RH | Generates formatted PDF report. Supports `GET` with query filters and `POST` with exact client table dataset. |
| `ALL` | `/api/absences/export/excel` | Admin / RH | Generates formatted Excel workbook. Supports `GET` with query filters and `POST` with exact client table dataset. |
| `PATCH` | `/api/absences/:id/review` | Admin / RH | Reviews absence; triggers automatic student/parent cancellation notifications if approved for a teacher. |
| `GET` | `/api/plannings/student/my` | Authenticated Student | Returns student schedule with `isCancelled: true` flags on sessions matching approved teacher absences. |
| `GET` | `/api/plannings/:teacherUid` | Authenticated Teacher / Admin | Returns teacher schedule with `isCancelled: true` flags on sessions matching approved teacher absences. |
