import { useEffect, useMemo, useState } from 'react';
import { IconCalendar, IconSearch, IconFilter } from '../components/Icons';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api/api';
import './TeacherPages.css';

function getInitials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '??';
}

export default function TeacherAttendancePage() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [planning, setPlanning] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Charger le planning du professeur
  useEffect(() => {
    const fetchPlanning = async () => {
      try {
        const data = await apiFetch(`/plannings/${user?.uid}`);
        if (data.success && data.planning) {
          setPlanning(data.planning);
          if (data.planning.courses.length > 0) {
            setSelectedCourseId(data.planning.courses[0].id || `${data.planning.courses[0].day}-${data.planning.courses[0].start}`);
          }
        } else {
          setPlanning(null);
        }
      } catch (err) {
        setError('Erreur chargement planning: ' + err.message);
      }
    };
    if (user?.uid) fetchPlanning();
  }, [user]);

  // 2. Charger les étudiants du professeur
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await apiFetch('/users/my-students');
        if (data.success) {
          setStudents(data.students);
        } else {
          setError('Erreur chargement élèves: ' + (data.error || ''));
        }
      } catch (err) {
        setError('Erreur de connexion : ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // 3. Filtrer les étudiants par classe sélectionnée (si le cours a une classe)
  const filteredStudents = useMemo(() => {
    const selectedCourse = planning?.courses.find(c => (c.id || `${c.day}-${c.start}`) === selectedCourseId);
    const className = selectedCourse?.group || '';
    const query = search.trim().toLowerCase();

    let studentsList = students;
    if (className) {
      studentsList = studentsList.filter(s => {
        const studentClass = s.className || s.department || '';
        return studentClass === className;
      });
    }

    if (query) {
      studentsList = studentsList.filter(s =>
        `${s.displayName || ''} ${s.email || ''}`.toLowerCase().includes(query)
      );
    }

    return studentsList;
  }, [students, planning, selectedCourseId, search]);

  const selectedCourse = planning?.courses.find(c => (c.id || `${c.day}-${c.start}`) === selectedCourseId);

  const toggleStudent = (uid, status = 'absent') => {
    setSelectedStudents(prev => {
      const existing = prev.find(s => s.uid === uid);
      if (existing) {
        if (existing.status === status) {
          return prev.filter(s => s.uid !== uid);
        } else {
          return prev.map(s => s.uid === uid ? { ...s, status } : s);
        }
      } else {
        return [...prev, { uid, status }];
      }
    });
  };

  const isSelected = (uid, status) => {
    const entry = selectedStudents.find(s => s.uid === uid);
    return entry && entry.status === status;
  };

  const countByStatus = (status) => {
    return selectedStudents.filter(s => s.status === status).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedStudents.length === 0) {
      setError('Veuillez sélectionner au moins un étudiant absent ou en retard.');
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
      const promises = selectedStudents.map(({ uid, status }) => {
        const isLate = status === 'late';
        const body = {
          studentId: uid,
          startDate: today,
          endDate: today,
          reason: isLate ? 'Retard en cours - ' + selectedCourse.title : 'Absence en cours - ' + selectedCourse.title,
          courseName: selectedCourse.title,
          isLate
        };
        return apiFetch('/absences/teacher/declare', {
          method: 'POST',
          body: JSON.stringify(body)
        });
      });

      const results = await Promise.all(promises);
      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
        const lateCount = selectedStudents.filter(s => s.status === 'late').length;
        const absentCount = selectedStudents.filter(s => s.status === 'absent').length;
        let message = '';
        if (absentCount > 0) message += `${absentCount} absence(s)`;
        if (lateCount > 0) message += (message ? ' et ' : '') + `${lateCount} retard(s)`;
        setSuccessMessage(`${message} déclaré(s) avec succès.`);
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
          <p>Déclarez les absences et retards pour votre cours du jour.</p>
        </div>
        <div className="teacher-page-icon"><IconCalendar /></div>
      </header>

      {loading && <p style={{ padding: '1rem' }}>Chargement...</p>}

      {error && <p className="teacher-error">{error}</p>}
      {successMessage && <p className="teacher-success">{successMessage}</p>}

      {!loading && !error && (
        <>
          <div className="teacher-course-picker" aria-label="Sélectionner un cours">
            {planning?.courses.map((course) => {
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
                  <span style={{ fontSize: '0.7rem', color: 'var(--ynov-text-muted)', display: 'block' }}>{course.group}</span>
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
                  <span style={{ fontSize: '0.8rem', color: 'var(--ynov-text-muted)', display: 'block' }}>
                    {selectedCourse.room ? `Salle: ${selectedCourse.room}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label className="teacher-search">
                    <IconSearch style={{ width: '16px', height: '16px' }} />
                    <input
                      type="search"
                      placeholder="Rechercher un élève"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="teacher-attendance-summary">
                <div>
                  <strong>{filteredStudents.length}</strong>
                  <span>Élèves suivis</span>
                </div>
                <div>
                  <strong>{selectedStudents.length}</strong>
                  <span>Sélectionnés</span>
                </div>
                {selectedStudents.length > 0 && (
                  <>
                    <div>
                      <strong>{countByStatus('absent')}</strong>
                      <span>Absents</span>
                    </div>
                    <div>
                      <strong>{countByStatus('late')}</strong>
                      <span>Retards</span>
                    </div>
                  </>
                )}
              </div>

              <div className="teacher-attendance-table-wrap">
                <table className="teacher-attendance-table">
                  <thead>
                    <tr>
                      <th>Élève</th>
                      <th>Classe</th>
                      <th>Absent</th>
                      <th>Retard</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const uid = student.uid || student.email;
                      const name = student.displayName || student.email || 'Élève';
                      const studentClass = student.className || student.department || selectedCourse.group || 'Classe non définie';
                      const isAbsent = isSelected(uid, 'absent');
                      const isLate = isSelected(uid, 'late');
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
                              className={`attendance-mark ${isAbsent ? 'selected absence' : ''}`}
                              onClick={() => toggleStudent(uid, 'absent')}
                            >
                              {isAbsent ? 'X' : ''}
                            </button>
                          </td>
                          <td className="attendance-cell">
                            <button
                              type="button"
                              aria-label={`Déclarer retard pour ${name}`}
                              className={`attendance-mark late ${isLate ? 'selected' : ''}`}
                              onClick={() => toggleStudent(uid, 'late')}
                            >
                              {isLate ? 'R' : ''}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td className="teacher-empty" colSpan="4">
                          Aucun élève ne correspond à la recherche ou à la classe de ce cours.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
                  {isSubmitting ? 'Envoi...' : `Déclarer (${selectedStudents.length} sélectionné(s))`}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}