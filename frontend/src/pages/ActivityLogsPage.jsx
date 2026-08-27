import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import { IconSearch, IconActivity } from '../components/Icons';
import './ActivityLogsPage.css';

// 🔥 Fonction de formatage ultra-robuste avec logs de débogage
const formatDate = (timestamp) => {
  if (!timestamp) return 'Date inconnue';
  
  try {
    let date = null;
    
    // Cas 1 : Objet avec seconds et nanoseconds (Firestore Admin SDK)
    if (typeof timestamp === 'object' && 'seconds' in timestamp && typeof timestamp.seconds === 'number') {
      date = new Date(timestamp.seconds * 1000);
    }
    // Cas 2 : Objet avec _seconds et _nanoseconds (Firestore Client SDK sérialisé)
    else if (typeof timestamp === 'object' && '_seconds' in timestamp && typeof timestamp._seconds === 'number') {
      date = new Date(timestamp._seconds * 1000);
    }
    // Cas 3 : Objet avec toDate (Firestore Timestamp)
    else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    }
    // Cas 4 : Chaîne ISO 8601
    else if (typeof timestamp === 'string') {
      const d = new Date(timestamp);
      if (!isNaN(d)) date = d;
    }
    // Cas 5 : Nombre (millisecondes depuis epoch)
    else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    
    if (date && !isNaN(date)) {
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Si on arrive là, on logue la structure pour déboguer
    console.warn('⚠️ Timestamp non reconnu :', JSON.stringify(timestamp), 'type:', typeof timestamp);
    return 'Date inconnue';
  } catch (e) {
    console.error('❌ Erreur formatDate:', e);
    return 'Date inconnue';
  }
};

const actionLabels = {
  'login': 'Connexion',
  'logout': 'Déconnexion',
  'create_user': 'Création utilisateur',
  'update_user': 'Modification utilisateur',
  'suspend_user': 'Suspension utilisateur',
  'delete_user': 'Suppression utilisateur',
  'submit_absence': 'Soumission absence',
  'review_absence': 'Validation absence',
  'delete_absence': 'Suppression absence',
  'teacher_declare_absence': 'Déclaration professeur',
  'justify_absence': 'Justification absence',
  'archive_absences': 'Archivage',
  'change_password': 'Changement mot de passe',
  'assign_teacher_class': 'Assignation classe',
  'enable_2fa': 'Activation 2FA',
  'disable_2fa': 'Désactivation 2FA',
  'link_parent_student': 'Liaison parent-étudiant'
};

export default function ActivityLogsPage() {
  const { role } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    startDate: '',
    endDate: ''
  });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiFetch('/users');
        if (data.success) {
          setUsers(data.data || []);
        }
      } catch (err) {
        console.error('Erreur chargement users:', err);
      }
    };
    fetchUsers();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      const data = await apiFetch(`/activity-logs?${params}`);
      if (data.success) {
        setLogs(data.logs);
      } else {
        setError(data.error || 'Erreur de chargement des logs.');
      }
    } catch (err) {
      setError('Erreur: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const resetFilters = () => {
    setFilters({ userId: '', action: '', startDate: '', endDate: '' });
    setTimeout(fetchLogs, 100);
  };

  const getUserName = (uid) => {
    const user = users.find(u => u.uid === uid);
    return user?.displayName || user?.email || uid;
  };

  return (
    <div className="activity-page">
      <header className="activity-header">
        <div>
          <p className="activity-kicker">Surveillance de l’application</p>
          <h1 className="activity-title"><IconActivity className="icon-md" /> Activity Logs</h1>
          <p className="activity-subtitle">Traçabilité complète des actions utilisateurs.</p>
        </div>
        <div className="activity-live-status">
          <span className="activity-live-dot" /> Journal actif
        </div>
      </header>

      <section className="activity-stats" aria-label="Résumé de l'activité">
        <div className="activity-stat-card">
          <div className="activity-stat-icon"><IconActivity /></div>
          <div><span>Événements</span><strong>{logs.length}</strong></div>
        </div>
        <div className="activity-stat-card">
          <div className="activity-stat-icon"><IconActivity /></div>
          <div><span>Connexions</span><strong>{logs.filter(l => l.action === 'login' || l.action === 'logout').length}</strong></div>
        </div>
        <div className="activity-stat-card">
          <div className="activity-stat-icon"><IconActivity /></div>
          <div><span>Absences</span><strong>{logs.filter(l => l.action && l.action.includes('absence')).length}</strong></div>
        </div>
        <div className="activity-stat-card">
          <div className="activity-stat-icon"><IconActivity /></div>
          <div><span>Dernière activité</span><strong>{logs.length > 0 ? formatDate(logs[0].timestamp) : '—'}</strong></div>
        </div>
      </section>

      <section className="activity-panel">
        <div className="activity-panel-header">
          <div>
            <h2>Fil d’activité</h2>
            <p>Les événements récents de votre organisation</p>
          </div>
          <div className="activity-filters">
            <select name="userId" value={filters.userId} onChange={handleFilterChange} aria-label="Filtrer par utilisateur">
              <option value="">Tous les utilisateurs</option>
              {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>)}
            </select>
            <select name="action" value={filters.action} onChange={handleFilterChange} aria-label="Filtrer par action">
              <option value="">Toutes les actions</option>
              {Object.entries(actionLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <label className="activity-date-filter">
              <span>Du</span>
              <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} aria-label="Date de début" />
            </label>
            <label className="activity-date-filter">
              <span>Au</span>
              <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} aria-label="Date de fin" />
            </label>
            <button className="btn-primary" onClick={applyFilters}><IconSearch className="icon-sm" /> Filtrer</button>
            <button className="ynov-btn-outline" onClick={resetFilters}>Réinitialiser</button>
          </div>
        </div>

        <div className="activity-table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>Chargement...</div>
          ) : error ? (
            <div style={{ padding: '2rem', color: '#ef4444' }}>{error}</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ynov-text-muted)' }}>Aucun log trouvé.</div>
          ) : (
            <table className="activity-table">
              <thead>
                <tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>IP</th><th>Détails</th></tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="activity-time">{formatDate(log.timestamp)}</td>
                    <td>
                      <div className="activity-user">
                        <span className="activity-avatar success">{getUserName(log.userId).charAt(0).toUpperCase()}</span>
                        <span><strong>{getUserName(log.userId)}</strong></span>
                      </div>
                    </td>
                    <td><span className="activity-category">{actionLabels[log.action] || log.action}</span></td>
                    <td>{log.ip || '—'}</td>
                    <td style={{ fontSize: '0.85rem', maxWidth: '200px', wordBreak: 'break-word' }}>
                      {log.details ? JSON.stringify(log.details).substring(0, 100) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="activity-footnote">Les logs sont enregistrés en temps réel côté serveur.</p>
      </section>
    </div>
  );
}