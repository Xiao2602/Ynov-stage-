import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IconCalendar,
  IconSearch,
  IconFilter,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconMapPin,
  IconUser,
  IconUsers,
  IconCheckCircle,
  IconX
} from '../components/Icons';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import './StudentPages.css';

const DAYS_NAME = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// Helper robuste pour garantir un objet Date valide sans jamais crasher
function safeDate(val, fallback = new Date()) {
  if (!val) return fallback;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? fallback : val;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const [y, m, d] = trimmed.split('T')[0].split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return isNaN(dt.getTime()) ? fallback : dt;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
      const [d, m, y] = trimmed.split('/').map(Number);
      const dt = new Date(y, m - 1, d);
      return isNaN(dt.getTime()) ? fallback : dt;
    }
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? fallback : parsed;
  }
  if (typeof val === 'number') {
    const dt = new Date(val);
    return isNaN(dt.getTime()) ? fallback : dt;
  }
  return fallback;
}

// Formate en YYYY-MM-DD
function formatDateIso(d) {
  const safe = safeDate(d);
  const y = safe.getFullYear();
  const m = String(safe.getMonth() + 1).padStart(2, '0');
  const day = String(safe.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Calcule le lundi de la semaine
function getMonday(d) {
  const safe = safeDate(d);
  const day = safe.getDay();
  const diff = safe.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(safe.getFullYear(), safe.getMonth(), diff);
}

// Formate une date en français lisible
function formatFrenchDateDisplay(val) {
  if (!val) return '';
  try {
    const safe = safeDate(val, null);
    if (!safe) return String(val);
    return safe.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (_) {
    return String(val || '');
  }
}

// Abréviation de classe
function formatClassAbbrev(className = '') {
  if (!className) return '—';
  let str = String(className).trim();
  str = str.replace(/\bBachelor\s*1\b/gi, 'B1');
  str = str.replace(/\bBachelor\s*2\b/gi, 'B2');
  str = str.replace(/\bBachelor\s*3\b/gi, 'B3');
  str = str.replace(/\bMaster\s*1\b/gi, 'M1');
  str = str.replace(/\bMaster\s*2\b/gi, 'M2');
  str = str.replace(/\bMastère\s*1\b/gi, 'M1');
  str = str.replace(/\bMastère\s*2\b/gi, 'M2');
  str = str.replace(/\bGénie\s*Logiciel\b/gi, 'GL');
  str = str.replace(/\bCybersécurité\b/gi, 'Cyber');
  str = str.replace(/\bIntelligence\s*Artificielle\b/gi, 'IA');
  str = str.replace(/\bInformatique\b/gi, 'Info');
  str = str.replace(/\bMarketing\s*Digital\b/gi, 'MKT');
  str = str.replace(/\bDesign\s*Graphique\b/gi, 'Design');
  str = str.replace(/\s*-\s*/g, ' ');
  return str.trim();
}

export default function StudentSchedulePage() {
  const { user, role, backendUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const childrenList = Array.isArray(backendUser?.children) ? backendUser.children : [];
  const initialChildUid = searchParams.get('studentUid') || (childrenList[0]?.uid || '');
  const [selectedChildUid, setSelectedChildUid] = useState(initialChildUid);
  const [activeChildName, setActiveChildName] = useState('');

  const [courses, setCourses] = useState([]);
  const [studentClass, setStudentClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mode de vue : 'week' | 'month' | 'year' | 'list'
  const [viewMode, setViewMode] = useState('week');

  // Date courante de navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filtre d'intervalle personnalisé
  const [isIntervalActive, setIsIntervalActive] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de détails de cours
  const [selectedCourseModal, setSelectedCourseModal] = useState(null);

  // 1. Charger le planning de la classe de l'étudiant
  useEffect(() => {
    const fetchStudentPlanning = async () => {
      setLoading(true);
      setError('');
      try {
        const queryParam = role === 'parent' && selectedChildUid ? `?studentUid=${selectedChildUid}` : '';
        const data = await apiFetch(`/plannings/student/my${queryParam}`);
        if (data && data.success) {
          setStudentClass(data.studentClass || '');
          setActiveChildName(data.studentName || '');
          const rawCourses = Array.isArray(data.courses) ? data.courses : [];
          
          const normalized = rawCourses.map((c, idx) => {
            const safeDt = c.date ? safeDate(c.date, null) : null;
            const isoDate = safeDt ? formatDateIso(safeDt) : (c.date || '');
            const dayName = c.day || (safeDt ? DAYS_FR[safeDt.getDay()] : 'Lundi');

            return {
              id: c.id || `scourse-${idx}-${Date.now()}`,
              date: isoDate,
              day: dayName || 'Lundi',
              start: typeof c.start === 'string' && c.start ? c.start : '09:00',
              duration: Number(c.duration) || 2,
              title: c.title ? String(c.title).trim() : 'Cours sans titre',
              group: c.group ? String(c.group).trim() : (data.studentClass || 'Ma classe'),
              room: c.room ? String(c.room).trim() : 'Salle 402',
              teacherName: c.teacherName || 'Professeur',
              isCancelled: Boolean(c.isCancelled)
            };
          });

          setCourses(normalized);

          // Caler automatiquement la vue sur le premier cours si aujourd'hui est hors période
          const withDates = normalized.filter((c) => c.date);
          if (withDates.length > 0) {
            const firstDate = safeDate(withDates[0].date);
            const now = new Date();
            if (now < firstDate || now.getFullYear() < firstDate.getFullYear()) {
              setCurrentDate(firstDate);
            }
          }
        } else {
          setCourses([]);
          if (data?.error) setError(data.error);
        }
      } catch (err) {
        console.error('Erreur chargement planning étudiant:', err);
        setError('Erreur lors du chargement de votre emploi du temps : ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentPlanning();
  }, [user, selectedChildUid, role]);

  // Vérifier si le planning contient des dates de calendrier explicites
  const hasExplicitDates = useMemo(() => {
    return courses.some((c) => c.date && c.date.trim() !== '');
  }, [courses]);

  // Filtrage par recherche et intervalle de dates (sans filtre de classe car l'étudiant a sa propre classe)
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Recherche textuelle
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const mTitle = (c.title || '').toLowerCase().includes(q);
        const mTeacher = (c.teacherName || '').toLowerCase().includes(q);
        const mRoom = (c.room || '').toLowerCase().includes(q);
        const mDate = (c.date || '').includes(q);
        if (!mTitle && !mTeacher && !mRoom && !mDate) return false;
      }

      // Intervalle de dates personnalisé
      if (isIntervalActive) {
        if (customStartDate && c.date && c.date < customStartDate) return false;
        if (customEndDate && c.date && c.date > customEndDate) return false;
      }

      return true;
    });
  }, [courses, searchTerm, isIntervalActive, customStartDate, customEndDate]);

  // Statistiques de la période sélectionnée
  const periodStats = useMemo(() => {
    const totalSessions = filteredCourses.length;
    const totalHours = filteredCourses.reduce((acc, c) => acc + (Number(c.duration) || 2), 0);

    const todayIso = formatDateIso(new Date());
    const upcoming = filteredCourses
      .filter((c) => c.date && c.date >= todayIso)
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];

    return {
      totalSessions,
      totalHours,
      studentClass: studentClass || 'Étudiant',
      upcoming
    };
  }, [filteredCourses, studentClass]);

  // Navigation (Semaine / Mois / Année)
  const handlePrev = () => {
    const safeCur = safeDate(currentDate);
    const d = new Date(safeCur);
    if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'year') {
      d.setFullYear(d.getFullYear() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const safeCur = safeDate(currentDate);
    const d = new Date(safeCur);
    if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'year') {
      d.setFullYear(d.getFullYear() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const clearCustomInterval = () => {
    setIsIntervalActive(false);
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // ==========================================================
  // CALCULS POUR LA VUE SEMAINE (ISOLATION STRICTE PAR DATE)
  // ==========================================================
  const weekDays = useMemo(() => {
    try {
      const safeCur = safeDate(currentDate);
      const monday = getMonday(safeCur);
      const days = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push({
          dateObj: d,
          isoDate: formatDateIso(d),
          dayName: DAYS_NAME[i] || 'Jour',
          displayDate: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          isToday: formatDateIso(d) === formatDateIso(new Date())
        });
      }
      return days;
    } catch (err) {
      console.error('Erreur calcul jours semaine étudiant:', err);
      return [];
    }
  }, [currentDate]);

  // Extraction des cours de la semaine
  const weekCourses = useMemo(() => {
    const weekIsoDates = new Set(weekDays.map((d) => d.isoDate));

    if (hasExplicitDates) {
      return filteredCourses.filter((c) => c.date && weekIsoDates.has(c.date));
    } else {
      const seen = new Set();
      return filteredCourses.filter((c) => {
        const key = `${c.day}-${c.start}-${c.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return DAYS_NAME.includes(c.day);
      });
    }
  }, [filteredCourses, weekDays, hasExplicitDates]);

  // Positionnement dans la grille hebdomadaire
  const getCourseWeekPosition = (course) => {
    try {
      let dayIndex = 0;
      if (course.date && Array.isArray(weekDays) && weekDays.length > 0) {
        dayIndex = weekDays.findIndex((wd) => wd.isoDate === course.date);
      } else {
        dayIndex = DAYS_NAME.indexOf(course.day);
      }
      if (dayIndex === -1) dayIndex = 0;

      const startStr = course.start || '09:00';
      const startHour = parseInt(startStr.split(':')[0] || '9', 10);
      const isMorning = startHour < 12;

      let startRow = 2;
      let maxAllowedSpan = 1;

      if (isMorning) {
        const hourOffset = Math.max(0, Math.min(startHour - 8, 3));
        startRow = 2 + hourOffset;
        maxAllowedSpan = Math.max(1, 6 - startRow);
      } else {
        const hourOffset = Math.max(0, Math.min(startHour - 13, 4));
        startRow = 7 + hourOffset;
        maxAllowedSpan = Math.max(1, 12 - startRow + 1);
      }

      const requestedDuration = Number(course.duration) || 2;
      const span = Math.min(requestedDuration, maxAllowedSpan);
      const col = dayIndex + 2;

      return { row: startRow, span, col };
    } catch (_) {
      return { row: 2, span: 2, col: 2 };
    }
  };

  // Regroupement vertical propre
  const weekCourseClusters = useMemo(() => {
    try {
      const dayGroups = {};
      weekCourses.forEach((c) => {
        const pos = getCourseWeekPosition(c);
        const key = pos.col;
        if (!dayGroups[key]) dayGroups[key] = [];
        dayGroups[key].push({ ...c, pos });
      });

      const clusters = [];

      Object.values(dayGroups).forEach((coursesInDay) => {
        const sorted = coursesInDay.slice().sort((a, b) => {
          if (a.pos.row !== b.pos.row) return a.pos.row - b.pos.row;
          return b.pos.span - a.pos.span;
        });

        let currentCluster = null;

        sorted.forEach((course) => {
          const cStart = course.pos.row;
          const cEnd = course.pos.row + course.pos.span;

          if (!currentCluster) {
            currentCluster = {
              col: course.pos.col,
              startRow: cStart,
              endRow: cEnd,
              courses: [course]
            };
          } else {
            if (cStart < currentCluster.endRow) {
              currentCluster.courses.push(course);
              currentCluster.endRow = Math.max(currentCluster.endRow, cEnd);
            } else {
              clusters.push(currentCluster);
              currentCluster = {
                col: course.pos.col,
                startRow: cStart,
                endRow: cEnd,
                courses: [course]
              };
            }
          }
        });

        if (currentCluster) {
          clusters.push(currentCluster);
        }
      });

      return clusters.map((cl, idx) => ({
        id: `scluster-${cl.col}-${cl.startRow}-${idx}`,
        col: cl.col,
        row: cl.startRow,
        span: cl.endRow - cl.startRow,
        courses: cl.courses
      }));
    } catch (err) {
      console.error('Erreur clustering cours étudiant:', err);
      return [];
    }
  }, [weekCourses, weekDays]);

  // ==========================================================
  // CALCULS POUR LA VUE MOIS
  // ==========================================================
  const monthMatrix = useMemo(() => {
    try {
      const safeCur = safeDate(currentDate);
      const year = safeCur.getFullYear();
      const month = safeCur.getMonth();
      const firstDay = new Date(year, month, 1);
      const startMonday = getMonday(firstDay);

      const weeks = [];
      let cur = new Date(startMonday);

      for (let w = 0; w < 6; w++) {
        const week = [];
        for (let d = 0; d < 7; d++) {
          const iso = formatDateIso(cur);
          const dayCourses = filteredCourses.filter((c) => c.date === iso);
          week.push({
            dateObj: new Date(cur),
            isoDate: iso,
            dayNumber: cur.getDate(),
            isCurrentMonth: cur.getMonth() === month,
            isToday: iso === formatDateIso(new Date()),
            courses: dayCourses
          });
          cur.setDate(cur.getDate() + 1);
        }
        weeks.push(week);
        if (cur.getMonth() !== month && w >= 3) break;
      }
      return weeks;
    } catch (err) {
      console.error('Erreur calcul matrice mois étudiant:', err);
      return [];
    }
  }, [currentDate, filteredCourses]);

  // ==========================================================
  // CALCULS POUR LA VUE ANNÉE
  // ==========================================================
  const yearMonths = useMemo(() => {
    try {
      const safeCur = safeDate(currentDate);
      const year = safeCur.getFullYear();
      const months = [];
      const academicStartMonth = 8; // Septembre

      for (let i = 0; i < 10; i++) {
        const mIdx = (academicStartMonth + i) % 12;
        const mYear = academicStartMonth + i >= 12 ? year + 1 : year;
        const mIsoPrefix = `${mYear}-${String(mIdx + 1).padStart(2, '0')}`;
        const mCourses = filteredCourses.filter((c) => (c.date || '').startsWith(mIsoPrefix));
        const mHours = mCourses.reduce((acc, c) => acc + (Number(c.duration) || 2), 0);
        const activeDays = new Set(mCourses.map((c) => c.date));

        months.push({
          name: MONTHS_FR[mIdx] || 'Mois',
          year: mYear,
          monthIndex: mIdx,
          courses: mCourses,
          totalHours: mHours,
          activeDaysCount: activeDays.size
        });
      }
      return months;
    } catch (err) {
      console.error('Erreur calcul vue année étudiant:', err);
      return [];
    }
  }, [currentDate, filteredCourses]);

  const safeCurDate = safeDate(currentDate);

  // Déterminer si on est sur la période courante
  const isViewingCurrentPeriod = useMemo(() => {
    const today = new Date();
    const todayIso = formatDateIso(today);
    if (viewMode === 'week') {
      return weekDays.some((d) => d.isoDate === todayIso);
    }
    if (viewMode === 'month') {
      const safeCur = safeDate(currentDate);
      return safeCur.getFullYear() === today.getFullYear() && safeCur.getMonth() === today.getMonth();
    }
    if (viewMode === 'year') {
      const safeCur = safeDate(currentDate);
      return safeCur.getFullYear() === today.getFullYear();
    }
    return false;
  }, [viewMode, weekDays, currentDate]);

  const getResetButtonLabel = () => {
    if (viewMode === 'week') {
      return isViewingCurrentPeriod ? 'Cette semaine' : 'Revenir à cette semaine';
    }
    if (viewMode === 'month') {
      return isViewingCurrentPeriod ? 'Ce mois-ci' : 'Revenir à ce mois';
    }
    if (viewMode === 'year') {
      return isViewingCurrentPeriod ? 'Cette année' : 'Année en cours';
    }
    return "Aujourd'hui";
  };

  return (
    <section className="student-page">
      {/* HEADER AVEC TITRE & BOUTONS DE VUES */}
      <header className="student-page-header">
        <div>
          <p className="student-kicker">
            {role === 'parent' ? 'Espace Parent & Famille' : 'Espace Étudiant & Scolarité'}
          </p>
          <h1>
            {role === 'parent' ? 'Emploi du Temps Étudiant' : 'Mon Emploi du Temps'}
          </h1>
          <p>
            {role === 'parent'
              ? (activeChildName ? `Planning de ${activeChildName} · Promotion ${studentClass}` : 'Consultez le planning officiel de votre enfant.')
              : `Consultez le planning officiel de votre promotion ${studentClass ? `(${studentClass})` : ''}.`}
          </p>
        </div>

        <div className="student-schedule-view-switcher">
          <button
            className={`view-tab ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Semaine
          </button>
          <button
            className={`view-tab ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Mois
          </button>
          <button
            className={`view-tab ${viewMode === 'year' ? 'active' : ''}`}
            onClick={() => setViewMode('year')}
          >
            Année
          </button>
          <button
            className={`view-tab ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            Liste
          </button>
        </div>
      </header>

      {/* BANDEAU STATISTIQUES */}
      {courses.length > 0 && (
        <div className="student-stats-bar">
          <div className="student-stat-card-kpi">
            <span className="kpi-num">{periodStats.totalSessions}</span>
            <span className="kpi-label">Séances programmées</span>
          </div>
          <div className="student-stat-card-kpi">
            <span className="kpi-num">{periodStats.totalHours}h</span>
            <span className="kpi-label">Volume de cours</span>
          </div>
          <div className="student-stat-card-kpi">
            <span className="kpi-num" style={{ fontSize: '1.05rem', color: '#0284c7' }}>
              {formatClassAbbrev(periodStats.studentClass)}
            </span>
            <span className="kpi-label">Ma promotion</span>
          </div>
          {periodStats.upcoming ? (
            <div className="student-stat-card-kpi upcoming">
              <span className="kpi-label">Prochain cours</span>
              <span className="kpi-upcoming-val">
                📅 {formatFrenchDateDisplay(periodStats.upcoming.date)} à {periodStats.upcoming.start}
              </span>
              <small style={{ color: '#0369a1', fontWeight: 600 }}>
                {periodStats.upcoming.title} ({periodStats.upcoming.room || 'Salle 402'})
              </small>
            </div>
          ) : (
            <div className="student-stat-card-kpi upcoming">
              <span className="kpi-label">Prochain cours</span>
              <span className="kpi-upcoming-val" style={{ color: '#64748b' }}>Aucun cours à venir</span>
            </div>
          )}
        </div>
      )}

      {/* BARRE DE CONTRÔLE DE NAVIGATION & FILTRES */}
      <div className="student-schedule-toolbar-card">
        <div className="student-toolbar-nav-row">
          <div className="student-nav-controls-group">
            <button
              className="student-btn-nav"
              onClick={handlePrev}
              title={viewMode === 'week' ? 'Semaine précédente' : viewMode === 'month' ? 'Mois précédent' : 'Année précédente'}
            >
              <IconChevronLeft style={{ width: '16px', height: '16px' }} />
            </button>
            <button
              className={`student-btn-today ${isViewingCurrentPeriod ? 'is-current-period' : ''}`}
              onClick={handleToday}
              title="Revenir à la période actuelle"
            >
              {getResetButtonLabel()}
            </button>
            <button
              className="student-btn-nav"
              onClick={handleNext}
              title={viewMode === 'week' ? 'Semaine suivante' : viewMode === 'month' ? 'Mois suivant' : 'Année suivante'}
            >
              <IconChevronRight style={{ width: '16px', height: '16px' }} />
            </button>

            <h2 className="student-current-period-title">
              {viewMode === 'week' && weekDays.length === 5 && (
                <>
                  Semaine du <strong>{weekDays[0].displayDate}</strong> au <strong>{weekDays[4].displayDate} {safeCurDate.getFullYear()}</strong>
                </>
              )}
              {viewMode === 'month' && (
                <>
                  <strong>{MONTHS_FR[safeCurDate.getMonth()]} {safeCurDate.getFullYear()}</strong>
                </>
              )}
              {viewMode === 'year' && (
                <>
                  Année Universitaire <strong>{safeCurDate.getFullYear()} - {safeCurDate.getFullYear() + 1}</strong>
                </>
              )}
              {viewMode === 'list' && (
                <>
                  Toutes les séances ({filteredCourses.length})
                </>
              )}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {role === 'parent' && childrenList.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '4px 12px', height: '40px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', whiteSpace: 'nowrap' }}>Élève :</span>
                <select
                  value={selectedChildUid}
                  onChange={(e) => {
                    setSelectedChildUid(e.target.value);
                    setSearchParams({ studentUid: e.target.value });
                  }}
                  style={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '4px 10px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer' }}
                >
                  {childrenList.map((c) => (
                    <option key={c.uid} value={c.uid}>{c.displayName} ({c.className})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="student-jump-date-group">
              <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Aller au :</label>
              <input
                type="date"
                className="student-jump-date-input"
                value={formatDateIso(safeCurDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    setCurrentDate(safeDate(e.target.value));
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* BARRE D'INTERVALLE DE DATES & RECHERCHE */}
        <div className="student-toolbar-filters-row">
          <div className="student-interval-filter-wrap">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
              <IconFilter style={{ width: '14px', height: '14px' }} /> Intervalle :
            </span>
            <input
              type="date"
              className="student-interval-input"
              value={customStartDate}
              placeholder="Date début"
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setIsIntervalActive(Boolean(e.target.value || customEndDate));
              }}
            />
            <span style={{ color: '#94a3b8' }}>à</span>
            <input
              type="date"
              className="student-interval-input"
              value={customEndDate}
              placeholder="Date fin"
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                setIsIntervalActive(Boolean(customStartDate || e.target.value));
              }}
            />

            {(customStartDate || customEndDate) && (
              <button className="student-btn-clear-preset" onClick={clearCustomInterval} title="Réinitialiser l'intervalle">
                <IconX style={{ width: '12px', height: '12px' }} /> Effacer
              </button>
            )}
          </div>

          <div className="student-search-filter-box">
            <IconSearch style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Rechercher cours, prof, salle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <p>Chargement de votre emploi du temps en cours...</p>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', marginBottom: '1rem', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {!loading && !error && courses.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center', background: '#fff', border: '2px dashed #cbd5e1', borderRadius: '12px' }}>
          <IconCalendar style={{ width: '48px', height: '48px', color: '#cbd5e1', marginBottom: '12px' }} />
          <h3>Aucun cours programmé pour votre classe</h3>
          <p>L'administration n'a pas encore publié de planning pour votre promotion ({studentClass || 'Non assignée'}).</p>
        </div>
      )}

      {/* 1. VUE SEMAINE */}
      {!loading && !error && courses.length > 0 && viewMode === 'week' && (
        <div className="student-schedule-grid-wrap">
          <div className="student-week-grid">
            <div className="student-week-header-corner">Heure</div>

            {weekDays.map((day) => (
              <div key={day.isoDate} className={`student-week-header-day ${day.isToday ? 'today-col' : ''}`}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{day.dayName}</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{day.displayDate}</span>
                {day.isToday && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px', marginTop: '2px' }}>Aujourd'hui</span>}
              </div>
            ))}

            {/* Matin (08h - 12h) */}
            {['08:00', '09:00', '10:00', '11:00'].map((hour, idx) => (
              <React.Fragment key={`sm-${hour}`}>
                <div className="student-week-grid-hour" style={{ gridRow: idx + 2, gridColumn: 1 }}>
                  {hour}
                </div>
                {weekDays.map((d, dIdx) => (
                  <div
                    key={`scell-${d.isoDate}-${hour}`}
                    className={`student-week-grid-cell ${d.isToday ? 'today-cell' : ''}`}
                    style={{ gridRow: idx + 2, gridColumn: dIdx + 2 }}
                  />
                ))}
              </React.Fragment>
            ))}

            {/* Pause Déjeuner */}
            <div className="student-week-grid-break" style={{ gridRow: 6, gridColumn: '1 / -1' }}>
              Pause Déjeuner (12h00 - 13h00)
            </div>

            {/* Après-midi (13h - 18h) */}
            {['13:00', '14:00', '15:00', '16:00', '17:00'].map((hour, idx) => (
              <React.Fragment key={`sa-${hour}`}>
                <div className="student-week-grid-hour" style={{ gridRow: idx + 7, gridColumn: 1 }}>
                  {hour}
                </div>
                {weekDays.map((d, dIdx) => (
                  <div
                    key={`scell-${d.isoDate}-${hour}`}
                    className={`student-week-grid-cell ${d.isToday ? 'today-cell' : ''}`}
                    style={{ gridRow: idx + 7, gridColumn: dIdx + 2 }}
                  />
                ))}
              </React.Fragment>
            ))}

            {/* Placement des cours de la semaine */}
            {weekCourseClusters.map((cluster) => (
              <div
                key={cluster.id}
                className="student-cluster-container"
                style={{
                  gridColumn: cluster.col,
                  gridRow: `${cluster.row} / span ${cluster.span}`
                }}
              >
                {cluster.courses.map((course, idx) => {
                  const isMulti = cluster.courses.length > 1;
                  return (
                    <article
                      key={`swc-${course.id || idx}`}
                      className={`student-schedule-course-card ${isMulti ? 'multi-session-card' : ''}`}
                      onClick={() => setSelectedCourseModal(course)}
                    >
                      <div className="student-course-card-topbar">
                        <span className="student-course-time-tag" style={course.isCancelled ? { background: '#fee2e2', color: '#b91c1c' } : {}}>
                          {course.start} ({course.duration}h)
                        </span>
                        {course.isCancelled && (
                          <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px' }}>
                            Annulé
                          </span>
                        )}
                        {course.teacherName && (
                          <span className="student-course-prof-tag" title={course.teacherName}>
                            👨‍🏫 {course.teacherName.split(' ')[0]}
                          </span>
                        )}
                      </div>
                      <strong className="student-course-title-text">{course.title}</strong>
                      <div className="student-course-card-bottombar">
                        <span className="student-course-room-text">
                          <IconMapPin style={{ width: '11px', height: '11px' }} /> {course.room || 'Salle 402'}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ))}
          </div>

          {weekCourses.length === 0 && (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', background: '#fff', borderTop: '1px solid #edf2f5' }}>
              <p>Aucun cours programmé pour la semaine du {weekDays[0]?.displayDate} au {weekDays[4]?.displayDate}.</p>
              <button className="student-btn-today" onClick={handleNext}>Semaine suivante ▶</button>
            </div>
          )}
        </div>
      )}

      {/* 2. VUE MOIS */}
      {!loading && !error && courses.length > 0 && viewMode === 'month' && (
        <div className="student-month-calendar">
          <div className="student-month-calendar-header">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <div key={d} className="student-month-header-col">{d}</div>
            ))}
          </div>

          <div className="student-month-calendar-body">
            {monthMatrix.map((week, wIdx) => (
              <div key={`sw-${wIdx}`} className="student-month-calendar-row">
                {week.map((day) => (
                  <div
                    key={day.isoDate}
                    className={`student-month-day-cell ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'is-today' : ''}`}
                  >
                    <div className="student-month-day-top">
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>{day.dayNumber}</span>
                      {day.courses.length > 0 && (
                        <span style={{ fontSize: '0.64rem', fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '1px 4px', borderRadius: '10px' }}>
                          {day.courses.length}
                        </span>
                      )}
                    </div>

                    <div className="student-month-day-courses">
                      {day.courses.slice(0, 3).map((c, cIdx) => (
                        <div
                          key={`smc-${c.id || cIdx}`}
                          className="student-month-course-pill"
                          onClick={() => setSelectedCourseModal(c)}
                          title={`${c.start} - ${c.title} (${c.teacherName})`}
                        >
                          <span className="pill-time">{c.start}</span>
                          <strong className="pill-title">{c.title}</strong>
                        </div>
                      ))}
                      {day.courses.length > 3 && (
                        <div
                          style={{ fontSize: '0.65rem', fontWeight: 600, color: '#0284c7', textAlign: 'center', cursor: 'pointer' }}
                          onClick={() => {
                            setCurrentDate(safeDate(day.isoDate));
                            setViewMode('week');
                          }}
                        >
                          + {day.courses.length - 3} autres...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. VUE ANNÉE */}
      {!loading && !error && courses.length > 0 && viewMode === 'year' && (
        <div className="student-year-grid">
          {yearMonths.map((m) => (
            <div key={`sm-${m.name}-${m.year}`} className="student-year-month-card">
              <div className="student-month-card-header">
                <div>
                  <h3 className="student-month-card-title">{m.name} {m.year}</h3>
                  <span className="student-month-card-subtitle">{m.totalHours}h de cours ({m.courses.length} séances)</span>
                </div>
                <button
                  className="student-btn-jump-month"
                  onClick={() => {
                    setCurrentDate(new Date(m.year, m.monthIndex, 1));
                    setViewMode('month');
                  }}
                  title="Voir ce mois"
                >
                  Ouvrir
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {m.courses.slice(0, 4).map((c, idx) => (
                  <div
                    key={`syc-${c.id || idx}`}
                    className="student-year-course-item"
                    onClick={() => setSelectedCourseModal(c)}
                  >
                    <div className="student-year-course-date">
                      {formatFrenchDateDisplay(c.date)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#0f172a', fontSize: '0.72rem' }}>
                        {c.title}
                      </strong>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                        👨‍🏫 {c.teacherName} • {c.start} ({c.duration}h)
                      </span>
                    </div>
                  </div>
                ))}
                {m.courses.length > 4 && (
                  <div
                    style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0284c7', textAlign: 'center', cursor: 'pointer', paddingTop: '4px' }}
                    onClick={() => {
                      setCurrentDate(new Date(m.year, m.monthIndex, 1));
                      setViewMode('month');
                    }}
                  >
                    + {m.courses.length - 4} autres séances ce mois-ci...
                  </div>
                )}
                {m.courses.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
                    Aucun cours ce mois-ci
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. VUE LISTE */}
      {!loading && !error && courses.length > 0 && viewMode === 'list' && (
        <div className="student-list-view-card">
          <table className="student-courses-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Date</th>
                <th style={{ width: '90px' }}>Jour</th>
                <th style={{ width: '110px' }}>Horaire</th>
                <th>Matière / Cours</th>
                <th>Professeur</th>
                <th style={{ width: '110px' }}>Salle</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((c, idx) => (
                <tr key={`slc-${c.id || idx}`}>
                  <td>
                    <strong>{formatFrenchDateDisplay(c.date)}</strong>
                  </td>
                  <td>
                    <span style={{ display: 'inline-block', padding: '2px 6px', background: '#f1f5f9', color: '#475569', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                      {c.day}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'inline-block', padding: '2px 6px', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                      {c.start} ({c.duration}h)
                    </span>
                  </td>
                  <td>
                    <strong>{c.title}</strong>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                      👨‍🏫 {c.teacherName}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                      {c.room || 'Salle 402'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCourses.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              Aucun cours ne correspond à vos critères de recherche.
            </div>
          )}
        </div>
      )}

      {/* MODAL DÉTAILS COURS ÉTUDIANT */}
      {selectedCourseModal && (
        <div className="modal-overlay" onClick={() => setSelectedCourseModal(null)}>
          <div className="user-modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Détails de la séance</p>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>
                  {selectedCourseModal.title}
                </h3>
              </div>
              <button className="modal-close" onClick={() => setSelectedCourseModal(null)}>×</button>
            </div>

            <div style={{ padding: '0 24px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: 500 }}>
                    <IconCalendar style={{ width: '15px', height: '15px' }} /> Date :
                  </span>
                  <strong style={{ color: '#0f172a' }}>
                    {selectedCourseModal.day} {formatFrenchDateDisplay(selectedCourseModal.date)}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: 500 }}>
                    <IconClock style={{ width: '15px', height: '15px' }} /> Horaire :
                  </span>
                  <strong style={{ color: '#0f172a' }}>
                    {selectedCourseModal.start} ({selectedCourseModal.duration || 2} heures)
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: 500 }}>
                    <IconUser style={{ width: '15px', height: '15px' }} /> Intervenant :
                  </span>
                  <strong style={{ color: '#0284c7' }}>
                    {selectedCourseModal.teacherName}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: 500 }}>
                    <IconUsers style={{ width: '15px', height: '15px' }} /> Promotion :
                  </span>
                  <strong style={{ color: '#0f172a' }}>
                    {selectedCourseModal.group}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: 500 }}>
                    <IconMapPin style={{ width: '15px', height: '15px' }} /> Salle :
                  </span>
                  <strong style={{ color: '#0f172a' }}>
                    {selectedCourseModal.room || 'Salle 402'}
                  </strong>
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setSelectedCourseModal(null)}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
