import { useMemo, useState } from 'react';
import {
  IconActivity,
  IconCheckCircle,
  IconClock,
  IconSearch,
  IconUsers,
} from '../components/Icons';
import './ActivityLogsPage.css';

const activityLogs = [
  {
    id: 1,
    actor: 'Sophie Martin',
    initials: 'SM',
    role: 'Administrateur',
    action: 'a créé un utilisateur',
    target: 'Thomas Bernard',
    category: 'Utilisateurs',
    status: 'success',
    date: '2026-08-19',
    time: 'Aujourd’hui, 10:42',
  },
  {
    id: 2,
    actor: 'Lucas Petit',
    initials: 'LP',
    role: 'Personnel',
    action: "s'est connecté à l'application",
    target: '',
    category: 'Authentification',
    status: 'success',
    date: '2026-08-19',
    time: 'Aujourd’hui, 10:31',
  },
  {
    id: 3,
    actor: 'Sophie Martin',
    initials: 'SM',
    role: 'Administrateur',
    action: 'a modifié le rôle de',
    target: 'Emma Richard',
    category: 'Utilisateurs',
    status: 'success',
    date: '2026-08-19',
    time: 'Aujourd’hui, 09:58',
  },
  {
    id: 4,
    actor: 'Système',
    initials: 'SY',
    role: 'Notification',
    action: 'a envoyé une notification à',
    target: '12 utilisateurs',
    category: 'Notifications',
    status: 'info',
    date: '2026-08-19',
    time: 'Aujourd’hui, 09:46',
  },
  {
    id: 5,
    actor: 'Clara Dubois',
    initials: 'CD',
    role: 'Étudiant',
    action: 'a envoyé un justificatif',
    target: 'Absence du 18 août',
    category: 'Documents',
    status: 'info',
    date: '2026-08-18',
    time: 'Hier, 17:24',
  },
  {
    id: 6,
    actor: 'Marc Leroy',
    initials: 'ML',
    role: 'Manager',
    action: 'a refusé la demande de',
    target: 'Clara Dubois',
    category: 'Absences',
    status: 'warning',
    date: '2026-08-18',
    time: 'Hier, 16:08',
  },
  {
    id: 7,
    actor: 'Système',
    initials: 'SY',
    role: 'Notification',
    action: 'a reçu une confirmation de lecture',
    target: 'Notification #284',
    category: 'Notifications',
    status: 'success',
    date: '2026-08-18',
    time: 'Hier, 15:52',
  },
];

const categoryOptions = ['Toutes les catégories', 'Authentification', 'Utilisateurs', 'Notifications', 'Documents', 'Absences'];
const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'success', label: 'Réussi' },
  { value: 'info', label: 'Information' },
  { value: 'warning', label: 'Attention' },
];

function statusLabel(status) {
  return status === 'warning' ? 'Attention' : status === 'info' ? 'Information' : 'Réussi';
}

export default function ActivityLogsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(categoryOptions[0]);
  const [userFilter, setUserFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const userOptions = useMemo(
    () => [...new Set(activityLogs.map((log) => log.actor))].sort(),
    [],
  );

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return activityLogs.filter((log) => {
      const matchesCategory = category === categoryOptions[0] || log.category === category;
      const matchesUser = userFilter === 'all' || log.actor === userFilter;
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
      const matchesDateFrom = !dateFrom || log.date >= dateFrom;
      const matchesDateTo = !dateTo || log.date <= dateTo;
      const searchableText = `${log.actor} ${log.action} ${log.target} ${log.category}`.toLowerCase();
      return matchesCategory && matchesUser && matchesStatus && matchesDateFrom && matchesDateTo
        && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [category, dateFrom, dateTo, search, statusFilter, userFilter]);

  return (
    <div className="activity-page">
      <header className="activity-header">
        <div>
          <p className="activity-kicker">Surveillance de l’application</p>
          <h1 className="activity-title">Activity Logs</h1>
          <p className="activity-subtitle">Suivez les actions importantes réalisées dans l’entreprise.</p>
        </div>
        <div className="activity-live-status">
          <span className="activity-live-dot" /> Journal actif
        </div>
      </header>

      <section className="activity-stats" aria-label="Résumé de l'activité">
        <div className="activity-stat-card">
          <div className="activity-stat-icon"><IconActivity /></div>
          <div><span>Événements aujourd’hui</span><strong>24</strong></div>
        </div>
        <div className="activity-stat-card">
          <div className="activity-stat-icon"><IconUsers /></div>
          <div><span>Utilisateurs actifs</span><strong>18</strong></div>
        </div>
        <div className="activity-stat-card">
          <div className="activity-stat-icon"><IconCheckCircle /></div>
          <div><span>Actions réussies</span><strong>96%</strong></div>
        </div>
        <div className="activity-stat-card">
          <div className="activity-stat-icon"><IconClock /></div>
          <div><span>Dernière activité</span><strong>Il y a 6 min</strong></div>
        </div>
      </section>

      <section className="activity-panel">
        <div className="activity-panel-header">
          <div>
            <h2>Fil d’activité</h2>
            <p>Les événements récents de votre organisation</p>
          </div>
          <div className="activity-filters">
           
            <select value={userFilter} onChange={(event) => setUserFilter(event.target.value)} aria-label="Filtrer par utilisateur">
              <option value="all">Tous les utilisateurs</option>
              {userOptions.map((user) => <option key={user} value={user}>{user}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrer par statut">
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrer par catégorie">
              {categoryOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
            <label className="activity-date-filter">
              <span>Du</span>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Date de début" />
            </label>
            <label className="activity-date-filter">
              <span>Au</span>
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Date de fin" />
            </label>
          </div>
        </div>

        <div className="activity-table-wrap">
          <table className="activity-table">
            <thead>
              <tr><th>Utilisateur</th><th>Action</th><th>Catégorie</th><th>Statut</th><th>Date</th></tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr><td className="activity-empty" colSpan="5">Aucune activité ne correspond à vos filtres.</td></tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td><div className="activity-user"><span className={`activity-avatar ${log.status}`}>{log.initials}</span><span><strong>{log.actor}</strong><small>{log.role}</small></span></div></td>
                  <td>{log.action} {log.target && <strong>{log.target}</strong>}</td>
                  <td><span className="activity-category">{log.category}</span></td>
                  <td><span className={`activity-status ${log.status}`}>{statusLabel(log.status)}</span></td>
                  <td className="activity-time">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="activity-footnote">Affichage local de démonstration : la collecte temps réel nécessitera une source d’événements côté serveur.</p>
      </section>
    </div>
  );
}
