import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api/api';
import {
  IconPlus,
  IconTrash,
  IconSave,
  IconCalendar,
  IconUpload,
  IconDownload,
  IconSearch,
  IconFilter,
  IconRefreshCw,
  IconCheckCircle,
  IconX
} from '../components/Icons';
import * as XLSX from 'xlsx';
import './AssignPlanningPage.css';

// Dictionnaire des classes disponibles
const classOptions = [
  'Bachelor 1',
  'Bachelor 2',
  'Bachelor 3 - Cybersécurité',
  'Bachelor 3 - Intelligence Artificielle',
  'Bachelor 3 - Génie Logiciel',
  'Master 1 - Cybersécurité',
  'Master 1 - Intelligence Artificielle',
  'Master 1 - Génie Logiciel',
  'Master 2 - Cybersécurité',
  'Master 2 - Intelligence Artificielle',
  'Master 2 - Génie Logiciel',
];

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const HOURS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
];

// Helper pour calculer le nom du jour en français à partir d'une date YYYY-MM-DD
function getDayNameFromDate(dateStr) {
  if (!dateStr) return 'Lundi';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return 'Lundi';
    const dateObj = new Date(y, m - 1, d);
    if (isNaN(dateObj.getTime())) return 'Lundi';
    return DAYS_FR[dateObj.getDay()] || 'Lundi';
  } catch (_) {
    return 'Lundi';
  }
}

// Helper pour formater une date en français lisible (ex: "14 sept. 2026")
function formatFrenchDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (isNaN(dateObj.getTime())) return dateStr;
    return dateObj.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (_) {
    return dateStr;
  }
}

// Helper pour parser intelligemment n'importe quelle date Excel/String
function parseDateValue(rawDate) {
  if (!rawDate) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return { date: `${y}-${m}-${d}`, day: DAYS_FR[today.getDay()] || 'Lundi' };
  }

  let jsDate = null;

  if (typeof rawDate === 'number') {
    // Numéro de série Excel
    jsDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
  } else if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      // YYYY-MM-DD
      const [y, m, d] = trimmed.split('-').map(Number);
      jsDate = new Date(y, m - 1, d);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      // DD/MM/YYYY
      const [d, m, y] = trimmed.split('/').map(Number);
      jsDate = new Date(y, m - 1, d);
    } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
      // DD-MM-YYYY
      const [d, m, y] = trimmed.split('-').map(Number);
      jsDate = new Date(y, m - 1, d);
    } else {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        jsDate = parsed;
      }
    }
  } else if (rawDate instanceof Date) {
    jsDate = rawDate;
  }

  if (jsDate && !isNaN(jsDate.getTime())) {
    const y = jsDate.getFullYear();
    const m = String(jsDate.getMonth() + 1).padStart(2, '0');
    const d = String(jsDate.getDate()).padStart(2, '0');
    const isoDate = `${y}-${m}-${d}`;
    const dayName = DAYS_FR[jsDate.getDay()] || 'Lundi';
    return { date: isoDate, day: dayName };
  }

  return { date: String(rawDate).trim(), day: 'Lundi' };
}

