import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import { IconSearch, IconCalendar } from '../components/Icons';
import './TeacherPages.css';

const formatDate = (timestamp) => {
  if (!timestamp) return 'Date inconnue';
  try {
    if (typeof timestamp === 'object' && timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    return 'Date inconnue';
  } catch { return 'Date inconnue'; }
};

export default function TeacherAbsencesList() {
  const { role } = useAuth();
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    className: '',
    courseName: '',
    startDate: '',
    endDate: ''
  });
  const [classOptions, setClassOptions] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const data = await apiFetch('/users/my-students');
        if (data.success) {
          const classes = [...new Set(data.students.map(s => s.className || s.department).filter(Boolean))];
          setClassOptions(classes);
        }
      } catch (err) {
        console.error('Erreur chargement classes:', err);
      }
    };
    fetchTeacherData();
  }, []);

  const fetchAbsences = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.className) params.append('className', filters.className);
      if (filters.courseName) params.append('courseName', filters.courseName);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      const data = await apiFetch(`/absences/by-course?${params}`);
      if (data.success) {
        setAbsences(data.absences);
        const courses = [...new Set(data.absences.map(a => a.courseName).filter(Boolean))];
        setCourseOptions(courses);
      } else {
        setError(data.error || 'Erreur de chargement');
      }
    } catch (err) {
      setError('Erreur: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsences();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    fetchAbsences();
  };

  const resetFilters = () => {
    setFilters({ className: '', courseName: '', startDate: '', endDate: '' });
    setTimeout(fetchAbsences, 100);
  };

  return (
    <section className="teacher-page" style={{ padding: '2rem' }}>
      <header className="teacher-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <p className="teacher-kicker" style={{ color: 'var(--ynov-text-muted)' }}>Espace pédagogique</p>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Absences par classe et cours</h1>
          <p style={{ color: 'var(--ynov-text-muted)' }}>Consultez les absences de vos étudiants.</p>
        </div>
        <div className="teacher-page-icon"><IconCalendar style={{ width: '32px', height: '32px', color: 'var(--ynov-cyan)' }} /></div>
      </header>

      <form onSubmit={applyFilters} style={{
        display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'end',
        padding: '16px', background: '#fff', borderRadius: '1rem',
        border: '1px solid #e2e8f0', marginBottom: '1.5rem'
      }}>
        <div className="filter-group" style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#475569' }}>Classe</label>
          <select name="className" value={filters.className} onChange={handleFilterChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff' }}>
            <option value="">Toutes les classes</option>
            {classOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}
          </select>
        </div>
        <div className="filter-group" style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#475569' }}>Cours</label>
          <select name="courseName" value={filters.courseName} onChange={handleFilterChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff' }}>
            <option value="">Tous les cours</option>
            {courseOptions.map(crs => <option key={crs} value={crs}>{crs}</option>)}
          </select>
        </div>
        <div className="filter-group" style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#475569' }}>Date début</label>
          <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
        </div>
        <div className="filter-group" style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#475569' }}>Date fin</label>
          <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
        </div>
        <div className="filter-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}><IconSearch className="icon-sm" /> Filtrer</button>
          <button type="button" className="ynov-btn-outline" onClick={resetFilters} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'transparent', cursor: 'pointer' }}>Réinitialiser</button>
        </div>
      </form>

      {error && <p className="teacher-error">{error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px' }}>Chargement...</div>
      ) : absences.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ynov-text-muted)' }}>
          Aucune absence trouvée pour ces critères.
        </div>
      ) : (
        <div className="panel" style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <strong style={{ color: '#1e293b' }}>{absences.length} absence(s)</strong>
          </div>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: '#475569' }}>Étudiant</th>
                <th style={{ textAlign: 'left', padding: '8px', color: '#475569' }}>Classe</th>
                <th style={{ textAlign: 'left', padding: '8px', color: '#475569' }}>Cours</th>
                <th style={{ textAlign: 'left', padding: '8px', color: '#475569' }}>Période</th>
                <th style={{ textAlign: 'left', padding: '8px', color: '#475569' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {absences.map((absence) => (
                <tr key={absence.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px', color: '#1e293b' }}>{absence.displayName || 'Inconnu'}</td>
                  <td style={{ padding: '8px', color: '#1e293b' }}>{absence.department || absence.className || '—'}</td>
                  <td style={{ padding: '8px', color: '#1e293b' }}>{absence.courseName || '—'}</td>
                  <td style={{ padding: '8px', color: '#1e293b' }}>{formatDate(absence.startDate)} → {formatDate(absence.endDate)}</td>
                  <td style={{ padding: '8px' }}>
                    <span className={`status-badge ${absence.status === 'approved' ? 'approved' : absence.status === 'pending' ? 'pending' : 'urgent'}`}>
                      {absence.status === 'approved' ? 'Validée' : absence.status === 'pending' ? 'En attente' : 'À justifier'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}