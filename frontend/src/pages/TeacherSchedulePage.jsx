import { IconCalendar } from '../components/Icons';
import './TeacherPages.css';

const morningHours = ['09:00', '10:00', '11:00', '12:00'];
const afternoonHours = ['13:00', '14:00', '15:00', '16:00'];
const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const courses = [
  { day: 'Lundi', start: '09:00', duration: 2, title: 'Architecture des systèmes web', group: 'Bachelor 2 - Informatique', room: 'Salle 402' },
  { day: 'Lundi', start: '13:00', duration: 1, title: 'Développement web avancé', group: 'Bachelor 3 - Informatique', room: 'Salle 308' },
  { day: 'Mardi', start: '11:00', duration: 2, title: 'Revue de projets', group: 'Bachelor 2 - Informatique', room: 'Salle 215' },
  { day: 'Jeudi', start: '14:00', duration: 2, title: 'Bases de données', group: 'Bachelor 1 - Informatique', room: 'Salle 204' },
];

export default function TeacherSchedulePage() {
  return (
    <section className="teacher-page">
      <header className="teacher-page-header">
        <div><p className="teacher-kicker">Espace pédagogique</p><h1>Mon planning</h1><p>Vos cours organisés par journée et par heure.</p></div>
        <div className="teacher-page-icon"><IconCalendar /></div>
      </header>
      <div className="teacher-schedule-grid-wrap">
        <div className="teacher-schedule-grid">
          <div className="schedule-corner" />
          {days.map((day) => <div className="schedule-day" key={day}>{day}</div>)}
          {morningHours.map((hour, hourIndex) => <div className="schedule-hour" style={{ gridColumn: 1, gridRow: hourIndex + 2 }} key={hour}>{hour.replace(':00', 'h')}</div>)}
          {afternoonHours.map((hour, hourIndex) => <div className="schedule-hour" style={{ gridColumn: 1, gridRow: hourIndex + 7 }} key={hour}>{hour.replace(':00', 'h')}</div>)}
          {morningHours.flatMap((hour, hourIndex) => days.map((day, dayIndex) => <div className="schedule-cell" style={{ gridColumn: dayIndex + 2, gridRow: hourIndex + 2 }} key={`${day}-${hour}`} />))}
          <div className="schedule-break" style={{ gridColumn: '1 / -1', gridRow: 6 }}>Pause déjeuner · 12h - 13h</div>
          {afternoonHours.flatMap((hour, hourIndex) => days.map((day, dayIndex) => <div className="schedule-cell" style={{ gridColumn: dayIndex + 2, gridRow: hourIndex + 7 }} key={`${day}-${hour}`} />))}
          {courses.map((course) => {
            const morningIndex = morningHours.indexOf(course.start);
            const afternoonIndex = afternoonHours.indexOf(course.start);
            const row = morningIndex >= 0 ? morningIndex + 2 : afternoonIndex + 7;
            const column = days.indexOf(course.day) + 2;
            return <article className="schedule-course" key={`${course.day}-${course.start}`} style={{ gridColumn: column, gridRow: `${row} / span ${course.duration}` }}><strong>{course.title}</strong><span>{course.group}</span><small>{course.room}</small></article>;
          })}
        </div>
      </div>
    </section>
  );
}
