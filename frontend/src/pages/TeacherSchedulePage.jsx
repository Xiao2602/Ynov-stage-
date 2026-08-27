import { useEffect, useState } from 'react';
import { IconCalendar } from '../components/Icons';
import { apiFetch } from '../api/api';
import './TeacherPages.css';

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

export default function TeacherSchedulePage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const data = await apiFetch('/users/my-courses');
        if (data.success) {
          setCourses(data.courses);
        } else {
          setError(data.error || 'Impossible de charger le planning.');
        }
      } catch (err) {
        setError('Erreur de connexion : ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Fonction pour construire la grille
  const getCoursePosition = (course) => {
    const hour = parseInt(course.start.split(':')[0]);
    const minute = parseInt(course.start.split(':')[1]);
    const hourIndex = (hour - 9) + (minute > 0 ? 0.5 : 0);
    const dayIndex = days.indexOf(course.day);
    return { row: hourIndex + 1, col: dayIndex + 1 };
  };

  const hours = Array.from({ length: 8 }, (_, i) => {
    const h = 9 + i;
    return `${h.toString().padStart(2, '0')}:00`;
  });

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
      {!loading && !error && (
        <div className="teacher-schedule-grid-wrap">
          <div className="teacher-schedule-grid">
            <div className="schedule-corner" />
            {days.map((day) => (
              <div className="schedule-day" key={day}>{day}</div>
            ))}
            {hours.map((hour, idx) => (
              <div className="schedule-hour" style={{ gridColumn: 1, gridRow: idx + 2 }} key={hour}>
                {hour.replace(':00', 'h')}
              </div>
            ))}
            {hours.map((_, rowIdx) =>
              days.map((_, colIdx) => (
                <div
                  className="schedule-cell"
                  style={{ gridColumn: colIdx + 2, gridRow: rowIdx + 2 }}
                  key={`${rowIdx}-${colIdx}`}
                />
              ))
            )}
            <div className="schedule-break" style={{ gridColumn: '1 / -1', gridRow: '5 / span 2' }}>
              Pause déjeuner · 12h - 13h
            </div>
            {courses.map((course, idx) => {
              const pos = getCoursePosition(course);
              const duration = course.duration || 1;
              return (
                <article
                  className="schedule-course"
                  key={idx}
                  style={{
                    gridColumn: pos.col + 1,
                    gridRow: `${pos.row + 1} / span ${duration}`
                  }}
                >
                  <strong>{course.title}</strong>
                  <span>{course.group}</span>
                  <small>{course.room}</small>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}