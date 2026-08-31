import React, { useState, useEffect } from 'react';
import { IconCalendar } from '../components/Icons';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import './TeacherPages.css';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const MORNING_HOURS = ['09:00', '10:00', '11:00', '12:00'];
const AFTERNOON_HOURS = ['13:00', '14:00', '15:00', '16:00'];

export default function TeacherSchedulePage() {
  const { user } = useAuth();
  const [planning, setPlanning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlanning = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const data = await apiFetch(`/plannings/${user.uid}`);
        if (data.success && data.planning) {
          setPlanning(data.planning);
        } else {
          setPlanning(null);
        }
      } catch (err) {
        setError('Erreur chargement planning: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPlanning();
  }, [user]);

  // Fonction pour obtenir la position d'un cours dans la grille
  const getCoursePosition = (course) => {
    const startHour = parseInt(course.start.split(':')[0]);
    const isMorning = startHour < 12;
    const hourIndex = isMorning ? startHour - 9 : startHour - 13; // 9h -> 0, 10h -> 1, ..., 13h -> 0, 14h -> 1
    const row = isMorning ? hourIndex + 2 : hourIndex + 7; // +2 pour les en-têtes, +7 pour la pause (5 lignes du matin + 1 pause + 1 en-tête)
    const col = DAYS.indexOf(course.day) + 2; // +2 pour la colonne des heures
    return { row, col };
  };

  // Fonction pour obtenir les cours d'un jour et d'une heure spécifiques (pour les cellules vides)
  // On utilise les cours pour déterminer les cellules occupées

  // Construction de la grille
  const renderGrid = () => {
    const courses = planning?.courses || [];
    const cells = [];

    // En-tête des jours
    cells.push(<div key="corner" className="schedule-corner" style={{ gridColumn: 1, gridRow: 1 }} />);
    DAYS.forEach((day, index) => {
      cells.push(
        <div key={day} className="schedule-day" style={{ gridColumn: index + 2, gridRow: 1 }}>
          {day}
        </div>
      );
    });

    // Heures du matin (9h à 12h)
    MORNING_HOURS.forEach((hour, index) => {
      const row = index + 2;
      cells.push(
        <div key={`hour-${hour}`} className="schedule-hour" style={{ gridColumn: 1, gridRow: row }}>
          {hour.replace(':00', 'h')}
        </div>
      );
      // Cellules vides pour chaque jour
      DAYS.forEach((day, dayIndex) => {
        cells.push(
          <div key={`cell-${day}-${hour}`} className="schedule-cell" style={{ gridColumn: dayIndex + 2, gridRow: row }} />
        );
      });
    });

    // Pause (12h-13h) – une ligne qui s'étend sur toutes les colonnes
    cells.push(
      <div key="pause" className="schedule-break" style={{ gridColumn: '1 / -1', gridRow: 6 }}>
        Pause déjeuner · 12h - 13h
      </div>
    );

    // Heures de l'après-midi (13h à 16h)
    AFTERNOON_HOURS.forEach((hour, index) => {
      const row = index + 7;
      cells.push(
        <div key={`hour-${hour}`} className="schedule-hour" style={{ gridColumn: 1, gridRow: row }}>
          {hour.replace(':00', 'h')}
        </div>
      );
      DAYS.forEach((day, dayIndex) => {
        cells.push(
          <div key={`cell-${day}-${hour}`} className="schedule-cell" style={{ gridColumn: dayIndex + 2, gridRow: row }} />
        );
      });
    });

    // Placement des cours
    courses.forEach((course, idx) => {
      const pos = getCoursePosition(course);
      const duration = course.duration || 1;
      cells.push(
        <article
          key={`course-${idx}`}
          className="schedule-course"
          style={{
            gridColumn: pos.col,
            gridRow: `${pos.row} / span ${duration}`
          }}
        >
          <strong>{course.title}</strong>
          <span>{course.group}</span>
          <small>{course.room || 'Salle non spécifiée'}</small>
        </article>
      );
    });

    return cells;
  };

  return (
    <section className="teacher-page">
      <header className="teacher-page-header">
        <div>
          <p className="teacher-kicker">Espace pédagogique</p>
          <h1>Mon planning</h1>
          <p>Vos cours organisés par journée et par heure.</p>
        </div>
        <div className="teacher-page-icon"><IconCalendar /></div>
      </header>

      {loading && <p style={{ padding: '1rem' }}>Chargement...</p>}
      {error && <p className="teacher-error">{error}</p>}

      {!loading && !error && !planning && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ynov-text-muted)' }}>
          <p>Aucun planning n'a encore été assigné.</p>
          <p style={{ fontSize: '0.85rem' }}>Contactez l'administration pour obtenir votre planning.</p>
        </div>
      )}

      {!loading && !error && planning && (
        <div className="teacher-schedule-grid-wrap">
          <div className="teacher-schedule-grid" style={{ display: 'grid', gridTemplateColumns: '80px repeat(5, 1fr)', gridTemplateRows: '40px repeat(4, 60px) 40px repeat(4, 60px)' }}>
            {renderGrid()}
          </div>
        </div>
      )}
    </section>
  );
}