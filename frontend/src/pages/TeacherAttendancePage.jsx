import { useEffect, useMemo, useState } from 'react';
import { IconCalendar, IconSearch } from '../components/Icons';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api/api';
import './TeacherPages.css';

function getInitials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '??';
}

export default function TeacherAttendancePage() {
  const { backendUser } = useAuth();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les élèves et les cours
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentsData, coursesData] = await Promise.all([
          apiFetch('/users/my-students'),
          apiFetch('/users/my-courses')
        ]);

        if (studentsData.success) {
          setStudents(studentsData.students);
        } else {
          setError('Erreur chargement élèves: ' + (studentsData.error || ''));
        }

        if (coursesData.success && coursesData.courses.length > 0) {
          setCourses(coursesData.courses);
          setSelectedCourseId(coursesData.courses[0].id || `${coursesData.courses[0].day}-${coursesData.courses[0].start}`);
        } else {
          setError('Erreur chargement cours: ' + (coursesData.error || ''));
        }
      } catch (err) {
        setError('Erreur de connexion : ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) =>
      `${student.displayName || ''} ${student.email || ''}`.toLowerCase().includes(query)
    );
  }, [search, students]);

  const selectedCourse = courses.find((c) => (c.id || `${c.day}-${c.start}`) === selectedCourseId) || courses[0];

  const toggleStudent = (uid) => {
    setSelectedStudents(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedStudents.length === 0) {
      setError('Veuillez sélectionner au moins un étudiant absent.');
      return;
    }
    if (!selectedCourse) {
      setError('Veuillez sélectionner un cours.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const promises = selectedStudents.map(studentId =>
        apiFetch('/absences/teacher/declare', {
          method: 'POST',
          body: JSON.stringify({
            studentId,
            startDate: today,
            endDate: today,
            reason: 'Absence en cours - ' + selectedCourse.title,
            courseName: selectedCourse.title
          })
        })
      );

      const results = await Promise.all(promises);
      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
        setSuccessMessage(`${selectedStudents.length} absence(s) déclarée(s) avec succès.`);
        setSelectedStudents([]);
      } else {
        const errors = results.filter(r => !r.success).map(r => r.error);
        setError('Certaines déclarations ont échoué : ' + errors.join(', '));
      }
    } catch (err) {
      setError('Erreur : ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="teacher-page">
      <header className="teacher-page-header">
        <div>
          <p className="teacher-kicker">Espace pédagogique</p>
          <h1>Appel</h1>
          <p>Déclarez les absences pour votre cours du jour.</p>
        </div>
        <div className="teacher-page-icon"><IconCalendar /></div>
      </header>

      {loading && <p style={{ padding: '1rem' }}>Chargement...</p>}

      {error && <p className="teacher-error">{error}</p>}
      {successMessage && <p className="teacher-success">{successMessage}</p>}

      {!loading && !error && (
        <>
          <div className="teacher-course-picker" aria-label="Sélectionner un cours">
            {courses.map((course) => {
              const courseId = course.id || `${course.day}-${course.start}`;
              return (
                <button
                  type="button"
                  key={courseId}
                  className={selectedCourseId === courseId ? 'active' : ''}
                  onClick={() => {
                    setSelectedCourseId(courseId);
                    setSelectedStudents([]);
                  }}
                >
                  <strong>{course.day}</strong>
                  <span>{course.start} · {course.title}</span>
                </button>
              );
            })}
          </div>

          {selectedCourse && (
            <form onSubmit={handleSubmit}>
              <div className="teacher-attendance-meta">
                <div>
                  <strong>{selectedCourse.title}</strong>
                  <span>{selectedCourse.group} · {selectedCourse.day}, {selectedCourse.start}</span>
                </div>
                <label className="teacher-search">
                  <IconSearch />
                  <input
                    type="search"
                    placeholder="Rechercher un élève"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              </div>

              <div className="teacher-attendance-summary">
                <div>
                  <strong>{filteredStudents.length}</strong>
                  <span>Élèves suivis</span>
                </div>
                <div>
                  <strong>{selectedStudents.length}</strong>
                  <span>Absents sélectionnés</span>
                </div>
              </div>

              <div className="teacher-attendance-table-wrap">
                <table className="teacher-attendance-table">
                  <thead>
                    <tr>
                      <th>Élève</th>
                      <th>Classe</th>
                      <th>Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const uid = student.uid || student.email;
                      const name = student.displayName || student.email || 'Élève';
                      const studentClass = [student.level, student.department].filter(Boolean).join(' - ') || selectedCourse.group;
                      const isSelected = selectedStudents.includes(uid);
                      return (
                        <tr key={uid}>
                          <td>
                            <div className="teacher-attendance-user">
                              <span className="teacher-student-avatar">{getInitials(name)}</span>
                              <span>
                                <strong>{name}</strong>
                                <small>{student.email || 'Email non renseigné'}</small>
                              </span>
                            </div>
                          </td>
                          <td className="attendance-class">{studentClass}</td>
                          <td className="attendance-cell">
                            <button
                              type="button"
                              aria-label={`Déclarer absent pour ${name}`}
                              className={`attendance-mark ${isSelected ? 'selected absence' : ''}`}
                              onClick={() => toggleStudent(uid)}
                            >
                              {isSelected ? 'X' : ''}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td className="teacher-empty" colSpan="3">
                          Aucun élève ne correspond à la recherche.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedStudents.length === 0}
                  className="btn-primary"
                  style={{
                    padding: '0.75rem 2rem',
                    background: 'var(--ynov-cyan)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    opacity: isSubmitting || selectedStudents.length === 0 ? 0.6 : 1
                  }}
                >
                  {isSubmitting ? 'Envoi...' : `Déclarer les absences (${selectedStudents.length})`}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}