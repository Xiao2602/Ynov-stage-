import { useEffect, useMemo, useState } from 'react';
import { IconCalendar, IconSearch } from '../components/Icons';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../services/api';
import './TeacherPages.css';

function getInitials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '??';
}

const courses = [
  { id: 'mon-09', day: 'Lundi', time: '09:00 - 11:00', title: 'Architecture des systèmes web', className: 'Bachelor 2 - Informatique' },
  { id: 'mon-14', day: 'Lundi', time: '14:00 - 15:00', title: 'Développement web avancé', className: 'Bachelor 3 - Informatique' },
  { id: 'tue-10', day: 'Mardi', time: '10:00 - 12:00', title: 'Revue de projets', className: 'Bachelor 2 - Informatique' },
  { id: 'thu-15', day: 'Jeudi', time: '15:00 - 16:00', title: 'Bases de données', className: 'Bachelor 1 - Informatique' },
];

export default function TeacherAttendancePage() {
  const { backendUser } = useAuth();
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0].id);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/users')
      .then((result) => {
        if (!result?.success) throw new Error(result?.error || 'Impossible de charger la liste d’appel.');
        const teacherField = backendUser?.department?.toLowerCase();
        setStudents((result.data || []).filter((user) => (
          user.role === 'student'
          && (!teacherField || user.department?.toLowerCase() === teacherField)
        )));
      })
      .catch((loadError) => setError(loadError.message));
  }, [backendUser?.department]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => `${student.displayName || ''} ${student.email || ''}`.toLowerCase().includes(query));
  }, [search, students]);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || courses[0];

  const attendanceSummary = useMemo(() => {
    return students.reduce((summary, student) => {
      const uid = student.uid || student.email;
      const absenceCount = courses.reduce((count, course) => (
        count + (attendance[`${course.id}:${uid}`]?.absence ? 1 : 0)
      ), 0);
      const totalSessions = courses.length;

      summary[uid] = {
        absenceCount,
        presenceRate: Math.round(((totalSessions - absenceCount) / totalSessions) * 100),
      };
      return summary;
    }, {});
  }, [attendance, students]);

  const toggleStatus = (uid, status) => {
    const attendanceKey = `${selectedCourse.id}:${uid}`;
    setAttendance((current) => ({
      ...current,
      [attendanceKey]: { ...current[attendanceKey], [status]: !current[attendanceKey]?.[status] },
    }));
  };

  return (
    <section className="teacher-page">
      <header className="teacher-page-header">
        <div><p className="teacher-kicker">Espace pédagogique</p><h1>Appel</h1><p>Suivez les événements de présence pour votre séance du jour.</p></div>
        <div className="teacher-page-icon"><IconCalendar /></div>
      </header>
      <div className="teacher-course-picker" aria-label="Sélectionner un cours">
        {courses.map((course) => (
          <button
            type="button"
            key={course.id}
            className={selectedCourseId === course.id ? 'active' : ''}
            onClick={() => setSelectedCourseId(course.id)}
          >
            <strong>{course.day}</strong>
            <span>{course.time} · {course.className}</span>
          </button>
        ))}
      </div>
      <div className="teacher-attendance-meta">
        <div><strong>{selectedCourse.title}</strong><span>{selectedCourse.className} · {selectedCourse.day}, {selectedCourse.time}</span></div>
        <label className="teacher-search"><IconSearch /><input type="search" placeholder="Rechercher un élève" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      </div>
      {error && <p className="teacher-error">{error}</p>}
      <div className="teacher-attendance-summary">
        <div><strong>{filteredStudents.length}</strong><span>Élèves suivis</span></div>
        <div><strong>{filteredStudents.reduce((count, student) => count + (attendanceSummary[student.uid || student.email]?.absenceCount || 0), 0)}</strong><span>Absences signalées</span></div>
        <div><strong>{filteredStudents.length > 0 ? `${Math.round(filteredStudents.reduce((total, student) => total + (attendanceSummary[student.uid || student.email]?.presenceRate || 0), 0) / filteredStudents.length)}%` : '—'}</strong><span>Taux de présence</span></div>
      </div>
      <div className="teacher-attendance-table-wrap">
        <table className="teacher-attendance-table">
          <thead><tr><th>Élève</th><th>Classe</th><th>Absences</th><th>Absence</th><th>Retard</th><th>Infirmerie</th><th>Punition</th></tr></thead>
          <tbody>
            {filteredStudents.map((student) => {
              const uid = student.uid || student.email;
              const name = student.displayName || student.email || 'Élève';
              const attendanceKey = `${selectedCourse.id}:${uid}`;
              const studentClass = student.className || [student.level, student.department].filter(Boolean).join(' - ') || selectedCourse.className;
              const summary = attendanceSummary[uid] || { absenceCount: 0, presenceRate: 100 };
              return <tr key={uid}><td><div className="teacher-attendance-user"><span className="teacher-student-avatar">{getInitials(name)}</span><span><strong>{name}</strong><small>{student.email || 'Email non renseigné'}</small></span></div></td><td className="attendance-class">{studentClass}</td><td><strong className="absence-count">{summary.absenceCount}</strong><small className="presence-rate">{summary.presenceRate}% présence</small></td>{['absence', 'retard', 'infirmerie', 'punition'].map((status) => <td className="attendance-cell" key={status}><button type="button" aria-label={`${status} pour ${name}`} className={`attendance-mark ${attendance[attendanceKey]?.[status] ? `selected ${status}` : ''}`} onClick={() => toggleStatus(uid, status)}>{attendance[attendanceKey]?.[status] ? 'X' : ''}</button></td>)}</tr>;
            })}
            {!error && filteredStudents.length === 0 && <tr><td className="teacher-empty" colSpan="7">Aucun élève de votre filière ne correspond à la recherche.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="teacher-footnote">Le marquage est actuellement conservé dans cette session. La sauvegarde durable nécessitera une route d’assiduité côté serveur.</p>
    </section>
  );
}