export default function AssignPlanningPage() {
  const { role } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [academicYear, setAcademicYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);

  // Filtres et affichage
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  // Modal de génération récurrente (hebdomadaire)
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceForm, setRecurrenceForm] = useState({
    title: '',
    group: classOptions[0],
    startDate: new Date().toISOString().split('T')[0],
    start: '09:00',
    duration: 2,
    weeksCount: 12,
    room: 'Salle 402'
  });

  // 1. Charger la liste des professeurs
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const data = await apiFetch('/users');
        if (data.success) {
          const teachersList = data.data.filter((u) => u.role === 'teacher');
          setTeachers(teachersList);
        }
      } catch (err) {
        console.error('Erreur chargement professeurs:', err);
      }
    };
    fetchTeachers();
  }, []);

  // 2. Charger le planning existant du professeur sélectionné
  useEffect(() => {
    if (!selectedTeacher) {
      setCourses([]);
      return;
    }

    const loadTeacherPlanning = async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/plannings/${selectedTeacher}`);
        if (data.success && data.planning && Array.isArray(data.planning.courses)) {
          // Normaliser les cours existants
          const loaded = data.planning.courses.map((c, idx) => ({
            id: c.id || Date.now() + idx,
            date: c.date || '',
            day: c.day || (c.date ? getDayNameFromDate(c.date) : 'Lundi'),
            start: c.start || '09:00',
            duration: Number(c.duration) || 2,
            title: c.title || '',
            group: c.group || classOptions[0],
            room: c.room || ''
          }));
          setCourses(loaded);
          if (data.planning.academicYear) {
            setAcademicYear(data.planning.academicYear);
          }
        } else {
          setCourses([]);
        }
      } catch (err) {
        console.error('Erreur chargement planning prof:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTeacherPlanning();
  }, [selectedTeacher]);

  // Ajouter un nouveau cours avec date du jour par défaut
  const addCourse = () => {
    const today = new Date().toISOString().split('T')[0];
    setCourses([
      ...courses,
      {
        id: Date.now(),
        date: today,
        day: getDayNameFromDate(today),
        title: '',
        group: classOptions[0] || '',
        start: '09:00',
        duration: 2,
        room: ''
      }
    ]);
  };

  const removeCourse = (id) => {
    setCourses(courses.filter((c) => c.id !== id));
  };

  const updateCourse = (id, field, value) => {
    setCourses(
      courses.map((c) => {
        if (c.id === id) {
          const updated = { ...c, [field]: value };
          // Si la date change, recalculer automatiquement le jour
          if (field === 'date' && value) {
            updated.day = getDayNameFromDate(value);
          }
          return updated;
        }
        return c;
      })
    );
  };

  // Dupliquer un cours pour la semaine suivante (+7 jours)
  const duplicateCourseNextWeek = (course) => {
    let nextDate = course.date;
    if (course.date) {
      const [y, m, d] = course.date.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + 7);
      const nextY = dt.getFullYear();
      const nextM = String(dt.getMonth() + 1).padStart(2, '0');
      const nextD = String(dt.getDate()).padStart(2, '0');
      nextDate = `${nextY}-${nextM}-${nextD}`;
    }

    const newCourse = {
      ...course,
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: nextDate,
      day: getDayNameFromDate(nextDate)
    };

    setCourses([...courses, newCourse]);
    setMessage(`Cours dupliqué pour le ${formatFrenchDate(nextDate)} (+7 jours)`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Générer des séances récurrentes (hebdomadaires)
  const handleGenerateRecurring = () => {
    if (!recurrenceForm.title.trim()) {
      setError('Veuillez renseigner un titre de cours pour la récurrence.');
      return;
    }

    const weeks = Math.min(Math.max(Number(recurrenceForm.weeksCount) || 1, 1), 40);
    const [y, m, d] = recurrenceForm.startDate.split('-').map(Number);
    const startDateObj = new Date(y, m - 1, d);

    const generated = [];
    for (let i = 0; i < weeks; i++) {
      const sessionDate = new Date(startDateObj);
      sessionDate.setDate(startDateObj.getDate() + i * 7);

      const sessY = sessionDate.getFullYear();
      const sessM = String(sessionDate.getMonth() + 1).padStart(2, '0');
      const sessD = String(sessionDate.getDate()).padStart(2, '0');
      const dateStr = `${sessY}-${sessM}-${sessD}`;

      generated.push({
        id: Date.now() + i * 100 + Math.floor(Math.random() * 50),
        date: dateStr,
        day: getDayNameFromDate(dateStr),
        title: recurrenceForm.title.trim(),
        group: recurrenceForm.group,
        start: recurrenceForm.start,
        duration: Number(recurrenceForm.duration) || 2,
        room: recurrenceForm.room.trim()
      });
    }

    setCourses([...courses, ...generated]);
    setShowRecurrenceModal(false);
    setMessage(`${weeks} séances récurrentes générées avec succès !`);
    setTimeout(() => setMessage(''), 4000);
  };

  // Validation avant sauvegarde
  const validateCourses = () => {
    if (courses.length === 0) {
      setError('Ajoutez au moins un cours pour composer le planning.');
      return false;
    }
    const invalid = courses.some((c) => !c.title.trim() || !c.group);
    if (invalid) {
      setError('Chaque cours doit obligatoirement comporter un titre et une classe.');
      return false;
    }
    return true;
  };

  // Sauvegarder dans le backend
  const handleSave = async () => {
    if (!selectedTeacher) {
      setError('Veuillez sélectionner un professeur.');
      return;
    }
    if (!validateCourses()) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        teacherUid: selectedTeacher,
        courses: courses.map((c) => ({
          id: c.id,
          date: c.date || '',
          day: c.day || (c.date ? getDayNameFromDate(c.date) : 'Lundi'),
          start: c.start || '09:00',
          duration: Number(c.duration) || 2,
          title: c.title.trim(),
          group: c.group,
          room: c.room || ''
        })),
        academicYear
      };

      const result = await apiFetch('/plannings/assign', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (result.success) {
        setMessage(`Planning annuel (${courses.length} séances) enregistré avec succès pour ce professeur !`);
      } else {
        setError(result.error || "Erreur lors de l'enregistrement.");
      }
    } catch (err) {
      setError('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Télécharger le Template Excel
  const downloadTemplate = () => {
    const templateData = [
      ['Date (AAAA-MM-JJ)', 'Jour', 'Heure début (HH:MM)', 'Durée (h)', 'Titre du cours', 'Classe', 'Salle']
    ];

    // Exemples réalistes étalés sur l'année
    templateData.push(['2026-09-14', 'Lundi', '09:00', 2, 'Architecture Web & MVC', 'Bachelor 3 - Génie Logiciel', 'Salle 402']);
    templateData.push(['2026-09-15', 'Mardi', '10:00', 3, 'Bases de données NoSQL', 'Bachelor 3 - Intelligence Artificielle', 'Salle 204']);
    templateData.push(['2026-09-21', 'Lundi', '09:00', 2, 'Architecture Web & MVC', 'Bachelor 3 - Génie Logiciel', 'Salle 402']);
    templateData.push(['2026-09-22', 'Mardi', '10:00', 3, 'Bases de données NoSQL', 'Bachelor 3 - Intelligence Artificielle', 'Salle 204']);
    templateData.push(['2026-10-05', 'Lundi', '14:00', 4, 'Atelier Projet Fil Rouge', 'Master 1 - Génie Logiciel', 'Lab 308']);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // Ajuster largeurs de colonnes
    ws['!cols'] = [
      { wch: 18 }, // Date
      { wch: 12 }, // Jour
      { wch: 20 }, // Début
      { wch: 12 }, // Durée
      { wch: 30 }, // Titre
      { wch: 35 }, // Classe
      { wch: 15 }  // Salle
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Planning Annuel');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_planning_annuel.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // Importer un fichier Excel complet
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length <= 1) {
          setError('Le fichier Excel est vide ou ne contient aucune ligne de cours.');
          return;
        }

        const importedCourses = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 3) continue;

          // Détecter si la colonne 0 est une date ou un jour
          const rawCol0 = row[0];
          const rawCol1 = row[1];
          const rawCol2 = row[2];
          const rawCol3 = row[3];
          const rawCol4 = row[4];
          const rawCol5 = row[5];
          const rawCol6 = row[6];

          let parsedDateInfo = parseDateValue(rawCol0);
          let start = '09:00';
          let duration = 2;
          let title = '';
          let group = classOptions[0];
          let room = '';

          // Structure 7 colonnes : [Date, Jour, Début, Durée, Titre, Classe, Salle]
          if (row.length >= 6) {
            start = String(rawCol2 || '09:00').trim();
            duration = parseInt(rawCol3) || 2;
            title = String(rawCol4 || '').trim();
            group = String(rawCol5 || '').trim();
            room = String(rawCol6 || '').trim();
          } else {
            // Structure simplifiée : [Date, Début, Durée, Titre, Classe, Salle]
            start = String(rawCol1 || '09:00').trim();
            duration = parseInt(rawCol2) || 2;
            title = String(rawCol3 || '').trim();
            group = String(rawCol4 || '').trim();
            room = String(rawCol5 || '').trim();
          }

          if (title) {
            importedCourses.push({
              id: Date.now() + i,
              date: parsedDateInfo.date,
              day: parsedDateInfo.day,
              start: start || '09:00',
              duration: duration || 2,
              title: title,
              group: classOptions.includes(group) ? group : (group || classOptions[0]),
              room: room || ''
            });
          }
        }

        if (importedCourses.length === 0) {
          setError('Aucun cours valide trouvé. Vérifiez les colonnes du fichier Excel.');
          return;
        }

        // Trier par date
        importedCourses.sort((a, b) => {
          if (a.date && b.date) {
            const c = a.date.localeCompare(b.date);
            if (c !== 0) return c;
          }
          return a.start.localeCompare(b.start);
        });

        setCourses(importedCourses);
        setError('');
        setMessage(`🎉 ${importedCourses.length} cours importés avec succès pour l'année !`);
      } catch (err) {
        setError("Erreur lors de l'import : " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  // Calcul des statistiques de l'année
  const stats = useMemo(() => {
    const totalSessions = courses.length;
    const totalHours = courses.reduce((acc, c) => acc + (Number(c.duration) || 2), 0);
    const groups = new Set(courses.map((c) => c.group).filter(Boolean));

    const dates = courses.map((c) => c.date).filter(Boolean).sort();
    const firstDate = dates.length > 0 ? formatFrenchDate(dates[0]) : null;
    const lastDate = dates.length > 0 ? formatFrenchDate(dates[dates.length - 1]) : null;

    return {
      totalSessions,
      totalHours,
      classesCount: groups.size,
      firstDate,
      lastDate
    };
  }, [courses]);

  // Filtrage des cours affichés
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Recherche textuelle
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(query);
        const matchGroup = c.group.toLowerCase().includes(query);
        const matchRoom = (c.room || '').toLowerCase().includes(query);
        const matchDate = (c.date || '').includes(query);
        if (!matchTitle && !matchGroup && !matchRoom && !matchDate) return false;
      }

      // Filtre de classe
      if (classFilter !== 'all' && c.group !== classFilter) {
        return false;
      }

      // Filtre de mois
      if (monthFilter !== 'all' && c.date) {
        const courseMonth = c.date.split('-')[1]; // '09', '10', etc.
        if (courseMonth !== monthFilter) return false;
      }

      return true;
    });
  }, [courses, searchTerm, classFilter, monthFilter]);

  return (
    <div className="assign-planning-page">
      {/* HEADER */}
      <div className="assign-planning-header">
        <div>
          <h1><IconCalendar className="icon-md" style={{ color: 'var(--ynov-teal)' }} /> Assigner un planning annuel</h1>
          <p>Planifiez, générez ou importez l'intégralité des séances d'un professeur pour l'année scolaire.</p>
        </div>
        <div className="assign-planning-actions">
          <button className="btn-secondary" onClick={downloadTemplate} title="Télécharger le modèle Excel avec colonnes de date">
            <IconDownload className="icon-sm" /> Modèle Excel
          </button>
          <label className="btn-secondary" style={{ cursor: 'pointer' }} title="Importer un fichier Excel">
            <IconUpload className="icon-sm" /> Importer Excel
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* MESSAGES */}
      {message && (
        <div className="alert-banner success">
          <IconCheckCircle className="icon-sm" /> {message}
        </div>
      )}
      {error && (
        <div className="alert-banner error">
          <IconX className="icon-sm" /> {error}
        </div>
      )}

      {/* SÉLECTION PROFESSEUR ET ANNÉE */}
      <div className="teacher-selection-card">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
              Professeur enseignant *
            </label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="field-input-select"
            >
              <option value="">-- Choisir un professeur --</option>
              {teachers.map((t) => (
                <option key={t.uid} value={t.uid}>
                  {t.displayName || t.email} {t.assignedClasses?.length ? `(${t.assignedClasses.join(', ')})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
              Année académique
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="field-input-text"
              placeholder="Ex : 2026-2027"
            />
          </div>
        </div>
      </div>

      {/* BARRE DE STATISTIQUES DE L'ANNÉE */}
      {courses.length > 0 && (
        <div className="stats-strip">
          <div className="stat-pill">
            <span className="stat-num">{stats.totalSessions}</span>
            <span className="stat-lbl">Séances programmées</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{stats.totalHours}h</span>
            <span className="stat-lbl">Heures totales</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{stats.classesCount}</span>
            <span className="stat-lbl">Classes concernées</span>
          </div>
          {stats.firstDate && stats.lastDate && (
            <div className="stat-pill date-span">
              <span className="stat-lbl">Période d'enseignement</span>
              <span className="stat-val-date">Du {stats.firstDate} au {stats.lastDate}</span>
            </div>
          )}
        </div>
      )}

      {/* SECTION DES COURS */}
      <div className="courses-container-panel">
        <div className="courses-panel-header">
          <div className="panel-left-controls">
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Séances de l'année ({courses.length})
            </h3>
            <div className="view-mode-toggle">
              <button
                className={`mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Vue Cartes"
              >
                Grille
              </button>
              <button
                className={`mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Vue Tableau (pratique pour 50+ cours)"
              >
                Tableau
              </button>
            </div>
          </div>

          <div className="panel-right-actions">
            <button
              className="btn-accent"
              onClick={() => setShowRecurrenceModal(true)}
              title="Générer automatiquement une série de cours hebdomadaires sur X semaines"
            >
              <IconRefreshCw className="icon-sm" /> Répéter / Récurrence
            </button>
            <button className="btn-primary" onClick={addCourse}>
              <IconPlus className="icon-sm" /> Ajouter une séance
            </button>
          </div>
        </div>

        {/* BARRE DE FILTRES */}
        {courses.length > 0 && (
          <div className="courses-filter-bar">
            <div className="filter-search-wrap">
              <IconSearch className="search-icon" />
              <input
                type="text"
                placeholder="Filtrer par titre, classe, salle, date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-selects-wrap">
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                <option value="all">Tous les mois</option>
                <option value="09">Septembre</option>
                <option value="10">Octobre</option>
                <option value="11">Novembre</option>
                <option value="12">Décembre</option>
                <option value="01">Janvier</option>
                <option value="02">Février</option>
                <option value="03">Mars</option>
                <option value="04">Avril</option>
                <option value="05">Mai</option>
                <option value="06">Juin</option>
                <option value="07">Juillet</option>
              </select>

              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                <option value="all">Toutes les classes</option>
                {classOptions.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* VUE GRILLE DE CARTES */}
        {viewMode === 'grid' && (
          <div className="courses-grid">
            {filteredCourses.map((course, idx) => (
              <div key={course.id} className="course-card">
                <div className="course-card-top">
                  <div className="course-badge-index">#{idx + 1}</div>
                  {course.date && (
                    <div className="course-date-tag">
                      📅 {course.day} {formatFrenchDate(course.date)}
                    </div>
                  )}
                  <div className="course-card-actions">
                    <button
                      className="btn-duplicate"
                      onClick={() => duplicateCourseNextWeek(course)}
                      title="Dupliquer pour la semaine suivante (+7 jours)"
                    >
                      +7j
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => removeCourse(course.id)}
                      title="Supprimer cette séance"
                    >
                      <IconTrash style={{ width: '13px', height: '13px' }} />
                    </button>
                  </div>
                </div>

                <div className="course-card-fields">
                  {/* Titre */}
                  <div className="field-full">
                    <label>Titre du cours *</label>
                    <input
                      type="text"
                      value={course.title}
                      onChange={(e) => updateCourse(course.id, 'title', e.target.value)}
                      placeholder="Ex : Architecture Web & MVC"
                    />
                  </div>

                  {/* Classe */}
                  <div className="field-full">
                    <label>Classe / Promotion *</label>
                    <select
                      value={course.group}
                      onChange={(e) => updateCourse(course.id, 'group', e.target.value)}
                    >
                      {classOptions.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date (Jour, Mois, Année) */}
                  <div className="field-half">
                    <label>Date (JJ/MM/AAAA) *</label>
                    <input
                      type="date"
                      value={course.date || ''}
                      onChange={(e) => updateCourse(course.id, 'date', e.target.value)}
                    />
                  </div>

                  {/* Jour de la semaine (Auto) */}
                  <div className="field-half">
                    <label>Jour</label>
                    <select
                      value={course.day}
                      onChange={(e) => updateCourse(course.id, 'day', e.target.value)}
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Heure début */}
                  <div className="field-third">
                    <label>Début</label>
                    <select
                      value={course.start}
                      onChange={(e) => updateCourse(course.id, 'start', e.target.value)}
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Durée */}
                  <div className="field-third">
                    <label>Durée (h)</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={course.duration || 2}
                      onChange={(e) => updateCourse(course.id, 'duration', parseInt(e.target.value) || 2)}
                    />
                  </div>

                  {/* Salle */}
                  <div className="field-third">
                    <label>Salle</label>
                    <input
                      type="text"
                      value={course.room || ''}
                      onChange={(e) => updateCourse(course.id, 'room', e.target.value)}
                      placeholder="Ex : 402"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VUE TABLEAU COMPACT (IDÉALE POUR 50+ SÉANCES) */}
        {viewMode === 'table' && (
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
            <table className="planning-data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th style={{ width: '135px' }}>Date</th>
                  <th style={{ width: '90px' }}>Jour</th>
                  <th style={{ width: '85px' }}>Début</th>
                  <th style={{ width: '70px' }}>Durée</th>
                  <th>Titre du cours</th>
                  <th>Classe</th>
                  <th style={{ width: '100px' }}>Salle</th>
                  <th style={{ width: '85px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course, idx) => (
                  <tr key={course.id}>
                    <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{idx + 1}</td>
                    <td>
                      <input
                        type="date"
                        className="table-cell-input"
                        value={course.date || ''}
                        onChange={(e) => updateCourse(course.id, 'date', e.target.value)}
                      />
                    </td>
                    <td>
                      <span className="badge-day">{course.day}</span>
                    </td>
                    <td>
                      <select
                        className="table-cell-input"
                        value={course.start}
                        onChange={(e) => updateCourse(course.id, 'start', e.target.value)}
                      >
                        {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        className="table-cell-input"
                        style={{ width: '50px' }}
                        value={course.duration || 2}
                        onChange={(e) => updateCourse(course.id, 'duration', parseInt(e.target.value) || 2)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="table-cell-input"
                        value={course.title}
                        onChange={(e) => updateCourse(course.id, 'title', e.target.value)}
                        placeholder="Titre..."
                      />
                    </td>
                    <td>
                      <select
                        className="table-cell-input"
                        value={course.group}
                        onChange={(e) => updateCourse(course.id, 'group', e.target.value)}
                      >
                        {classOptions.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="table-cell-input"
                        value={course.room || ''}
                        onChange={(e) => updateCourse(course.id, 'room', e.target.value)}
                        placeholder="Salle..."
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          className="btn-tbl-action"
                          onClick={() => duplicateCourseNextWeek(course)}
                          title="Dupliquer +7j"
                        >
                          +7j
                        </button>
                        <button
                          className="btn-tbl-action delete"
                          onClick={() => removeCourse(course.id)}
                          title="Supprimer"
                        >
                          <IconTrash style={{ width: '12px', height: '12px' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ÉTAT VIDE */}
        {courses.length === 0 && (
          <div className="empty-planning-box">
            <IconCalendar style={{ width: '42px', height: '42px', color: '#cbd5e1', marginBottom: '12px' }} />
            <h4>Aucune séance dans ce planning</h4>
            <p>Cliquez sur "Ajouter une séance", "Répéter / Récurrence" ou "Importer Excel" pour construire le calendrier de l'année.</p>
          </div>
        )}
      </div>

      {/* BOUTONS D'ACTION DU BAS */}
      <div className="bottom-save-bar">
        <button
          className="btn-secondary"
          onClick={() => {
            if (window.confirm('Voulez-vous vraiment vider la liste de cours ?')) {
              setCourses([]);
              setError('');
              setMessage('');
            }
          }}
          disabled={courses.length === 0}
        >
          Réinitialiser la liste
        </button>
        <button className="btn-primary" onClick={handleSave} disabled={saving || !selectedTeacher}>
          <IconSave className="icon-sm" /> {saving ? 'Enregistrement en cours...' : `Enregistrer le planning (${courses.length} séances)`}
        </button>
      </div>

      {/* MODAL DE GÉNÉRATION RÉCURRENTE (HEBDOMADAIRE) */}
      {showRecurrenceModal && (
        <div className="modal-overlay" onClick={() => setShowRecurrenceModal(false)}>
          <div className="user-modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Génération automatique</p>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Répéter une séance sur l'année</h3>
              </div>
              <button className="modal-close" onClick={() => setShowRecurrenceModal(false)}>×</button>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '16px' }}>
                Créez instantanément une série de séances hebdomadaires avec les dates exactes calculées pour toute l'année ou tout le semestre.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Titre du cours *</label>
                  <input
                    type="text"
                    className="field-input"
                    value={recurrenceForm.title}
                    onChange={(e) => setRecurrenceForm({ ...recurrenceForm, title: e.target.value })}
                    placeholder="Ex : Architecture Web & MVC"
                  />
                </div>

                <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Classe *</label>
                  <select
                    className="field-input"
                    value={recurrenceForm.group}
                    onChange={(e) => setRecurrenceForm({ ...recurrenceForm, group: e.target.value })}
                  >
                    {classOptions.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label">Date 1ère séance *</label>
                  <input
                    type="date"
                    className="field-input"
                    value={recurrenceForm.startDate}
                    onChange={(e) => setRecurrenceForm({ ...recurrenceForm, startDate: e.target.value })}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Nombre de semaines *</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    className="field-input"
                    value={recurrenceForm.weeksCount}
                    onChange={(e) => setRecurrenceForm({ ...recurrenceForm, weeksCount: parseInt(e.target.value) || 12 })}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Heure de début</label>
                  <select
                    className="field-input"
                    value={recurrenceForm.start}
                    onChange={(e) => setRecurrenceForm({ ...recurrenceForm, start: e.target.value })}
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label">Durée (heures)</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    className="field-input"
                    value={recurrenceForm.duration}
                    onChange={(e) => setRecurrenceForm({ ...recurrenceForm, duration: parseInt(e.target.value) || 2 })}
                  />
                </div>

                <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Salle de cours</label>
                  <input
                    type="text"
                    className="field-input"
                    value={recurrenceForm.room}
                    onChange={(e) => setRecurrenceForm({ ...recurrenceForm, room: e.target.value })}
                    placeholder="Ex : Salle 402"
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button className="btn-secondary" onClick={() => setShowRecurrenceModal(false)}>
                  Annuler
                </button>
                <button className="btn-primary" onClick={handleGenerateRecurring}>
                  Générer ({recurrenceForm.weeksCount} séances)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
