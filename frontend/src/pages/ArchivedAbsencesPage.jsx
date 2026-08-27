import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import { IconArchive, IconSearch, IconCalendar } from '../components/Icons';
import '../components/DashboardLayout.css';

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

export default function ArchivedAbsencesPage() {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [yearOptions, setYearOptions] = useState([]);
  const [filteredAbsences, setFilteredAbsences] = useState([]);

  useEffect(() => {
    // Générer les années disponibles (5 dernières)
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 6; i++) {
      years.push(currentYear - i);
    }
    setYearOptions(years);
    setSelectedYear(years[0]);
  }, []);

  const fetchArchived = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/absences/archived');
      if (data.success) {
        setAbsences(data.absences);
      } else {
        setError(data.error || 'Erreur de chargement des archives.');
      }
    } catch (err) {
      setError('Erreur: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, []);

  useEffect(() => {
    // Filtrer par année sélectionnée
    if (!selectedYear) {
      setFilteredAbsences(absences);
      return;
    }
    const yearNum = parseInt(selectedYear);
    const filtered = absences.filter(a => {
      const date = a.startDate || a.createdAt;
      if (!date) return false;
      let docYear;
      if (typeof date === 'object' && date.seconds !== undefined) {
        docYear = new Date(date.seconds * 1000).getFullYear();
      } else if (typeof date === 'string') {
        docYear = new Date(date).getFullYear();
      } else if (date.toDate) {
        docYear = date.toDate().getFullYear();
      } else {
        docYear = new Date(date).getFullYear();
      }
      return docYear === yearNum;
    });
    setFilteredAbsences(filtered);
  }, [selectedYear, absences]);

  const finalFiltered = filteredAbsences.filter(a => {
    const q = searchQuery.toLowerCase();
    return (a.displayName || '').toLowerCase().includes(q) ||
           (a.reason || '').toLowerCase().includes(q) ||
           (a.courseName || '').toLowerCase().includes(q);
  });

  return (
    <div className="dashboard-scroll-area" style={{ padding: '2rem' }}>
      <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="overview-title"><IconArchive className="icon-md" /> Absences archivées</h2>
          <p className="overview-subtitle">Historique des années scolaires précédentes.</p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 className="panel-title">Archives</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#475569' }}>Année :</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff' }}
              >
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="search-bar">
              <IconSearch className="search-icon" />
              <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>Chargement...</div>
        ) : error ? (
          <div style={{ padding: '2rem', color: '#ef4444' }}>{error}</div>
        ) : finalFiltered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ynov-text-muted)' }}>
            Aucune archive trouvée pour l'année {selectedYear}.
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Période</th>
                <th>Motif</th>
                <th>Statut</th>
                <th>Archivé le</th>
              </tr>
            </thead>
            <tbody>
              {finalFiltered.map(a => (
                <tr key={a.id}>
                  <td>{a.displayName || 'Inconnu'}</td>
                  <td>{formatDate(a.startDate)} → {formatDate(a.endDate)}</td>
                  <td>{a.reason || '—'}</td>
                  <td>
                    <span className={`status-badge ${a.status === 'approved' ? 'approved' : 'pending'}`}>
                      {a.status === 'approved' ? 'Validée' : a.status === 'pending' ? 'En attente' : a.status}
                    </span>
                  </td>
                  <td>{formatDate(a.archivedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}