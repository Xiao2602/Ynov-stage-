import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/api';
import { IconCalendar, IconUsers } from '../components/Icons';
import './TeacherPages.css';

function getToday() {
  return toInputDate(new Date());
}

function shiftDate(dateValue, amount) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return toInputDate(date);
}

function toInputDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatSelectedDate(dateValue) {
  return new Date(`${dateValue}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function statusLabel(status) {
  return { approved: 'Validée', rejected: 'Refusée', pending: 'En attente', to_justify: 'À justifier' }[status] || 'En attente';
}

function statusClass(status) {
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

export default function TeacherAbsencesList() {
  const [absences, setAbsences] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadClasses() {
      try {
        const data = await apiFetch('/users/my-students');
        if (!active || !data.success) return;
        const classes = [...new Set(data.students.map((student) => student.className || student.department).filter(Boolean))]
          .sort((first, second) => first.localeCompare(second, 'fr'));
        setClassOptions(classes);
      } catch {
        // La liste des absences reste disponible même si les options de classe échouent à charger.
      }
    }
    loadClasses();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadAbsences() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ startDate: selectedDate, endDate: selectedDate });
        if (selectedClass) params.set('className', selectedClass);
        const data = await apiFetch(`/absences/by-course?${params}`);
        if (!data.success) throw new Error(data.error || 'Impossible de charger les absences.');
        if (active) setAbsences(data.absences || []);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Impossible de charger les absences.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAbsences();
    return () => { active = false; };
  }, [selectedClass, selectedDate]);

  const absencesByClass = useMemo(() => {
    const groups = new Map();
    absences.forEach((absence) => {
      const className = absence.className || absence.department || 'Classe non renseignée';
      groups.set(className, [...(groups.get(className) || []), absence]);
    });
    return [...groups.entries()]
      .sort(([first], [second]) => first.localeCompare(second, 'fr'))
      .map(([className, classAbsences]) => ({
        className,
        absences: classAbsences.sort((first, second) => (first.displayName || '').localeCompare(second.displayName || '', 'fr')),
      }));
  }, [absences]);

  const lateCount = absences.filter((absence) => absence.type === 'late' || absence.isLate).length;
  const isToday = selectedDate === getToday();

  return <section className="teacher-page teacher-absence-day-page">
    <header className="teacher-page-header">
      <div><p className="teacher-kicker">Espace pédagogique</p><h1>Absences du jour</h1><p>Choisissez une date : les élèves absents apparaissent immédiatement, classés par groupe.</p></div>
      <div className="teacher-page-icon"><IconCalendar /></div>
    </header>

    <section className="teacher-absence-day-controls" aria-label="Choisir les absences à afficher">
      <div className="teacher-date-picker">
        <button type="button" onClick={() => setSelectedDate((date) => shiftDate(date, -1))} aria-label="Jour précédent">‹</button>
        <label><span>Date sélectionnée</span><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
        <button type="button" onClick={() => setSelectedDate((date) => shiftDate(date, 1))} aria-label="Jour suivant">›</button>
      </div>
      <button type="button" className="teacher-today-button" onClick={() => setSelectedDate(getToday)} disabled={isToday}>Aujourd’hui</button>
      <label className="teacher-class-select"><span>Classe</span><select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}><option value="">Toutes mes classes</option>{classOptions.map((className) => <option key={className} value={className}>{className}</option>)}</select></label>
    </section>

    <div className="teacher-absence-day-title">
      <div><p>Absences enregistrées</p><h2>{formatSelectedDate(selectedDate)}</h2></div>
      {!loading && <div className="teacher-absence-day-summary"><IconUsers /><strong>{absences.length}</strong><span>élève{absences.length > 1 ? 's' : ''} absent{absences.length > 1 ? 's' : ''}</span>{lateCount > 0 && <small>dont {lateCount} retard{lateCount > 1 ? 's' : ''}</small>}</div>}
    </div>

    {error && <p className="teacher-error">{error}</p>}
    {loading ? <div className="teacher-absence-feedback">Chargement des absences…</div> : absencesByClass.length === 0 ? <div className="teacher-absence-empty"><IconCalendar /><strong>Aucun élève absent</strong><span>Il n’y a pas d’absence enregistrée pour cette date{selectedClass ? ' et cette classe' : ''}.</span></div> : <div className="teacher-absence-class-list">
      {absencesByClass.map(({ className, absences: classAbsences }) => <article className="teacher-absence-class-card" key={className}>
        <header><div><span>Classe</span><h2>{className}</h2></div><strong>{classAbsences.length} absence{classAbsences.length > 1 ? 's' : ''}</strong></header>
        <div className="teacher-absence-student-list">{classAbsences.map((absence) => {
          const studentName = absence.displayName || absence.userEmail || 'Élève inconnu';
          const course = absence.courseName || (absence.type === 'late' || absence.isLate ? 'Retard signalé' : 'Absence déclarée');
          return <div className="teacher-absence-student" key={absence.id || `${absence.userId}-${studentName}`}><span className="teacher-student-avatar">{initials(studentName)}</span><div className="teacher-absence-student-details"><strong>{studentName}</strong><span>{course}</span></div><span className={`teacher-absence-status ${statusClass(absence.status)}`}>{statusLabel(absence.status)}</span></div>;
        })}</div>
      </article>)}
    </div>}
  </section>;
}
