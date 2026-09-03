import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import {
  IconAlertTriangle, IconCalendar, IconCheckCircle, IconFolder, IconHourglass,
  IconInbox, IconUsers, IconXCircle,
} from '../components/Icons';
import '../components/DashboardLayout.css';

const STAFF_WITH_GLOBAL_STATS = ['admin', 'employee'];
const REVIEWERS = ['admin', 'employee', 'manager'];

function getDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'object' && value.seconds !== undefined) return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = getDate(value);
  return date ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date non renseignée';
}

function getInitials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function statusLabel(status) {
  return { approved: 'Validée', rejected: 'Refusée', pending: 'En attente', to_justify: 'À justifier' }[status] || 'En attente';
}

function statusClass(status) {
  return status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';
}

function DashboardCard({ label, value, detail, icon: Icon, highlight = false }) {
  return <div className={`stat-card ${highlight ? 'highlight' : ''}`}>
    <div className="stat-header"><span className="stat-title">{label}</span><div className="stat-icon-wrapper"><Icon className="icon-md" /></div></div>
    <div className="stat-value-container"><span className="stat-value">{value}</span></div>
    {detail && <div className="stat-subtitle">{detail}</div>}
  </div>;
}

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { user, backendUser, role } = useAuth();
  const [data, setData] = useState({ absences: [], stats: null, students: [], children: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      if (!role) return;
      setLoading(true);
      setError('');
      try {
        const nextData = { absences: [], stats: null, students: [], children: [] };
        if (role === 'student') {
          const result = await apiFetch('/absences/my');
          if (!result.success) throw new Error(result.error);
          nextData.absences = result.absences || [];
        } else if (role === 'parent') {
          const [absencesResult, childrenResult] = await Promise.all([apiFetch('/absences/children'), apiFetch('/users/my-children')]);
          if (!absencesResult.success) throw new Error(absencesResult.error);
          nextData.absences = absencesResult.absences || [];
          nextData.children = childrenResult.success ? childrenResult.children || [] : [];
        } else if (role === 'teacher') {
          const [absencesResult, studentsResult] = await Promise.all([apiFetch('/absences/my'), apiFetch('/users/my-students')]);
          nextData.absences = absencesResult.success ? absencesResult.absences || [] : [];
          nextData.students = studentsResult.success ? studentsResult.students || [] : [];
        } else if (STAFF_WITH_GLOBAL_STATS.includes(role)) {
          const result = await apiFetch('/absences/statistics');
          if (!result.success) throw new Error(result.error);
          nextData.stats = result.stats;
        } else if (REVIEWERS.includes(role)) {
          const result = await apiFetch('/absences/pending');
          if (!result.success) throw new Error(result.error);
          nextData.absences = result.absences || [];
        }
        if (active) setData(nextData);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Impossible de charger le tableau de bord.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDashboard();
    return () => { active = false; };
  }, [role]);

  const profileName = user?.displayName || backendUser?.displayName || user?.email?.split('@')[0] || 'utilisateur';
  const absences = data.absences;
  const counts = useMemo(() => ({
    total: absences.length,
    approved: absences.filter((absence) => absence.status === 'approved').length,
    pending: absences.filter((absence) => absence.status === 'pending').length,
    toJustify: absences.filter((absence) => absence.status === 'to_justify').length,
    rejected: absences.filter((absence) => absence.status === 'rejected').length,
  }), [absences]);

  const isStudent = role === 'student';
  const isParent = role === 'parent';
  const isTeacher = role === 'teacher';
  const isGlobalStaff = STAFF_WITH_GLOBAL_STATS.includes(role);
  const isReviewer = REVIEWERS.includes(role);
  const title = isStudent ? 'Mon tableau de bord' : isParent ? 'Suivi de mes enfants' : isTeacher ? 'Espace professeur' : isGlobalStaff ? 'Tableau de bord administratif' : isReviewer ? 'Demandes à traiter' : 'Tableau de bord';
  const subtitle = isStudent ? 'Retrouvez vos absences et les actions à effectuer.' : isParent ? 'Suivez les absences et les dossiers de vos enfants.' : isTeacher ? 'Visualisez vos groupes et votre activité récente.' : isGlobalStaff ? 'Vue d’ensemble des absences de l’établissement.' : 'Consultez les demandes en attente de traitement.';

  const cards = isStudent ? [
    { label: 'Absences enregistrées', value: counts.total, detail: 'Depuis le début de l’année', icon: IconCalendar },
    { label: 'Validées', value: counts.approved, detail: 'Justificatifs acceptés', icon: IconCheckCircle },
    { label: 'À justifier', value: counts.toJustify + counts.pending, detail: 'Action requise', icon: IconHourglass, highlight: true },
    { label: 'Refusées', value: counts.rejected, detail: 'À consulter', icon: IconXCircle },
  ] : isParent ? [
    { label: 'Enfant(s) suivi(s)', value: data.children.length, detail: 'Liés à votre compte', icon: IconUsers },
    { label: 'Absences', value: counts.total, detail: 'Tous enfants confondus', icon: IconCalendar },
    { label: 'À justifier', value: counts.toJustify + counts.pending, detail: 'Action requise', icon: IconHourglass, highlight: true },
    { label: 'Validées', value: counts.approved, detail: 'Justificatifs acceptés', icon: IconCheckCircle },
  ] : isTeacher ? [
    { label: 'Élèves suivis', value: data.students.length, detail: 'Dans vos groupes', icon: IconUsers },
    { label: 'Classes attribuées', value: backendUser?.assignedClasses?.length || 0, detail: 'Cette année', icon: IconFolder },
    { label: 'Mes absences', value: counts.total, detail: 'Historique personnel', icon: IconCalendar },
    { label: 'En attente', value: counts.pending + counts.toJustify, detail: 'À régulariser', icon: IconHourglass, highlight: true },
  ] : isGlobalStaff ? [
    { label: 'Total demandes', value: data.stats?.total ?? 0, detail: 'Toutes les absences', icon: IconInbox },
    { label: 'En attente', value: data.stats?.pending ?? 0, detail: 'À traiter', icon: IconHourglass, highlight: true },
    { label: 'Validées', value: data.stats?.approved ?? 0, detail: 'Demandes acceptées', icon: IconCheckCircle },
    { label: 'Refusées', value: data.stats?.rejected ?? 0, detail: 'Demandes rejetées', icon: IconXCircle },
  ] : [
    { label: 'Demandes en attente', value: counts.total, detail: 'À examiner', icon: IconHourglass, highlight: true },
    { label: 'À justifier', value: counts.toJustify, detail: 'Justificatif requis', icon: IconAlertTriangle },
    { label: 'Demandes récentes', value: counts.pending, detail: 'En cours de traitement', icon: IconInbox },
  ];

  const recentRows = (isGlobalStaff ? [] : absences).slice(0, 5);
  const quickActions = isStudent ? [['Mes absences', '/absences/mes-absences'], ['Demander un document', '/documents/demandes']]
    : isParent ? [['Absences de mes enfants', '/absences/mes-absences'], ['Documents de mes enfants', '/documents']]
      : isTeacher ? [['Mes élèves', '/pedagogie/eleves'], ['Faire l’appel', '/pedagogie/appel'], ['Mon planning', '/pedagogie/planning']]
        : isReviewer ? [['Traiter les absences', '/absences/demandes'], ...(role === 'admin' ? [['Gérer les utilisateurs', '/users']] : [])] : [];

  return <div className="dashboard-scroll-area" style={{ height: '100%', overflowY: 'auto', padding: '0 2rem 2rem' }}>
    <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
      <div><h2 className="overview-title">{title}</h2><p className="overview-subtitle">Bonjour {profileName}, {subtitle}</p></div>
      {quickActions[0] && <button className="btn-primary" type="button" onClick={() => navigate(quickActions[0][1])}>{quickActions[0][0]}</button>}
    </div>
    {loading ? <div className="panel" style={{ textAlign: 'center', padding: '40px' }}>Chargement du tableau de bord…</div> : error ? <div className="panel" style={{ color: '#dc2626', padding: '24px' }}><strong>Impossible de charger les données.</strong><div style={{ marginTop: '6px' }}>{error}</div></div> : <>
      <div className="stats-grid">{cards.map((card) => <DashboardCard key={card.label} {...card} />)}</div>
      <div className="content-grid" style={{ marginTop: '24px' }}><div className="left-col"><div className="panel"><div className="panel-header"><h3 className="panel-title">{isTeacher ? 'Activité récente' : isGlobalStaff ? 'Répartition des demandes' : 'Absences récentes'}</h3></div>{isGlobalStaff ? <StatusDistribution stats={data.stats} /> : <RecentAbsences rows={recentRows} isParent={isParent} />}</div></div><div className="right-col"><div className="panel urgent"><h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}><IconAlertTriangle className="icon-sm" /> À votre attention</h3><p style={{ margin: 0, color: 'var(--ynov-text-muted)', lineHeight: 1.5 }}>{isStudent || isParent ? `${counts.toJustify + counts.pending} absence(s) nécessite(nt) une action ou un suivi.` : isTeacher ? 'Utilisez l’appel pour enregistrer les présences de vos groupes.' : `${data.stats?.pending ?? counts.total} demande(s) sont actuellement en attente.`}</p></div>{quickActions.length > 1 && <div className="panel" style={{ marginTop: '20px' }}><h3 className="panel-title" style={{ marginBottom: '14px' }}>Accès rapides</h3><div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{quickActions.slice(1).map(([label, path]) => <button key={path} type="button" className="btn-outline" onClick={() => navigate(path)}>{label}</button>)}</div></div>}</div></div>
    </>}</div>;
}

