import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import {
  IconAlertTriangle, IconCalendar, IconCheckCircle, IconDots, IconEye,
  IconHourglass, IconInbox, IconUsers, IconXCircle,
} from '../components/Icons';
import './AbsenceDashboardOverview.css';

const GLOBAL_STAT_ROLES = ['admin', 'employee'];

function getDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'object' && value.seconds !== undefined) return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = getDate(value);
  return date ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function statusLabel(status) {
  return { approved: 'Approuvée', rejected: 'Refusée', pending: 'En attente', to_justify: 'À justifier' }[status] || 'En attente';
}

function statusClass(status) {
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

function MetricCard({ label, value, detail, icon: Icon, emphasis }) {
  return (
    <article className={`absence-metric-card ${emphasis ? 'is-emphasis' : ''}`}>
      <div className="absence-metric-heading">
        <span>{label}</span>
        <span className="absence-metric-icon"><Icon /></span>
      </div>
      <div className="absence-metric-value">{value}</div>
      {detail && <span className={`absence-metric-detail ${emphasis ? 'is-alert' : ''}`}>{detail}</span>}
    </article>
  );
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
  const [, yearValue, weekValueNumber] = match;
  const januaryFourth = new Date(Number(yearValue), 0, 4);
  const mondayOffset = (januaryFourth.getDay() + 6) % 7;
  const start = new Date(januaryFourth);
  start.setDate(januaryFourth.getDate() - mondayOffset + (Number(weekValueNumber) - 1) * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

function isInWeek(absence, weekRange) {
  const absenceStart = getDate(absence.startDate || absence.date || absence.createdAt);
  const absenceEnd = getDate(absence.endDate) || absenceStart;
  if (!absenceStart || !absenceEnd) return false;
  return Array.from({ length: 5 }, (_, index) => {
    const day = new Date(weekRange.start);
    day.setDate(weekRange.start.getDate() + index);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    return absenceStart < nextDay && absenceEnd >= day;
  }).some(Boolean);
}

function formatWeekRange(weekRange) {
  const start = weekRange.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const end = new Date(weekRange.start);
  end.setDate(end.getDate() + 4);
  return `${start} – ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

function buildAttendanceTrend(absences, weekStart) {
  const dates = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  return dates.map((date) => {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    const absencesCount = absences.filter((absence) => {
      const absenceStart = getDate(absence.startDate || absence.date || absence.createdAt);
      const absenceEnd = getDate(absence.endDate) || absenceStart;
      return absenceStart && absenceEnd && absenceStart < nextDay && absenceEnd >= date;
    }).length;
    return {
      label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }).replace('.', ''),
      absences: absencesCount,
      // L'API ne fournit pas encore le nombre de séances prévues : l'indice visualise donc
      // une baisse de 20 points par absence, sans prétendre être un taux de présence officiel.
      attendance: Math.max(0, 100 - absencesCount * 20),
    };
  });
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

  const selectDay = (date) => {
    onSelectWeek(getWeekInputValue(date));
    setIsOpen(false);
  };

  return <div className="absence-calendar-picker">
    <button className="absence-period-button absence-calendar-button" type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-haspopup="dialog">
      <IconCalendar /><span>{formatWeekRange(selectedRange)}</span>
    </button>
    {isOpen && <div className="absence-calendar-popover" role="dialog" aria-label="Choisir une semaine">
      <div className="absence-calendar-header"><button type="button" onClick={() => setDisplayedMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mois précédent">‹</button><strong>{displayedMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong><button type="button" onClick={() => setDisplayedMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Mois suivant">›</button></div>
      <div className="absence-calendar-weekdays">{['L', 'M', 'M', 'J', 'V'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="absence-calendar-days">{days.map((date) => {
        const isSelectedWeek = date >= selectedRange.start && date < selectedRange.end;
        return <button key={dayKey(date)} type="button" onClick={() => selectDay(date)} className={`${date.getMonth() === displayedMonth.getMonth() ? '' : 'is-outside'} ${isSelectedWeek ? 'is-selected-week' : ''} ${dayKey(date) === today ? 'is-today' : ''}`.trim()}>{date.getDate()}</button>;
      })}</div>
      <p>Cliquez sur un jour pour afficher sa semaine.</p>
    </div>}
  </div>;
}

function LineChart({ trend }) {
  const width = 720;
  const height = 315;
  const area = { left: 57, right: 24, top: 25, bottom: 61 };
  const chartWidth = width - area.left - area.right;
  const chartHeight = height - area.top - area.bottom;
  const x = (index) => area.left + (index * chartWidth) / Math.max(trend.length - 1, 1);
  const y = (value) => area.top + ((100 - value) / 100) * chartHeight;
  const points = trend.map((point, index) => `${x(index)},${y(point.attendance)}`).join(' ');
  const first = trend[0];
  const areaPath = `M ${x(0)},${y(first.attendance)} L ${points} L ${x(trend.length - 1)},${area.top + chartHeight} L ${x(0)},${area.top + chartHeight} Z`;

  return <div className="absence-line-chart">
    <div className="absence-chart-key"><span><i />Présence estimée</span><small>Une baisse indique une ou plusieurs absences.</small></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Évolution de la présence estimée sur les sept derniers jours">
      <defs>
        <linearGradient id="absence-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity=".25" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity=".02" />
        </linearGradient>
      </defs>
      {[100, 75, 50, 25, 0].map((tick) => <g key={tick}>
        <line x1={area.left} x2={width - area.right} y1={y(tick)} y2={y(tick)} className="absence-chart-gridline" />
        <text x={area.left - 12} y={y(tick) + 4} className="absence-chart-y-label" textAnchor="end">{tick}%</text>
      </g>)}
      <path d={areaPath} fill="url(#absence-area)" />
      <polyline points={points} fill="none" className="absence-chart-line" />
      {trend.map((point, index) => <g key={point.label}>
        <title>{`${point.label} : ${point.attendance}% de présence estimée, ${point.absences} absence${point.absences > 1 ? 's' : ''}`}</title>
        <circle cx={x(index)} cy={y(point.attendance)} r="5" className="absence-chart-point" />
        {point.absences > 0 && <text x={x(index)} y={y(point.attendance) - 13} className="absence-chart-count" textAnchor="middle">{point.absences} abs.</text>}
        <text x={x(index)} y={height - 27} className="absence-chart-x-label" textAnchor="middle">{point.label}</text>
      </g>)}
      <line x1={area.left} x2={width - area.right} y1={area.top + chartHeight} y2={area.top + chartHeight} className="absence-chart-axis" />
    </svg>
  </div>;
}

function AbsenceTable({ rows, onView, staff }) {
  if (!rows.length) {
    return <p className="absence-empty-state">Aucune absence récente à afficher.</p>;
  }

  return <div className="absence-table-wrap"><table className="absence-table">
    <thead><tr><th>{staff ? 'Étudiant' : 'Motif'}</th><th>Cours / module</th><th>Date</th><th>Statut</th><th aria-label="Action" /></tr></thead>
    <tbody>{rows.map((absence) => {
      const student = absence.displayName || absence.studentName || absence.userName || absence.userEmail || 'Étudiant';
      const course = absence.course || absence.module || absence.subject || absence.reason || 'Absence déclarée';
      return <tr key={absence.id || `${student}-${absence.startDate}`}>
        <td><div className="absence-student"><span className="absence-avatar">{initials(staff ? student : absence.reason || 'A')}</span><span>{staff ? student : absence.reason || 'Absence déclarée'}</span></div></td>
        <td>{course}</td><td>{formatDate(absence.startDate)}</td>
        <td><span className={`absence-status ${statusClass(absence.status)}`}>{statusLabel(absence.status)}</span></td>
        <td><button className="absence-view-button" type="button" onClick={onView} aria-label="Consulter l'absence"><IconEye /></button></td>
      </tr>;
    })}</tbody>
  </table></div>;
}

export default function AbsenceDashboardOverview() {
  const navigate = useNavigate();
  const { user, backendUser, role } = useAuth();
  const [dashboard, setDashboard] = useState({ absences: [], stats: null, children: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(() => getWeekInputValue(new Date()));
  const [selectedChildId, setSelectedChildId] = useState('');
  const isGlobal = GLOBAL_STAT_ROLES.includes(role);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!role) return;
      setLoading(true);
      setError('');
      try {
        const next = { absences: [], stats: null, children: [] };
        if (isGlobal) {
          const [statsResult, absencesResult] = await Promise.all([apiFetch('/absences/statistics'), apiFetch('/absences')]);
          if (!statsResult.success) throw new Error(statsResult.error);
          next.stats = statsResult.stats;
          next.absences = absencesResult.success ? absencesResult.absences || [] : [];
        } else if (role === 'parent') {
          const [absencesResult, childrenResult] = await Promise.all([apiFetch('/absences/children'), apiFetch('/users/my-children')]);
          if (!absencesResult.success) throw new Error(absencesResult.error);
          next.absences = absencesResult.absences || [];
          next.children = childrenResult.success ? childrenResult.children || [] : [];
        } else if (role === 'teacher') {
          const result = await apiFetch('/absences/my');
          if (!result.success) throw new Error(result.error);
          next.absences = result.absences || [];
        } else if (role === 'student') {
          const result = await apiFetch('/absences/my');
          if (!result.success) throw new Error(result.error);
          next.absences = result.absences || [];
        } else {
          const result = await apiFetch('/absences/pending');
          if (!result.success) throw new Error(result.error);
          next.absences = result.absences || [];
        }
        if (active) setDashboard(next);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Impossible de charger le tableau de bord.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [isGlobal, role]);

  const activeChildId = selectedChildId || dashboard.children[0]?.uid || dashboard.children[0]?.id || '';

  const selectedChild = useMemo(
    () => dashboard.children.find((child) => (child.uid || child.id) === activeChildId) || null,
    [activeChildId, dashboard.children],
  );
  const displayedAbsences = useMemo(() => {
    if (role !== 'parent' || !activeChildId) return role === 'parent' ? [] : dashboard.absences;
    return dashboard.absences.filter((absence) => (absence.userId || absence.uid || absence.studentUid) === activeChildId);
  }, [activeChildId, dashboard.absences, role]);

  const weekRange = useMemo(() => getWeekRange(selectedWeek), [selectedWeek]);
  const weeklyAbsences = useMemo(
    () => displayedAbsences.filter((absence) => isInWeek(absence, weekRange)),
    [displayedAbsences, weekRange],
  );

  const counts = useMemo(() => {
    const absences = weeklyAbsences;
    return {
      total: absences.length,
      pending: absences.filter((item) => item.status === 'pending' || item.status === 'to_justify').length,
      approved: absences.filter((item) => item.status === 'approved').length,
      rejected: absences.filter((item) => item.status === 'rejected').length,
    };
  }, [weeklyAbsences]);

  const profileName = user?.displayName || backendUser?.displayName || user?.email?.split('@')[0] || 'utilisateur';
  const title = isGlobal ? 'Vue d’ensemble' : role === 'parent' ? 'Absences de mes enfants' : 'Mes absences';
  const activeStudents = role === 'parent' ? dashboard.children.length : null;
  const firstMetric = activeStudents !== null
    ? { label: role === 'parent' ? 'Enfants suivis' : 'Étudiants suivis', value: activeStudents, detail: 'Cette année', icon: IconUsers }
    : { label: 'Total des absences', value: counts.total, detail: `Semaine du ${formatWeekRange(weekRange)}`, icon: IconInbox };
  const attendanceTrend = useMemo(() => buildAttendanceTrend(weeklyAbsences, weekRange.start), [weeklyAbsences, weekRange]);
  const totalStatus = Math.max(counts.total, 1);
  const approvedPercent = Math.round((counts.approved / totalStatus) * 100);
  const pendingPercent = Math.round((counts.pending / totalStatus) * 100);
  const rejectedPercent = Math.max(0, 100 - approvedPercent - pendingPercent);
  const urgentItems = [
    counts.pending > 0 && { title: `${counts.pending} absence${counts.pending > 1 ? 's' : ''} à régulariser`, description: 'Une action ou une validation est requise.' },
    counts.rejected > 0 && { title: `${counts.rejected} demande${counts.rejected > 1 ? 's' : ''} refusée${counts.rejected > 1 ? 's' : ''}`, description: 'Consultez les motifs et les justificatifs.' },
  ].filter(Boolean);

  return <section className="absence-dashboard">
    <header className="absence-dashboard-header">
      <div><h1>{title}</h1><p>{role === 'parent' && selectedChild ? `Vous consultez le suivi de ${selectedChild.displayName || selectedChild.name || selectedChild.email || 'votre enfant'}.` : `Bienvenue, ${profileName}. Voici ce qui se passe aujourd’hui.`}</p></div>
      <div className="absence-dashboard-actions"><WeekCalendarPicker selectedWeek={selectedWeek} onSelectWeek={setSelectedWeek} /><button className="absence-report-button" type="button" onClick={() => window.print()}>Générer un rapport</button></div>
    </header>

    {loading ? <div className="absence-dashboard-feedback">Chargement du tableau de bord…</div> : error ? <div className="absence-dashboard-feedback is-error"><strong>Impossible de charger les données.</strong><span>{error}</span></div> : <>
      {role === 'parent' && <div className="absence-child-selector"><label htmlFor="absence-child-select">Enfant suivi</label><select id="absence-child-select" value={activeChildId} onChange={(event) => setSelectedChildId(event.target.value)} disabled={!dashboard.children.length}><option value="">{dashboard.children.length ? 'Choisir un enfant' : 'Aucun enfant associé'}</option>{dashboard.children.map((child) => { const childId = child.uid || child.id; return childId ? <option key={childId} value={childId}>{child.displayName || child.name || child.email || 'Enfant sans nom'}</option> : null; })}</select></div>}
      <div className="absence-metrics-grid">
        <MetricCard {...firstMetric} />
        <MetricCard label="Absences en attente" value={counts.pending} detail={counts.pending ? 'À traiter' : 'Aucune en attente'} icon={IconHourglass} emphasis={counts.pending > 0} />
        <MetricCard label="Absences approuvées" value={counts.approved} detail="Justificatifs validés" icon={IconCheckCircle} />
        <MetricCard label="Absences refusées" value={counts.rejected} detail={counts.rejected ? 'À consulter' : 'Aucune demande refusée'} icon={IconXCircle} />
      </div>

      <div className="absence-dashboard-grid">
        <div className="absence-dashboard-left">
          <article className="absence-panel absence-trend-panel"><div className="absence-panel-header"><div><h2>Tendance de présence</h2><p className="absence-panel-description">Semaine du {formatWeekRange(weekRange)}</p></div><button type="button" aria-label="Options"><IconDots /></button></div><LineChart trend={attendanceTrend} /></article>
          <article className="absence-panel absence-recent-panel"><div className="absence-panel-header"><h2>{isGlobal ? 'Demandes de la semaine' : 'Absences de la semaine'}</h2><button className="absence-text-button" type="button" onClick={() => navigate(isGlobal ? '/absences/demandes' : '/absences/mes-absences')}>Voir tout</button></div><AbsenceTable rows={weeklyAbsences.slice(0, 5)} staff={isGlobal} onView={() => navigate(isGlobal ? '/absences/demandes' : '/absences/mes-absences')} /></article>
        </div>
        <aside className="absence-dashboard-right">
          <article className="absence-alert-panel"><h2><IconAlertTriangle /> Attention</h2>{urgentItems.length ? urgentItems.map((item) => <div className="absence-alert-item" key={item.title}><strong>{item.title}</strong><span>{item.description}</span></div>) : <p>Aucune absence ne nécessite une attention immédiate.</p>}</article>
          <article className="absence-panel absence-distribution-panel"><h2>Répartition des statuts</h2><div className="absence-donut-wrap"><div className={`absence-donut ${counts.total === 0 ? 'is-empty' : ''}`} style={{ '--approved': `${approvedPercent}%`, '--pending': `${approvedPercent + pendingPercent}%`, '--rejected': `${approvedPercent + pendingPercent + rejectedPercent}%` }}><span>{counts.total}</span></div></div><div className="absence-donut-legend"><span><i className="approved" />Approuvées</span><span><i className="pending" />En attente</span><span><i className="rejected" />Refusées</span></div></article>
        </aside>
      </div>
    </>}
  </section>;
}
