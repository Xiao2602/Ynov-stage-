import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconCalendar,
  IconSearch,
  IconFilter,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconMapPin,
  IconUsers,
  IconCheckCircle,
  IconX,
  IconRefreshCw
} from '../components/Icons';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import './TeacherPages.css';

const DAYS_NAME = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// Helper pour garantir une Date valide
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

// Formate en français lisible (ex: "14 sept. 2026")
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

// Abréviation de classe pour badge lisible
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

export default function TeacherSchedulePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [planning, setPlanning] = useState(null);
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
  const [classFilter, setClassFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de détails de cours
  const [selectedCourseModal, setSelectedCourseModal] = useState(null);

  // 1. Charger le planning depuis le backend
  useEffect(() => {
    const fetchPlanning = async () => {
      if (!user?.uid) return;
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch(`/plannings/${user.uid}`);
        if (data && data.success) {
          const rawPlanning = data.planning || (Array.isArray(data.plannings) && data.plannings[0]) || null;

          if (rawPlanning) {
            const rawCourses = Array.isArray(rawPlanning.courses) ? rawPlanning.courses : [];
            const normalizedCourses = rawCourses.map((c, idx) => {
              const safeDt = c.date ? safeDate(c.date, null) : null;
              const isoDate = safeDt ? formatDateIso(safeDt) : (c.date || '');
              const dayName = c.day || (safeDt ? DAYS_FR[safeDt.getDay()] : 'Lundi');

              return {
                id: c.id || `course-${idx}-${Date.now()}`,
                date: isoDate,
                day: dayName || 'Lundi',
                start: typeof c.start === 'string' && c.start ? c.start : '09:00',
                duration: Number(c.duration) || 2,
                title: c.title ? String(c.title).trim() : 'Cours sans titre',
                group: c.group ? String(c.group).trim() : 'Classe non spécifiée',
                room: c.room ? String(c.room).trim() : 'Salle non spécifiée'
              };
            });

            setPlanning({
              ...rawPlanning,
              courses: normalizedCourses
            });

            // Caler automatiquement la vue sur le premier cours si aujourd'hui est hors période
            const withDates = normalizedCourses.filter((c) => c.date);
            if (withDates.length > 0) {
              const firstDate = safeDate(withDates[0].date);
              const now = new Date();
              if (now < firstDate || now.getFullYear() < firstDate.getFullYear()) {
                setCurrentDate(firstDate);
              }
            }
          } else {
            setPlanning(null);
          }
        } else {
          setPlanning(null);
          if (data?.error) setError(data.error);
        }
      } catch (err) {
        console.error('Erreur chargement planning:', err);
        setError('Erreur lors du chargement du planning : ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPlanning();
  }, [user]);

  // Liste de tous les cours normalisés
  const allCourses = useMemo(() => {
    return Array.isArray(planning?.courses) ? planning.courses : [];
  }, [planning]);

  // Liste des classes distinctes
  const availableClasses = useMemo(() => {
    const set = new Set();
    allCourses.forEach((c) => {
      if (c.group) set.add(c.group);
    });
    return Array.from(set).sort();
  }, [allCourses]);

  // Vérifier si le planning contient des dates de calendrier explicites
  const hasExplicitDates = useMemo(() => {
    return allCourses.some((c) => c.date && c.date.trim() !== '');
  }, [allCourses]);

  // Filtrage global (classe, recherche textuelle, intervalle de dates)
  const filteredCourses = useMemo(() => {
    return allCourses.filter((c) => {
      // Filtre de classe
      if (classFilter !== 'all' && c.group !== classFilter) return false;

      // Recherche
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const mTitle = (c.title || '').toLowerCase().includes(q);
        const mGroup = (c.group || '').toLowerCase().includes(q);
        const mRoom = (c.room || '').toLowerCase().includes(q);
        const mDate = (c.date || '').includes(q);
        if (!mTitle && !mGroup && !mRoom && !mDate) return false;
      }

      // Intervalle personnalisé
      if (isIntervalActive) {
        if (customStartDate && c.date && c.date < customStartDate) return false;
        if (customEndDate && c.date && c.date > customEndDate) return false;
      }

      return true;
    });
  }, [allCourses, classFilter, searchTerm, isIntervalActive, customStartDate, customEndDate]);

  // Statistiques de la période sélectionnée
  const periodStats = useMemo(() => {
    const totalSessions = filteredCourses.length;
    const totalHours = filteredCourses.reduce((acc, c) => acc + (Number(c.duration) || 2), 0);
    const groups = new Set(filteredCourses.map((c) => c.group).filter(Boolean));

    const todayIso = formatDateIso(new Date());
    const upcoming = filteredCourses
      .filter((c) => c.date && c.date >= todayIso)
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];

    return {
      totalSessions,
      totalHours,
      classesCount: groups.size,
      upcoming
    };
  }, [filteredCourses]);

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

  // Presets d'intervalles
  const applyIntervalPreset = (preset) => {
    const safeCur = safeDate(currentDate);
    const curYear = safeCur.getFullYear();
    setIsIntervalActive(true);

    if (preset === 's1') {
      setCustomStartDate(`${curYear}-09-01`);
      setCustomEndDate(`${curYear + 1}-01-31`);
    } else if (preset === 's2') {
      setCustomStartDate(`${curYear + 1}-02-01`);
      setCustomEndDate(`${curYear + 1}-06-30`);
    } else if (preset === 'year') {
      setCustomStartDate(`${curYear}-09-01`);
      setCustomEndDate(`${curYear + 1}-06-30`);
    } else if (preset === 'this_month') {
      const y = safeCur.getFullYear();
      const m = safeCur.getMonth();
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      setCustomStartDate(formatDateIso(first));
      setCustomEndDate(formatDateIso(last));
    } else if (preset === 'this_week') {
      const mon = getMonday(safeCur);
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);
      setCustomStartDate(formatDateIso(mon));
      setCustomEndDate(formatDateIso(fri));
    }
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
      console.error('Erreur calcul jours semaine:', err);
      return [];
    }
  }, [currentDate]);

  // Extraction des cours STRICTEMENT assignés à cette semaine
  const weekCourses = useMemo(() => {
    const weekIsoDates = new Set(weekDays.map((d) => d.isoDate));

    if (hasExplicitDates) {
      // Planning annuel avec dates : UNIQUEMENT les cours ayant exactement la date de cette semaine
      return filteredCourses.filter((c) => c.date && weekIsoDates.has(c.date));
    } else {
      // Planning récurrent par jour : au maximum une séance par jour/créneau
      const seen = new Set();
      return filteredCourses.filter((c) => {
        const key = `${c.day}-${c.start}-${c.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return DAYS_NAME.includes(c.day);
      });
    }
  }, [filteredCourses, weekDays, hasExplicitDates]);

  // Positionnement dans la grille hebdomadaire (sans dépassement pause déjeuner)
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
        const hourOffset = Math.max(0, Math.min(startHour - 8, 3)); // 8h->0, 9h->1, 10h->2, 11h->3
        startRow = 2 + hourOffset;
        // Arrêt strict avant la ligne 6 (Pause Déjeuner)
        maxAllowedSpan = Math.max(1, 6 - startRow);
      } else {
        const hourOffset = Math.max(0, Math.min(startHour - 13, 4)); // 13h->0, 14h->1, ..., 17h->4
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

  // Layout propre avec pleine largeur lisible
  const weekCoursesWithLayout = useMemo(() => {
    try {
      const dayGroups = {};
      weekCourses.forEach((c) => {
        const pos = getCourseWeekPosition(c);
        const key = pos.col;
        if (!dayGroups[key]) dayGroups[key] = [];
        dayGroups[key].push({ ...c, pos });
      });

      const result = [];
      Object.values(dayGroups).forEach((coursesInDay) => {
        coursesInDay.sort((a, b) => (a.pos?.row || 0) - (b.pos?.row || 0));

        coursesInDay.forEach((c, idx) => {
          // Détecter un éventuel chevauchement réel sur la même tranche horaire
          const overlapping = coursesInDay.filter((other, oIdx) => {
            if (idx === oIdx) return true;
            const aStart = c.pos?.row || 2;
            const aEnd = aStart + (c.pos?.span || 2);
            const bStart = other.pos?.row || 2;
            const bEnd = bStart + (other.pos?.span || 2);
            return aStart < bEnd && aEnd > bStart;
          });

          if (overlapping.length > 1) {
            // Conflit rare : limiter à 2 sous-colonnes propres pour garder une lisibilité parfaite
            const order = overlapping.findIndex((o) => (o.id || o.title) === (c.id || c.title));
            const subCol = order % 2;
            result.push({
              ...c,
              customLayout: {
                width: 'calc(50% - 6px)',
                marginLeft: subCol === 0 ? '3px' : 'calc(50% + 3px)',
                zIndex: 3 + order
              }
            });
          } else {
            // Pleine largeur par défaut
            result.push({
              ...c,
              customLayout: {
                width: 'calc(100% - 8px)',
                margin: '3px 4px'
              }
            });
          }
        });
      });

      return result;
    } catch (err) {
      console.error('Erreur layout cours semaine:', err);
      return weekCourses.map((c) => ({ ...c, pos: getCourseWeekPosition(c), customLayout: {} }));
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
      console.error('Erreur calcul matrice mois:', err);
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
      console.error('Erreur calcul vue année:', err);
      return [];
    }
  }, [currentDate, filteredCourses]);

  const safeCurDate = safeDate(currentDate);

  return (
    <section className="teacher-page">
      {/* HEADER AVEC TITRE & BOUTONS DE VUES */}
      <header className="teacher-page-header">
        <div>
          <p className="teacher-kicker">Espace pédagogique & planning</p>
          <h1>Mon Emploi du Temps</h1>
          <p>Consultez, filtrez et gérez vos séances d'enseignement sur l'année.</p>
        </div>

        <div className="schedule-view-switcher">
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
      {allCourses.length > 0 && (
        <div className="teacher-stats-bar">
          <div className="stat-card-kpi">
            <span className="kpi-num">{periodStats.totalSessions}</span>
            <span className="kpi-label">Séances programmées</span>
          </div>
          <div className="stat-card-kpi">
            <span className="kpi-num">{periodStats.totalHours}h</span>
            <span className="kpi-label">Volume d'enseignement</span>
          </div>
          <div className="stat-card-kpi">
            <span className="kpi-num">{periodStats.classesCount}</span>
            <span className="kpi-label">Promotions assignées</span>
          </div>
          {periodStats.upcoming ? (
            <div className="stat-card-kpi upcoming">
              <span className="kpi-label">Prochaine séance</span>
              <span className="kpi-upcoming-val">
                📅 {formatFrenchDateDisplay(periodStats.upcoming.date)} à {periodStats.upcoming.start}
              </span>
              <small style={{ color: '#0f766e', fontWeight: 600 }}>
                {periodStats.upcoming.title} ({formatClassAbbrev(periodStats.upcoming.group)})
              </small>
            </div>
          ) : (
            <div className="stat-card-kpi upcoming">
              <span className="kpi-label">Prochaine séance</span>
              <span className="kpi-upcoming-val" style={{ color: '#64748b' }}>Aucune séance à venir</span>
            </div>
          )}
        </div>
      )}

      {/* BARRE DE CONTRÔLE DE NAVIGATION & FILTRES */}
      <div className="schedule-toolbar-card">
        <div className="toolbar-nav-row">
          <div className="nav-controls-group">
            <button className="btn-nav" onClick={handlePrev} title="Précédent">
              <IconChevronLeft style={{ width: '16px', height: '16px' }} />
            </button>
            <button className="btn-today" onClick={handleToday}>
              Aujourd'hui
            </button>
            <button className="btn-nav" onClick={handleNext} title="Suivant">
              <IconChevronRight style={{ width: '16px', height: '16px' }} />
            </button>

            <h2 className="current-period-title">
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

          <div className="jump-date-group">
            <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Aller au :</label>
            <input
              type="date"
              className="jump-date-input"
              value={formatDateIso(safeCurDate)}
              onChange={(e) => {
                if (e.target.value) {
                  setCurrentDate(safeDate(e.target.value));
                }
              }}
            />
          </div>
        </div>

        {/* BARRE D'INTERVALLE DE DATES & RECHERCHE */}
        <div className="toolbar-filters-row">
          <div className="interval-filter-wrap">
            <span className="filter-label"><IconFilter style={{ width: '14px', height: '14px' }} /> Intervalle :</span>
            <input
              type="date"
              className="interval-input"
              value={customStartDate}
              placeholder="Date début"
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setIsIntervalActive(true);
              }}
            />
            <span style={{ color: '#94a3b8' }}>à</span>
            <input
              type="date"
              className="interval-input"
              value={customEndDate}
              placeholder="Date fin"
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                setIsIntervalActive(true);
              }}
            />

            <div className="preset-buttons">
              <button className="btn-preset" onClick={() => applyIntervalPreset('this_week')}>Cette semaine</button>
              <button className="btn-preset" onClick={() => applyIntervalPreset('this_month')}>Ce mois</button>
              <button className="btn-preset" onClick={() => applyIntervalPreset('s1')}>Semestre 1</button>
              <button className="btn-preset" onClick={() => applyIntervalPreset('s2')}>Semestre 2</button>
              <button className="btn-preset" onClick={() => applyIntervalPreset('year')}>Année</button>
              {isIntervalActive && (
                <button className="btn-clear-preset" onClick={clearCustomInterval} title="Réinitialiser l'intervalle">
                  <IconX style={{ width: '12px', height: '12px' }} /> Effacer
                </button>
              )}
            </div>
          </div>

          <div className="class-search-wrap">
            <select
              className="class-select-filter"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="all">Toutes les classes ({availableClasses.length})</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>

            <div className="search-filter-box">
              <IconSearch style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Rechercher cours, salle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <p>Chargement de votre planning en cours...</p>
        </div>
      )}

      {error && !loading && (
        <div className="teacher-error" style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {!loading && !error && !planning && (
        <div className="empty-state-box">
          <IconCalendar style={{ width: '48px', height: '48px', color: '#cbd5e1', marginBottom: '12px' }} />
          <h3>Aucun planning assigné</h3>
          <p>L'administration n'a pas encore assigné de planning à votre compte.</p>
        </div>
      )}

      {/* 1. VUE SEMAINE (WEEK VIEW) */}
      {!loading && !error && planning && viewMode === 'week' && (
        <div className="teacher-schedule-grid-wrap">
          <div className="teacher-week-grid">
            <div className="week-header-corner">Heure</div>

            {weekDays.map((day) => (
              <div key={day.isoDate} className={`week-header-day ${day.isToday ? 'today-col' : ''}`}>
                <span className="day-name">{day.dayName}</span>
                <span className="day-date">{day.displayDate}</span>
                {day.isToday && <span className="today-badge">Aujourd'hui</span>}
              </div>
            ))}

            {/* Matin (08h - 12h) */}
            {['08:00', '09:00', '10:00', '11:00'].map((hour, idx) => (
              <React.Fragment key={`m-${hour}`}>
                <div className="week-grid-hour" style={{ gridRow: idx + 2, gridColumn: 1 }}>
                  {hour}
                </div>
                {weekDays.map((d, dIdx) => (
                  <div
                    key={`cell-${d.isoDate}-${hour}`}
                    className={`week-grid-cell ${d.isToday ? 'today-cell' : ''}`}
                    style={{ gridRow: idx + 2, gridColumn: dIdx + 2 }}
                  />
                ))}
              </React.Fragment>
            ))}

            {/* Pause Déjeuner */}
            <div className="week-grid-break" style={{ gridRow: 6, gridColumn: '1 / -1' }}>
              Pause Déjeuner (12h00 - 13h00)
            </div>

            {/* Après-midi (13h - 18h) */}
            {['13:00', '14:00', '15:00', '16:00', '17:00'].map((hour, idx) => (
              <React.Fragment key={`a-${hour}`}>
                <div className="week-grid-hour" style={{ gridRow: idx + 7, gridColumn: 1 }}>
                  {hour}
                </div>
                {weekDays.map((d, dIdx) => (
                  <div
                    key={`cell-${d.isoDate}-${hour}`}
                    className={`week-grid-cell ${d.isToday ? 'today-cell' : ''}`}
                    style={{ gridRow: idx + 7, gridColumn: dIdx + 2 }}
                  />
                ))}
              </React.Fragment>
            ))}

            {/* Placement des cours de la semaine */}
            {weekCoursesWithLayout.map((course, idx) => {
              const pos = course.pos || getCourseWeekPosition(course);
              return (
                <article
                  key={`wc-${course.id || idx}`}
                  className="schedule-course-card"
                  style={{
                    gridColumn: pos.col,
                    gridRow: `${pos.row} / span ${pos.span}`,
                    ...(course.customLayout || {})
                  }}
                  onClick={() => setSelectedCourseModal(course)}
                >
                  <div className="course-card-topbar">
                    <span className="course-time-tag">
                      {course.start} ({course.duration}h)
                    </span>
                    <span className="course-class-tag" title={course.group}>
                      {formatClassAbbrev(course.group)}
                    </span>
                  </div>
                  <strong className="course-title-text">{course.title}</strong>
                  <div className="course-card-bottombar">
                    <span className="course-room-text">
                      <IconMapPin style={{ width: '11px', height: '11px' }} /> {course.room || 'Salle 402'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {weekCourses.length === 0 && (
            <div className="empty-week-notice">
              <p>Aucune séance programmée pour la semaine du {weekDays[0]?.displayDate} au {weekDays[4]?.displayDate}.</p>
              <button className="btn-today" onClick={handleNext}>Semaine suivante ▶</button>
            </div>
          )}
        </div>
      )}

      {/* 2. VUE MOIS */}
      {!loading && !error && planning && viewMode === 'month' && (
        <div className="teacher-month-calendar">
          <div className="month-calendar-header">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <div key={d} className="month-header-col">{d}</div>
            ))}
          </div>

          <div className="month-calendar-body">
            {monthMatrix.map((week, wIdx) => (
              <div key={`w-${wIdx}`} className="month-calendar-row">
                {week.map((day) => (
                  <div
                    key={day.isoDate}
                    className={`month-day-cell ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'is-today' : ''} ${day.courses.length > 0 ? 'has-courses' : ''}`}
                  >
                    <div className="month-day-top">
                      <span className="day-num">{day.dayNumber}</span>
                      {day.courses.length > 0 && (
                        <span className="day-course-count">{day.courses.length}</span>
                      )}
                    </div>

                    <div className="month-day-courses">
                      {day.courses.slice(0, 3).map((c, cIdx) => (
                        <div
                          key={`mc-${c.id || cIdx}`}
                          className="month-course-pill"
                          onClick={() => setSelectedCourseModal(c)}
                          title={`${c.start} - ${c.title} (${c.group})`}
                        >
                          <span className="pill-time">{c.start}</span>
                          <strong className="pill-title">{c.title}</strong>
                          <span className="pill-class">{formatClassAbbrev(c.group)}</span>
                        </div>
                      ))}
                      {day.courses.length > 3 && (
                        <div
                          className="month-more-pill"
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
      {!loading && !error && planning && viewMode === 'year' && (
        <div className="teacher-year-grid">
          {yearMonths.map((m) => (
            <div key={`m-${m.name}-${m.year}`} className="year-month-card">
              <div className="month-card-header">
                <div>
                  <h3 className="month-card-title">{m.name} {m.year}</h3>
                  <span className="month-card-subtitle">{m.totalHours}h d'enseignement ({m.courses.length} séances)</span>
                </div>
                <button
                  className="btn-jump-month"
                  onClick={() => {
                    setCurrentDate(new Date(m.year, m.monthIndex, 1));
                    setViewMode('month');
                  }}
                  title="Voir ce mois"
                >
                  Ouvrir
                </button>
              </div>

              <div className="month-card-course-list">
                {m.courses.slice(0, 4).map((c, idx) => (
                  <div
                    key={`yc-${c.id || idx}`}
                    className="year-course-item"
                    onClick={() => setSelectedCourseModal(c)}
                  >
                    <div className="year-course-date">
                      {formatFrenchDateDisplay(c.date)}
                    </div>
                    <div className="year-course-body">
                      <strong>{c.title}</strong>
                      <span>{formatClassAbbrev(c.group)} • {c.start} ({c.duration}h)</span>
                    </div>
                  </div>
                ))}
                {m.courses.length > 4 && (
                  <div
                    className="year-more-courses"
                    onClick={() => {
                      setCurrentDate(new Date(m.year, m.monthIndex, 1));
                      setViewMode('month');
                    }}
                  >
                    + {m.courses.length - 4} autres séances ce mois-ci...
                  </div>
                )}
                {m.courses.length === 0 && (
                  <p className="year-no-courses">Aucun cours ce mois-ci</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. VUE LISTE */}
      {!loading && !error && planning && viewMode === 'list' && (
        <div className="teacher-list-view-card">
          <table className="teacher-courses-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Date</th>
                <th style={{ width: '90px' }}>Jour</th>
                <th style={{ width: '110px' }}>Horaire</th>
                <th>Titre du cours</th>
                <th>Promotion / Classe</th>
                <th style={{ width: '110px' }}>Salle</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((c, idx) => (
                <tr key={`lc-${c.id || idx}`}>
                  <td>
                    <strong>{formatFrenchDateDisplay(c.date)}</strong>
                  </td>
                  <td>
                    <span className="badge-day-pill">{c.day}</span>
                  </td>
                  <td>
                    <span className="badge-time-pill">{c.start} ({c.duration}h)</span>
                  </td>
                  <td>
                    <strong>{c.title}</strong>
                  </td>
                  <td>
                    <span className="badge-class-pill" title={c.group}>
                      {c.group}
                    </span>
                  </td>
                  <td>
                    <span className="badge-room-pill">{c.room || 'Salle 402'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-emarger-action"
                      onClick={() => navigate('/pedagogie/appel')}
                      title="Lancer la feuille d'appel pour ce cours"
                    >
                      Émarger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCourses.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              Aucune séance ne correspond à vos critères de recherche.
            </div>
          )}
        </div>
      )}

      {/* MODAL DÉTAILS COURS */}
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
              <div className="course-modal-details">
                <div className="detail-row">
                  <span className="detail-label"><IconCalendar style={{ width: '15px', height: '15px' }} /> Date :</span>
                  <strong className="detail-val">
                    {selectedCourseModal.day} {formatFrenchDateDisplay(selectedCourseModal.date)}
                  </strong>
                </div>
                <div className="detail-row">
                  <span className="detail-label"><IconClock style={{ width: '15px', height: '15px' }} /> Horaire :</span>
                  <strong className="detail-val">
                    {selectedCourseModal.start} ({selectedCourseModal.duration || 2} heures)
                  </strong>
                </div>
                <div className="detail-row">
                  <span className="detail-label"><IconUsers style={{ width: '15px', height: '15px' }} /> Classe :</span>
                  <strong className="detail-val">{selectedCourseModal.group}</strong>
                </div>
                <div className="detail-row">
                  <span className="detail-label"><IconMapPin style={{ width: '15px', height: '15px' }} /> Salle :</span>
                  <strong className="detail-val">{selectedCourseModal.room || 'Salle 402'}</strong>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn-secondary" onClick={() => setSelectedCourseModal(null)}>
                  Fermer
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setSelectedCourseModal(null);
                    navigate('/pedagogie/appel');
                  }}
                >
                  <IconCheckCircle className="icon-sm" /> Lancer l'émargement / Appel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
