import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconUsers,
  IconUser,
  IconClock,
  IconX,
  IconCheckCircle,
  IconAlertTriangle,
  IconHourglass
} from '../components/Icons';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import './TeacherPages.css';

// Formate en YYYY-MM-DD
function formatDateIso(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Formate en DD / MM / YYYY (comme dans la maquette : 01 / 09 / 2026)
function formatDisplayDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${day} / ${m} / ${y}`;
}

// Formate la date complète en français (ex : "mardi 1 septembre 2026")
function formatFullFrenchDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (_) {
    return '';
  }
}

// Extraction des initiales
function getInitials(name = '', email = '') {
  const source = name.trim() || email.split('@')[0] || 'E';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : source.slice(0, 2).toUpperCase();
}

export default function TeacherAbsencesList() {
  const { user } = useAuth();

  // Date sélectionnée (par défaut aujourd'hui)
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Classe sélectionnée ('all' ou nom de la classe)
  const [selectedClass, setSelectedClass] = useState('all');
  // Liste des classes disponibles
  const [classOptions, setClassOptions] = useState([]);

  // Liste des absences récupérées
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal de détails
  const [detailAbsence, setDetailAbsence] = useState(null);

  const dateInputRef = useRef(null);

  // 1. Charger les classes assignées au professeur
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await apiFetch('/users/my-students');
        if (data && data.success) {
          const classes = [
            ...new Set(
              (data.students || [])
                .map((s) => s.className || s.department)
                .filter(Boolean)
            )
          ].sort();
          setClassOptions(classes);
        }
      } catch (err) {
        console.error('Erreur chargement classes du professeur:', err);
      }
    };
    fetchClasses();
  }, []);

  // 2. Charger les absences pour la date et classe sélectionnées
  const fetchAbsences = async () => {
    setLoading(true);
    setError('');
    try {
      const isoDate = formatDateIso(selectedDate);
      const params = new URLSearchParams();
      if (isoDate) params.append('date', isoDate);
      if (selectedClass && selectedClass !== 'all') {
        params.append('className', selectedClass);
      }

      const data = await apiFetch(`/absences/by-course?${params.toString()}`);
      if (data && data.success) {
        setAbsences(data.absences || []);
      } else {
        setAbsences([]);
        if (data?.error) setError(data.error);
      }
    } catch (err) {
      console.error('Erreur chargement absences du jour:', err);
      setError('Erreur lors du chargement des absences : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsences();
  }, [selectedDate, selectedClass]);

  // Navigation jour précédent / jour suivant
  const handlePrevDay = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleDateInputChange = (e) => {
    if (e.target.value) {
      const [y, m, d] = e.target.value.split('-').map(Number);
      const newD = new Date(y, m - 1, d);
      if (!isNaN(newD.getTime())) {
        setSelectedDate(newD);
      }
    }
  };

  // Groupement des absences par classe
  const groupedAbsences = useMemo(() => {
    const groups = {};
    absences.forEach((a) => {
      const grp = a.className || a.department || 'Classe non spécifiée';
      if (!groups[grp]) groups[grp] = [];
      groups[grp].push(a);
    });
    return groups;
  }, [absences]);

  const totalAbsents = absences.length;

  return (
    <section className="teacher-absences-page">
      {/* 1. EN-TÊTE DE LA PAGE */}
      <header className="teacher-absences-header">
        <div className="teacher-absences-header-text">
          <p className="teacher-absences-kicker">ESPACE PÉDAGOGIQUE</p>
          <h1 className="teacher-absences-title">Absences du jour</h1>
          <p className="teacher-absences-subtitle">
            Choisissez une date : les élèves absents apparaissent immédiatement, classés par groupe.
          </p>
        </div>
        <div className="teacher-absences-header-badge" aria-hidden="true">
          <IconCalendar style={{ width: '22px', height: '22px', color: '#0284c7' }} />
        </div>
      </header>

      {/* 2. BARRE DE FILTRES ET DE NAVIGATION */}
      <div className="teacher-absences-toolbar">
        {/* Contrôle de date segmenté */}
        <div className="teacher-date-segmented-control">
          <button
            type="button"
            className="teacher-date-nav-btn"
            onClick={handlePrevDay}
            aria-label="Jour précédent"
          >
            <IconChevronLeft style={{ width: '18px', height: '18px' }} />
          </button>

          <div
            className="teacher-date-display-box"
            onClick={() => dateInputRef.current && dateInputRef.current.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.click()}
            title="Cliquer pour choisir une date"
          >
            <span className="teacher-date-label">DATE SÉLECTIONNÉE</span>
            <div className="teacher-date-value-row">
              <span className="teacher-date-value">{formatDisplayDate(selectedDate)}</span>
              <IconCalendar style={{ width: '16px', height: '16px', color: '#64748b' }} />
            </div>
            {/* Input natif masqué pour sélection de date facile */}
            <input
              ref={dateInputRef}
              type="date"
              className="teacher-hidden-date-input"
              value={formatDateIso(selectedDate)}
              onChange={handleDateInputChange}
            />
          </div>

          <button
            type="button"
            className="teacher-date-nav-btn"
            onClick={handleNextDay}
            aria-label="Jour suivant"
          >
            <IconChevronRight style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Bouton Aujourd'hui */}
        <button
          type="button"
          className="teacher-btn-today"
          onClick={handleToday}
        >
          Aujourd'hui
        </button>

        {/* Sélecteur de classe */}
        <div className="teacher-class-select-box">
          <span className="teacher-class-label">CLASSE</span>
          <select
            className="teacher-class-select"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="all">Toutes mes classes</option>
            {classOptions.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. SECTION RÉCAPITULATIF & DATE */}
      <div className="teacher-absences-status-bar">
        <div className="teacher-status-date-wrap">
          <span className="teacher-status-kicker">ABSENCES ENREGISTRÉES</span>
          <h2 className="teacher-status-date-heading">{formatFullFrenchDate(selectedDate)}</h2>
        </div>

        <div className="teacher-status-count-badge">
          <IconUsers style={{ width: '20px', height: '20px', color: '#0284c7' }} />
          <span>
            <strong>{totalAbsents}</strong> élève{totalAbsents > 1 ? 's' : ''} absent{totalAbsents > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Message d'erreur s'il y a lieu */}
      {error && <div className="teacher-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {/* 4. CONTENU PRINCIPAL : ÉTAT VIDE OU LISTE GROUPÉE */}
      {loading ? (
        <div className="teacher-absences-loading">
          <div className="spinner" style={{ borderColor: 'var(--ynov-cyan) #020617 transparent transparent' }}></div>
          <p>Chargement des absences...</p>
        </div>
      ) : totalAbsents === 0 ? (
        /* ÉTAT VIDE IDENTIQUE À LA MAQUETTE */
        <div className="teacher-absences-empty-card">
          <div className="teacher-empty-icon-wrap">
            <IconCalendar style={{ width: '42px', height: '42px', color: '#0ea5e9' }} />
          </div>
          <h3 className="teacher-empty-title">Aucun élève absent</h3>
          <p className="teacher-empty-desc">Il n'y a pas d'absence enregistrée pour cette date.</p>
        </div>
      ) : (
        /* ÉTAT REMPLI : GROUPÉ PAR CLASSE */
        <div className="teacher-absences-groups-container">
          {Object.entries(groupedAbsences).map(([className, classAbsences]) => (
            <div key={className} className="teacher-absence-group-card">
              <div className="teacher-group-card-header">
                <div className="teacher-group-card-title-wrap">
                  <span className="teacher-group-dot"></span>
                  <h3 className="teacher-group-card-title">{className}</h3>
                </div>
                <span className="teacher-group-count-pill">
                  {classAbsences.length} absent{classAbsences.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="teacher-student-cards-grid">
                {classAbsences.map((absence) => {
                  const studentName = absence.displayName || 'Étudiant';
                  const isLate = absence.type === 'late' || absence.isLate === true;
                  const status = absence.status || 'pending';

                  return (
                    <div
                      key={absence.id}
                      className="teacher-absence-item-card"
                      onClick={() => setDetailAbsence(absence)}
                      title="Cliquer pour voir les détails"
                      role="button"
                      tabIndex={0}
                    >
                      <div className="teacher-absence-card-top">
                        <div className="teacher-absence-avatar">
                          {getInitials(studentName, absence.userEmail)}
                        </div>
                        <div className="teacher-absence-user-info">
                          <strong className="teacher-absence-student-name">{studentName}</strong>
                          <span className="teacher-absence-student-email">{absence.userEmail || className}</span>
                        </div>
                        <span
                          className={`teacher-status-badge ${
                            status === 'approved'
                              ? 'status-approved'
                              : status === 'pending'
                              ? 'status-pending'
                              : status === 'to_justify' || status === 'to_justify_late'
                              ? 'status-to-justify'
                              : 'status-rejected'
                          }`}
                        >
                          {status === 'approved'
                            ? 'Validée'
                            : status === 'pending'
                            ? 'En attente'
                            : status === 'to_justify' || status === 'to_justify_late'
                            ? 'À justifier'
                            : 'Rejetée'}
                        </span>
                      </div>

                      <div className="teacher-absence-card-middle">
                        <div className="teacher-absence-course-info">
                          <IconClock style={{ width: '14px', height: '14px', color: '#64748b' }} />
                          <span>{absence.courseName || 'Cours régulier'}</span>
                        </div>
                        <span className={`teacher-type-pill ${isLate ? 'type-late' : 'type-absence'}`}>
                          {isLate ? 'Retard' : 'Absence'}
                        </span>
                      </div>

                      {absence.reason && (
                        <p className="teacher-absence-reason-preview">
                          <strong>Motif :</strong> {absence.reason}
                        </p>
                      )}

                      <div className="teacher-absence-card-bottom">
                        <span className="teacher-view-details-link">Voir détails →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. MODAL DE DÉTAILS DE L'ABSENCE */}
      {detailAbsence && (
        <div className="teacher-modal-backdrop" onClick={() => setDetailAbsence(null)}>
          <div className="teacher-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="teacher-modal-header">
              <div>
                <span className="teacher-modal-eyebrow">DÉTAIL DE L'ABSENCE</span>
                <h3 className="teacher-modal-title">{detailAbsence.displayName || 'Étudiant'}</h3>
                <span className="teacher-modal-class-subtitle">
                  {detailAbsence.className || detailAbsence.department || 'Classe non définie'}
                </span>
              </div>
              <button
                type="button"
                className="teacher-modal-close-btn"
                onClick={() => setDetailAbsence(null)}
                aria-label="Fermer"
              >
                <IconX style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div className="teacher-modal-body">
              <div className="teacher-modal-grid">
                <div className="teacher-modal-item">
                  <span className="teacher-modal-label">Type</span>
                  <span className="teacher-modal-value">
                    {detailAbsence.type === 'late' || detailAbsence.isLate ? 'Retard' : 'Absence'}
                  </span>
                </div>

                <div className="teacher-modal-item">
                  <span className="teacher-modal-label">Statut</span>
                  <span
                    className={`teacher-status-badge ${
                      detailAbsence.status === 'approved'
                        ? 'status-approved'
                        : detailAbsence.status === 'pending'
                        ? 'status-pending'
                        : detailAbsence.status === 'to_justify'
                        ? 'status-to-justify'
                        : 'status-rejected'
                    }`}
                  >
                    {detailAbsence.status === 'approved'
                      ? 'Validée'
                      : detailAbsence.status === 'pending'
                      ? 'En attente de validation'
                      : detailAbsence.status === 'to_justify'
                      ? 'À justifier'
                      : 'Rejetée'}
                  </span>
                </div>

                <div className="teacher-modal-item">
                  <span className="teacher-modal-label">Cours</span>
                  <span className="teacher-modal-value">{detailAbsence.courseName || 'Cours régulier'}</span>
                </div>

                <div className="teacher-modal-item">
                  <span className="teacher-modal-label">Date concernée</span>
                  <span className="teacher-modal-value">
                    {detailAbsence.startDate || formatDisplayDate(selectedDate)}
                    {detailAbsence.endDate && detailAbsence.endDate !== detailAbsence.startDate
                      ? ` au ${detailAbsence.endDate}`
                      : ''}
                  </span>
                </div>

                {detailAbsence.declaredByName && (
                  <div className="teacher-modal-item">
                    <span className="teacher-modal-label">Déclaré par</span>
                    <span className="teacher-modal-value">{detailAbsence.declaredByName}</span>
                  </div>
                )}

                {detailAbsence.justificationDeadline && (
                  <div className="teacher-modal-item">
                    <span className="teacher-modal-label">Délai de justification</span>
                    <span className="teacher-modal-value" style={{ color: '#b91c1c' }}>
                      Avant le {new Date(detailAbsence.justificationDeadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>

              {detailAbsence.reason && (
                <div className="teacher-modal-section">
                  <span className="teacher-modal-label">Motif / Justification</span>
                  <p className="teacher-modal-text">{detailAbsence.reason}</p>
                </div>
              )}

              {detailAbsence.justificationUrl ? (
                <div className="teacher-modal-section">
                  <span className="teacher-modal-label">Justificatif fourni</span>
                  <a
                    href={detailAbsence.justificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="teacher-modal-doc-link"
                  >
                    📄 Télécharger / Consulter le justificatif
                  </a>
                </div>
              ) : (
                <div className="teacher-modal-section">
                  <span className="teacher-modal-label">Justificatif</span>
                  <p className="teacher-modal-text" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                    Aucun justificatif déposé pour le moment.
                  </p>
                </div>
              )}

              {detailAbsence.reviewNotes && (
                <div className="teacher-modal-section">
                  <span className="teacher-modal-label">Remarques administratives</span>
                  <p className="teacher-modal-text">{detailAbsence.reviewNotes}</p>
                </div>
              )}
            </div>

            <div className="teacher-modal-footer">
              <button
                type="button"
                className="teacher-modal-close-action"
                onClick={() => setDetailAbsence(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}