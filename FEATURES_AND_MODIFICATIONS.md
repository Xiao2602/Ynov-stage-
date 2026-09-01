# 🚀 Features & Modifications Changelog
**Branch:** `mokhta-develop`  
**Target Comparison:** Changes and new features present on `mokhta-develop` that are **not** in `moise-dev`.

---

## 📌 Executive Summary
This branch introduces a complete overhaul of the **Planning & Schedule system** across all three roles (**Admin, Teacher, and Student**), incorporates full **calendar date intelligence** (day/month/year), builds an **anti-conflict validation engine** (3h minimum interval), provides an enterprise **multi-view timetable** (Week, Month, Year, List), and fixes all user management class assignment flows.

---

## 🌟 1. New Features (Not present on `moise-dev`)

### 1.1. 📅 Enterprise Planning & Timetable Engine (Admin, Teacher, Student)
* **Full Calendar Dates Support (Day / Month / Year)**:
  * Replaced legacy static day-of-week slots with exact calendar date awareness (`YYYY-MM-DD`).
  * Automatic synchronization of French day names (*Lundi, Mardi...*).
  * **Batch Recurring Session Generator**: Generate 12 to 40 weekly dated sessions in 1 click.
  * **Quick `+7j` Duplicate Action**: Duplicate any course to the following week instantly.
  * **Year-Long Excel Importer & Exporter (SheetJS)**: Robust multi-format parser supporting ISO dates, French dates (`DD/MM/YYYY`), and Excel numerical serials.
  * **Pre-built 2026-2027 Excel Template** (`88` sessions) downloadable with 1 click.

### 1.2. 👨‍🏫 Upgraded Professor Schedule View (`TeacherSchedulePage.jsx`)
* **4 Synchronized View Modes**:
  1. **📅 Vue Semaine (Weekly Timetable)**: 5-day grid (`08:00–18:00`) with an elevated **Pause Déjeuner (`12h00–13h00`)** separator that prevents card overflow.
  2. **🗓️ Vue Mois (Monthly Calendar)**: 7-column calendar matrix with day session chips and day counters.
  3. **📆 Vue Année (Annual Matrix)**: 10-month academic overview (Sep -> Jun) with hours breakdown and quick drill-down buttons.
  4. **📋 Vue Liste (Chronological Feed)**: Searchable table with direct **"Émarger"** action buttons.
* **Smart Vertical Cluster Stacking**:
  * Concurrent/overlapping courses on the same slot stack vertically at **100% full column width** instead of squishing into unreadable horizontal strips.
* **Strict Date Isolation**:
  * Weekly views strictly display courses belonging to the active week, preventing semester mixing.
* **Dynamic Context-Aware Navigation**:
  * Navigation reset button dynamically displays `Cette semaine`, `Ce mois-ci`, or `Cette année` based on the active view.
* **Adjustable Date Interval Filter**:
  * Custom `Date début` à `Date fin` range filter with 1-click `Effacer` reset.
* **Live Period KPI Strip**:
  * Real-time counters for Scheduled Sessions, Total Teaching Volume, Distinct Classes, and Next Upcoming Course countdown.
* **Interactive Session Modal**:
  * Click any session card to inspect complete details and launch the attendance call sheet (`/pedagogie/appel`).

### 1.3. 🎓 Dedicated Student Schedule View (`StudentSchedulePage.jsx`)
* **100% Feature Parity with Teacher View**:
  * Provides the exact same 4 view modes (Week, Month, Year, List), KPI strip, date interval filter, search, and dynamic navigation.
* **Zero Clutter**:
  * Removed class filter dropdown since students are automatically bound to their own enrolled promotion (*e.g., Bachelor 3 - Génie Logiciel*).
* **Professor Name Attribution**:
  * Each card and modal displays the designated instructor (`👨‍🏫 Nom du professeur`).
* **Dedicated Backend Aggregation (`GET /api/plannings/student/my`)**:
  * Dynamically aggregates courses across all instructors for the student's assigned class and delivers a chronologically sorted timetable.

### 1.4. 🛑 3-Hour Minimum Interval & Conflict Rejection Engine
* **Backend Validation Rule** (`backend/server.js` & `backend/Services/planningService.js`):
  * Strictly rejects creating/assigning overlapping courses for the same professor with less than a 3-hour separation.
  * Responds with descriptive `HTTP 400 Bad Request` alerts indicating the exact conflicting courses, date, and time.
