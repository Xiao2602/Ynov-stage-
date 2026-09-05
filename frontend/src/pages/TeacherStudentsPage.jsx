import { useEffect, useMemo, useState } from 'react';
import { IconSearch, IconUsers, IconFilter } from '../components/Icons';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import './TeacherPages.css';

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '??';
}

export default function TeacherStudentsPage() {
  const { backendUser } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [classOptions, setClassOptions] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const data = await apiFetch('/users/my-students');
        if (data.success) {
          setStudents(data.students);
          // Extraire les classes uniques
          const classes = [...new Set(data.students.map(s => s.className || s.department || 'Classe non définie').filter(Boolean))];
          setClassOptions(classes);
        } else {
          setError(data.error || 'Impossible de charger les élèves.');
        }
      } catch (err) {
        setError('Erreur de connexion : ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Filtrer par classe
  const studentsByClass = useMemo(() => {
    if (selectedClass === 'all') return students;
    return students.filter(student => {
      const studentClass = student.className || student.department || '';
      return studentClass === selectedClass;
    });
  }, [students, selectedClass]);

  // Filtrer par recherche
  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return studentsByClass.filter((student) =>
      `${student.displayName || ''} ${student.email || ''} ${student.className || ''} ${student.department || ''}`.toLowerCase().includes(query)
    );
  }, [search, studentsByClass]);

  return (
    <section className="teacher-page">
      <header className="teacher-page-header">
        <div>
          <p className="teacher-kicker">Espace pédagogique</p>
          <h1>Mes élèves</h1>
          <p>Élèves de votre filière.</p>
        </div>
        <div className="teacher-page-icon"><IconUsers /></div>
      </header>

      <div className="teacher-toolbar">
        <span>{filteredStudents.length} élève{filteredStudents.length > 1 ? 's' : ''}</span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 🔥 Filtre par classe */}
          {classOptions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconFilter style={{ width: '16px', height: '16px', color: 'var(--ynov-text-muted)' }} />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  outline: 'none'
                }}
              >
                <option value="all">Toutes les classes</option>
                {classOptions.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          )}
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

      {loading && <p style={{ padding: '1rem' }}>Chargement...</p>}
      {error && <p className="teacher-error">{error}</p>}

      <div className="teacher-student-grid">
        {filteredStudents.map((student) => {
          const name = student.displayName || student.email || 'Élève';
          const studentClass = [student.level, student.department].filter(Boolean).join(' - ') || 'Classe non renseignée';
          return (
            <article className="teacher-student-card" key={student.uid || student.email}>
              <div className="teacher-student-avatar">{initials(name)}</div>
              <div>
                <strong>{name}</strong>
                <span className="teacher-student-class">{studentClass}</span>
                <span>{student.email || 'Email non renseigné'}</span>
              </div>
            </article>
          );
        })}
        {!loading && !error && filteredStudents.length === 0 && (
          <p className="teacher-empty">Aucun élève ne correspond à votre recherche.</p>
        )}
      </div>
    </section>
  );
}