import { useEffect, useMemo, useState } from 'react';
import { IconSearch, IconUsers } from '../components/Icons';
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

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const data = await apiFetch('/users/my-students');
        if (data.success) {
          setStudents(data.students);
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

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) =>
      `${student.displayName || ''} ${student.email || ''} ${student.department || ''}`.toLowerCase().includes(query)
    );
  }, [search, students]);

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