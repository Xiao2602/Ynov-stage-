import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import {
  IconAlertTriangle, IconArchive, IconCalendar, IconCheckCircle, IconDocument,
  IconDots, IconEye, IconInbox, IconUsers,
} from '../components/Icons';
import './AbsenceDashboardOverview.css';

const GLOBAL_DOCUMENT_ROLES = ['admin', 'employee', 'manager', 'rh'];

function getDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'object' && value.seconds !== undefined) return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getDashboardDocuments(query = '') {
  try {
    return await apiFetch(`/documents/dashboard${query}`);
  } catch (error) {
    const isMissingDashboardRoute = String(error.message || '').includes('/documents/dashboard')
      && String(error.message || '').includes('introuvable');
    if (!isMissingDashboardRoute) throw error;
    return apiFetch(`/documents/my${query}`);
  }
}

function formatDate(value) {
  const date = getDate(value);
  return date ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function MetricCard({ label, value, detail, icon: Icon, emphasis }) {
  return <article className={`absence-metric-card ${emphasis ? 'is-emphasis' : ''}`}>
    <div className="absence-metric-heading"><span>{label}</span><span className="absence-metric-icon"><Icon /></span></div>
    <div className="absence-metric-value">{value}</div>
    {detail && <span className={`absence-metric-detail ${emphasis ? 'is-alert' : ''}`}>{detail}</span>}
  </article>;
}

function dayKey(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function getWeekInputValue(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getWeekRange(weekValue) {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekValue);
  if (!match) return getWeekRange(getWeekInputValue(new Date()));
  const [, yearValue, weekNumber] = match;
  const januaryFourth = new Date(Number(yearValue), 0, 4);
  const mondayOffset = (januaryFourth.getDay() + 6) % 7;
  const start = new Date(januaryFourth);
  start.setDate(januaryFourth.getDate() - mondayOffset + (Number(weekNumber) - 1) * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

function formatWeekRange(weekRange) {
  const start = weekRange.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const end = new Date(weekRange.start);
  end.setDate(end.getDate() + 4);
  return `${start} – ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

function isInWeek(document, weekRange) {
  const createdAt = getDate(document.createdAt || document.updatedAt);
  return createdAt && createdAt >= weekRange.start && createdAt < weekRange.end;
}

function WeekCalendarPicker({ selectedWeek, onSelectWeek }) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const weekStart = getWeekRange(selectedWeek).start;
    return new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
  });
  const selectedRange = getWeekRange(selectedWeek);
  const firstDay = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
  const calendarStart = new Date(firstDay);
  calendarStart.setDate(1 - ((firstDay.getDay() + 6) % 7));
  const today = dayKey(new Date());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  }).filter((date) => date.getDay() !== 0 && date.getDay() !== 6);

  return <div className="absence-calendar-picker">
    <button className="absence-period-button absence-calendar-button" type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-haspopup="dialog"><IconCalendar /><span>{formatWeekRange(selectedRange)}</span></button>
    {isOpen && <div className="absence-calendar-popover" role="dialog" aria-label="Choisir une semaine">
      <div className="absence-calendar-header"><button type="button" onClick={() => setDisplayedMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mois précédent">‹</button><strong>{displayedMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong><button type="button" onClick={() => setDisplayedMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Mois suivant">›</button></div>
      <div className="absence-calendar-weekdays">{['L', 'M', 'M', 'J', 'V'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="absence-calendar-days">{days.map((date) => { const isSelectedWeek = date >= selectedRange.start && date < selectedRange.end; return <button key={dayKey(date)} type="button" onClick={() => { onSelectWeek(getWeekInputValue(date)); setIsOpen(false); }} className={`${date.getMonth() === displayedMonth.getMonth() ? '' : 'is-outside'} ${isSelectedWeek ? 'is-selected-week' : ''} ${dayKey(date) === today ? 'is-today' : ''}`.trim()}>{date.getDate()}</button>; })}</div>
      <p>Cliquez sur un jour pour afficher sa semaine.</p>
    </div>}
  </div>;
}

function getChartMaximum(value) {
  const targetStep = Math.max(value / 4, 1);
  const magnitude = 10 ** Math.floor(Math.log10(targetStep));
  const normalizedStep = targetStep / magnitude;
  const step = (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10) * magnitude;
  return step * 4;
}

function DocumentTrend({ trend }) {
  const width = 720;
  const height = 315;
  const area = { left: 57, right: 24, top: 25, bottom: 61 };
  const chartWidth = width - area.left - area.right;
  const chartHeight = height - area.top - area.bottom;
  const highestCount = Math.max(...trend.map((point) => point.count), 0);
  const max = getChartMaximum(highestCount);
  const x = (index) => area.left + (index * chartWidth) / Math.max(trend.length - 1, 1);
  const y = (value) => area.top + ((max - value) / max) * chartHeight;
  const points = trend.map((point, index) => `${x(index)},${y(point.count)}`).join(' ');
  const areaPath = `M ${x(0)},${y(trend[0].count)} L ${points} L ${x(trend.length - 1)},${area.top + chartHeight} L ${x(0)},${area.top + chartHeight} Z`;

  return <div className="absence-line-chart">
    <div className="absence-chart-key"><span><i />Documents générés</span><small>Nombre de documents créés par jour.</small></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Évolution des documents générés">
      <defs><linearGradient id="document-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity=".25" /><stop offset="100%" stopColor="#06b6d4" stopOpacity=".02" /></linearGradient></defs>
      {[1, .75, .5, .25, 0].map((ratio) => <g key={ratio}><line x1={area.left} x2={width - area.right} y1={area.top + (1 - ratio) * chartHeight} y2={area.top + (1 - ratio) * chartHeight} className="absence-chart-gridline" /><text x={area.left - 12} y={area.top + (1 - ratio) * chartHeight + 4} className="absence-chart-y-label" textAnchor="end">{Math.round(max * ratio)}</text></g>)}
      <path d={areaPath} fill="url(#document-area)" /><polyline points={points} fill="none" className="absence-chart-line" />
      {trend.map((point, index) => <g key={point.label}><title>{`${point.label} : ${point.count} document${point.count > 1 ? 's' : ''}`}</title><circle cx={x(index)} cy={y(point.count)} r="5" className="absence-chart-point" />{point.count > 0 && <text x={x(index)} y={y(point.count) - 13} className="absence-chart-count" textAnchor="middle">{point.count}</text>}<text x={x(index)} y={height - 27} className="absence-chart-x-label" textAnchor="middle">{point.label}</text></g>)}
      <line x1={area.left} x2={width - area.right} y1={area.top + chartHeight} y2={area.top + chartHeight} className="absence-chart-axis" />
    </svg>
  </div>;
}

function DocumentTable({ rows, onView, staff }) {
  if (!rows.length) return <p className="absence-empty-state">Aucun document récent à afficher.</p>;
  return <div className="absence-table-wrap"><table className="absence-table"><thead><tr><th>{staff ? 'Utilisateur' : 'Document'}</th><th>Catégorie</th><th>Date</th><th>État</th><th aria-label="Action" /></tr></thead><tbody>{rows.map((document) => {
    const owner = document.userName || document.userEmail || 'Utilisateur';
    const documentName = document.originalName || 'Document sans nom';
    return <tr key={document.id || `${documentName}-${document.createdAt}`}><td><div className="absence-student"><span className="absence-avatar">{initials(staff ? owner : documentName)}</span><span>{staff ? owner : documentName}</span></div></td><td>{document.category || 'Non renseignée'}</td><td>{formatDate(document.createdAt)}</td><td><span className={`absence-status ${document.archived ? 'pending' : 'approved'}`}>{document.archived ? 'Archivé' : 'Actif'}</span></td><td><button className="absence-view-button" type="button" onClick={onView} aria-label="Consulter le document"><IconEye /></button></td></tr>;
  })}</tbody></table></div>;
}

export default function DocumentDashboardOverview() {
  const navigate = useNavigate();
  const { user, backendUser, role } = useAuth();
  const [dashboard, setDashboard] = useState({ documents: [], children: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(() => getWeekInputValue(new Date()));
  const [selectedChildId, setSelectedChildId] = useState('');
  const isGlobal = GLOBAL_DOCUMENT_ROLES.includes(role);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!role) return;
      setLoading(true);
      setError('');
      try {
        const next = { documents: [], children: [] };
        if (role === 'parent') {
          const childrenResult = await apiFetch('/users/my-children');
          if (!childrenResult.success) throw new Error(childrenResult.error);
          next.children = childrenResult.children || [];
        } else {
          const result = await getDashboardDocuments();
          if (!result.success) throw new Error(result.error);
          next.documents = result.documents || [];
        }
        if (active) setDashboard(next);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Impossible de charger le tableau de bord des documents.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [role]);

  const activeChildId = selectedChildId || dashboard.children[0]?.uid || dashboard.children[0]?.id || '';
  useEffect(() => {
    let active = true;
    async function loadChildDocuments() {
      if (role !== 'parent') return;
      if (!activeChildId) {
        if (active) setDashboard((current) => ({ ...current, documents: [] }));
        return;
      }
      setLoading(true);
      setError('');
      try {
        const result = await getDashboardDocuments(`?childUid=${encodeURIComponent(activeChildId)}`);
        if (!result.success) throw new Error(result.error);
        if (active) setDashboard((current) => ({ ...current, documents: result.documents || [] }));
      } catch (loadError) {
        if (active) setError(loadError.message || 'Impossible de charger les documents de cet enfant.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadChildDocuments();
    return () => { active = false; };
  }, [activeChildId, role]);

  const selectedChild = useMemo(() => dashboard.children.find((child) => (child.uid || child.id) === activeChildId) || null, [activeChildId, dashboard.children]);
  const weekRange = useMemo(() => getWeekRange(selectedWeek), [selectedWeek]);
  const weeklyDocuments = useMemo(() => dashboard.documents.filter((document) => isInWeek(document, weekRange)), [dashboard.documents, weekRange]);
  const counts = useMemo(() => ({
    total: weeklyDocuments.length,
    active: weeklyDocuments.filter((document) => !document.archived).length,
    archived: weeklyDocuments.filter((document) => document.archived).length,
    uncategorized: weeklyDocuments.filter((document) => !document.category).length,
  }), [weeklyDocuments]);
  const documentTrend = useMemo(() => Array.from({ length: 5 }, (_, index) => {
    const date = new Date(weekRange.start);
    date.setDate(date.getDate() + index);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    return { label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }).replace('.', ''), count: dashboard.documents.filter((document) => { const createdAt = getDate(document.createdAt || document.updatedAt); return createdAt && createdAt >= date && createdAt < nextDate; }).length };
  }), [dashboard.documents, weekRange]);
  const profileName = user?.displayName || backendUser?.displayName || user?.email?.split('@')[0] || 'utilisateur';
  const title = isGlobal ? 'Vue d’ensemble des documents' : role === 'parent' ? 'Documents de mes enfants' : 'Mes documents';
  const firstMetric = role === 'parent'
    ? { label: 'Enfants suivis', value: dashboard.children.length, detail: 'Cette année', icon: IconUsers }
    : { label: 'Total des documents', value: isGlobal ? dashboard.documents.length : counts.total, detail: isGlobal ? 'Tous les documents' : `Semaine du ${formatWeekRange(weekRange)}`, icon: IconInbox };
  const totalDistribution = Math.max(counts.total, 1);
  const activePercent = Math.round((counts.active / totalDistribution) * 100);
  const archivedPercent = Math.round((counts.archived / totalDistribution) * 100);
  const uncategorizedPercent = Math.max(0, 100 - activePercent - archivedPercent);
  const urgentItems = [
    counts.uncategorized > 0 && { title: `${counts.uncategorized} document${counts.uncategorized > 1 ? 's' : ''} sans catégorie`, description: 'Classez-les pour faciliter leur suivi.' },
    counts.archived > 0 && { title: `${counts.archived} document${counts.archived > 1 ? 's' : ''} archivé${counts.archived > 1 ? 's' : ''}`, description: 'Ils restent disponibles dans l’historique.' },
  ].filter(Boolean);

  return <section className="absence-dashboard">
    <header className="absence-dashboard-header"><div><h1>{title}</h1><p>{role === 'parent' && selectedChild ? `Vous consultez le suivi de ${selectedChild.displayName || selectedChild.name || selectedChild.email || 'votre enfant'}.` : `Bienvenue, ${profileName}. Voici ce qui se passe aujourd’hui.`}</p></div><div className="absence-dashboard-actions"><WeekCalendarPicker selectedWeek={selectedWeek} onSelectWeek={setSelectedWeek} /><button className="absence-report-button" type="button" onClick={() => window.print()}>Générer un rapport</button></div></header>
    {loading ? <div className="absence-dashboard-feedback">Chargement du tableau de bord…</div> : error ? <div className="absence-dashboard-feedback is-error"><strong>Impossible de charger les données.</strong><span>{error}</span></div> : <>
      {role === 'parent' && <div className="absence-child-selector"><label htmlFor="document-child-select">Enfant suivi</label><select id="document-child-select" value={activeChildId} onChange={(event) => setSelectedChildId(event.target.value)} disabled={!dashboard.children.length}><option value="">{dashboard.children.length ? 'Choisir un enfant' : 'Aucun enfant associé'}</option>{dashboard.children.map((child) => { const childId = child.uid || child.id; return childId ? <option key={childId} value={childId}>{child.displayName || child.name || child.email || 'Enfant sans nom'}</option> : null; })}</select></div>}
      <div className="absence-metrics-grid"><MetricCard {...firstMetric} /><MetricCard label="Documents générés" value={counts.total} detail={counts.total ? 'Cette semaine' : 'Aucun cette semaine'} icon={IconDocument} /><MetricCard label="Documents actifs" value={counts.active} detail="Disponibles à consulter" icon={IconCheckCircle} /><MetricCard label="Documents archivés" value={counts.archived} detail={counts.archived ? 'Dans l’historique' : 'Aucun document archivé'} icon={IconArchive} emphasis={counts.archived > 0} /></div>
      <div className="absence-dashboard-grid"><div className="absence-dashboard-left"><article className="absence-panel absence-trend-panel"><div className="absence-panel-header"><div><h2>Tendance de génération des documents</h2><p className="absence-panel-description">Semaine du {formatWeekRange(weekRange)}</p></div><button type="button" aria-label="Options"><IconDots /></button></div><DocumentTrend trend={documentTrend} /></article><article className="absence-panel absence-recent-panel"><div className="absence-panel-header"><h2>{isGlobal ? 'Documents générés cette semaine' : 'Documents de la semaine'}</h2><button className="absence-text-button" type="button" onClick={() => navigate('/documents')}>Voir tout</button></div><DocumentTable rows={weeklyDocuments.slice(0, 5)} staff={isGlobal} onView={() => navigate('/documents')} /></article></div><aside className="absence-dashboard-right"><article className="absence-alert-panel"><h2><IconAlertTriangle /> Attention</h2>{urgentItems.length ? urgentItems.map((item) => <div className="absence-alert-item" key={item.title}><strong>{item.title}</strong><span>{item.description}</span></div>) : <p>Aucun document ne nécessite une attention immédiate.</p>}</article><article className="absence-panel absence-distribution-panel"><h2>Répartition des documents</h2><div className="absence-donut-wrap"><div className={`absence-donut ${counts.total === 0 ? 'is-empty' : ''}`} style={{ '--approved': `${activePercent}%`, '--pending': `${activePercent + archivedPercent}%`, '--rejected': `${activePercent + archivedPercent + uncategorizedPercent}%` }}><span>{counts.total}</span></div></div><div className="absence-donut-legend"><span><i className="approved" />Actifs</span><span><i className="pending" />Archivés</span><span><i className="rejected" />Sans catégorie</span></div></article></aside></div>
    </>}
  </section>;
}