* **Client-Side Pre-Validation** (`AssignPlanningPage.jsx`):
  * Alerts administrators immediately upon Excel import or before saving.

### 1.5. 👥 Users Management & Role Modal Decoupling (`UsersPage.jsx`)
* **Decoupled Student & Teacher Modals**:
  * Clicking the folder action on a **Teacher** opens the multi-checkbox assignment modal (`POST /api/users/assign-teacher`).
  * Clicking the folder action on a **Student** opens the dedicated single-class swap dropdown modal (`PATCH /api/users/:uid`).
* **Optimized Table Layout & Badges**:
  * Compact 2-per-line structured class badges with automatic acronyms (*B3 GL, M1 Cyber, B3 IA*).
  * Ergonomic 28px action buttons grid with dedicated 14% table column allocation.
  * Direct Excel export of users list.

---

## 📂 2. List of Modified & Added Files

### 🖥️ Frontend Files
| File Path | Status | Summary of Modifications |
|---|---|---|
| `frontend/src/pages/StudentSchedulePage.jsx` | **NEW** | Dedicated Student Schedule Page with 4 view modes, period filter, search, and modal. |
| `frontend/src/pages/StudentPages.css` | **NEW** | Dedicated CSS design system for the student schedule interface. |
| `frontend/src/pages/TeacherSchedulePage.jsx` | **MODIFIED** | Complete multi-view rewrite (Week/Month/Year/List), date interval filter, anti-squish vertical clustering, safe date normalization. |
| `frontend/src/pages/TeacherPages.css` | **MODIFIED** | Upgraded timetable grid, KPI bar, toolbar, elevated lunch break, and course card styles. |
| `frontend/src/pages/AssignPlanningPage.jsx` | **MODIFIED** | Full calendar date picker, batch recurring generator, 88-session Excel template generator & importer, 3h conflict checker. |
| `frontend/src/pages/AssignPlanningPage.css` | **MODIFIED** | Table & grid view toggle styles, batch recurring modal, and planning KPI summary strip. |
| `frontend/src/pages/TeacherAttendancePage.jsx` | **MODIFIED** | Safeguarded planning parser against undefined courses / data structure variations. |
| `frontend/src/pages/UsersPage.jsx` | **MODIFIED** | Decoupled student class swap modal from teacher modal, 28px buttons, balanced badges. |
| `frontend/src/components/DashboardLayout.jsx` | **MODIFIED** | Added "Mon planning" navigation link for student & parent roles in sidebar. |
| `frontend/src/components/Icons.jsx` | **MODIFIED** | Added `IconChevronLeft`, `IconChevronRight`, `IconMapPin`, and cleaned icon exports. |
| `frontend/src/App.jsx` | **MODIFIED** | Registered `/planning` and `/etudiant/planning` student schedule routes. |
| `frontend/public/template_planning_annuel_2026_2027.xlsx` | **NEW** | Static 88-session 2026-2027 annual planning template for in-app download. |

### ⚙️ Backend Files
| File Path | Status | Summary of Modifications |
|---|---|---|
| `backend/server.js` | **MODIFIED** | Added `GET /api/plannings/student/my` endpoint, 3h conflict validation on `POST /api/plannings/assign`, chronological sorting. |
| `backend/Services/planningService.js` | **MODIFIED** | Integrated `validatePlanningConflicts` (3h minimum separation check) and date normalization. |
| `backend/Auth/Users/userController.js` | **MODIFIED** | Enabled `className` update in allowed fields for student single-swap class endpoint. |
| `backend/Auth/Users/userService.js` | **MODIFIED** | Properly saved student `className` on user creation. |

### 📦 Root Files
| File Path | Status | Summary of Modifications |
|---|---|---|
| `planning_annuel_2026_2027.xlsx` | **NEW** | Ready-to-use 88-session Excel schedule template file. |
| `FEATURES_AND_MODIFICATIONS.md` | **NEW** | Comprehensive changelog and release notes document. |

---

## 📡 3. New & Updated API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/plannings/student/my` | Authenticated Student | Aggregates all scheduled classes for the logged-in student's promotion with instructor names. |
| `GET` | `/api/plannings/:teacherUid` | Authenticated / Admin | Retrieves normalized annual planning for a specific teacher. |
| `POST` | `/api/plannings/assign` | Admin / Employee | Assigns annual planning with strict date normalization and 3h conflict validation. |
| `PATCH` | `/api/users/:uid` | Admin / Employee | Updates user fields including single student `className` re-assignment. |
