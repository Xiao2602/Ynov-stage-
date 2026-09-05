import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/api';
import { IconArchive, IconAlertTriangle, IconCheckCircle } from '../components/Icons';

export default function ArchivePage() {
  const [year, setYear] = useState('');
  const [yearOptions, setYearOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Générer les années scolaires (5 dernières années)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      const start = currentYear - i - 1;
      const end = currentYear - i;
      years.push(`${start}-${end}`);
    }
    setYearOptions(years);
    setYear(years[0]);
  }, []);

  const handleArchive = async (e) => {
    e.preventDefault();
    if (!year) {
      setError('Veuillez sélectionner une année scolaire.');
      return;
    }
    if (!window.confirm(`Archiver définitivement les absences de l'année ${year} ?`)) return;

    setLoading(true);
    setError('');
    setMessage('');
    try {
      // 🔥 CORRECTION : plus de /api en double
      const result = await apiFetch('/absences/archive', {
        method: 'POST',
        body: JSON.stringify({ year })
      });
      if (result.success) {
        setMessage(result.message);
        setYear(yearOptions[0]);
      } else {
        setError(result.error || 'Erreur lors de l\'archivage.');
      }
    } catch (err) {
      setError('Erreur: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem' }}><IconArchive className="icon-md" /> Archivage des données</h2>
      <p style={{ color: 'var(--ynov-text-muted)', marginBottom: '1.5rem' }}>
        Cette opération déplace toutes les absences d'une année scolaire vers les archives.
      </p>

      {message && (
        <div style={{ padding: '12px', background: '#d1fae5', color: '#065f46', borderRadius: '8px', marginBottom: '1rem' }}>
          <IconCheckCircle className="icon-sm" /> {message}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem' }}>
          <IconAlertTriangle className="icon-sm" /> {error}
        </div>
      )}

      <form onSubmit={handleArchive} style={{
        background: 'var(--ynov-card)', border: '1px solid var(--ynov-border)',
        borderRadius: '1rem', padding: '1.5rem'
      }}>
        <div className="form-group">
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Année scolaire</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontSize: '0.95rem',
              background: 'white'
            }}
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <small style={{ color: 'var(--ynov-text-muted)' }}>Sélectionnez l'année scolaire à archiver.</small>
        </div>
        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
          {loading ? 'Archivage en cours...' : 'Archiver'}
        </button>
      </form>
    </div>
  );
}