function RecentAbsences({ rows, isParent }) {
  if (!rows.length) return <p style={{ color: 'var(--ynov-text-muted)', margin: 0 }}>Aucune absence récente à afficher.</p>;
  return <table className="data-table"><thead><tr><th>{isParent ? 'Élève' : 'Motif'}</th><th>Période</th><th>Statut</th></tr></thead><tbody>{rows.map((absence) => {
    const name = absence.displayName || absence.studentName || absence.userEmail || 'Élève';
    return <tr key={absence.id || `${absence.userId}-${absence.startDate}`}><td><div className="user-cell"><div className="mini-avatar">{getInitials(isParent ? name : absence.reason || 'A')}</div>{isParent ? name : absence.reason || 'Absence déclarée'}</div></td><td>{formatDate(absence.startDate)}</td><td><span className={`status-badge ${statusClass(absence.status)}`}>{statusLabel(absence.status)}</span></td></tr>;
  })}</tbody></table>;
}

function StatusDistribution({ stats }) {
  const total = stats?.total || 0;
  const entries = [['En attente', stats?.pending || 0, '#f59e0b'], ['Validées', stats?.approved || 0, '#10b981'], ['Refusées', stats?.rejected || 0, '#ef4444']];
  return <div>{entries.map(([label, value, color]) => <div key={label} style={{ marginBottom: '16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '.85rem' }}><span>{label}</span><strong>{value}</strong></div><div style={{ height: '8px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}><div style={{ width: `${total ? (value / total) * 100 : 0}%`, height: '100%', background: color }} /></div></div>)}</div>;
}
