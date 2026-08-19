import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  IconGraduationCap, 
  IconFolder, 
  IconHourglass, 
  IconFileCheck, 
  IconDots, 
  IconCalendar, 
  IconAlertTriangle,
  IconEye
} from '../components/Icons';

export default function DashboardOverview() {
  const { dashboardMode } = useOutletContext();

  // Configuration dynamique selon le mode choisi
  const config = {
    documents: {
      title: "Ynov Document Manager",
      stats: [
        { label: "Total Students", value: "3,492", trend: "+4%", icon: <IconGraduationCap />, isHighlight: false },
        { label: "Total Documents", value: "12,845", trend: "+12%", icon: <IconFolder />, isHighlight: false },
        { label: "Pending Requests", value: "142", subtitle: "Requires Action", icon: <IconHourglass />, isHighlight: true },
        { label: "Docs Generated Today", value: "87", icon: <IconFileCheck />, isHighlight: false }
      ],
      chartTitle: "Document Generation Trends",
      recentTitle: "Recent Requests",
      tableHeaders: ["Student", "Document Type", "Date", "Status", "Action"],
      tableData: [
        { initials: "JD", name: "Jane Doe", type: "Enrollment Certificate", date: "Oct 24, 2023", status: "pending" },
        { initials: "AS", name: "Alex Smith", type: "Grade Transcript", date: "Oct 24, 2023", status: "approved" },
        { initials: "MB", name: "Marc Blanc", type: "School Certificate", date: "Oct 23, 2023", status: "approved" }
      ]
    },
    absences: {
      title: "Ynov Leave Manager",
      stats: [
        { label: "Active Students", value: "3,492", trend: "Stable", icon: <IconGraduationCap />, isHighlight: false },
        { label: "Total Absences (Hrs)", value: "1,204", trend: "-5%", icon: <IconFolder />, isHighlight: false },
        { label: "Pending Justifications", value: "38", subtitle: "Requires Review", icon: <IconHourglass />, isHighlight: true },
        { label: "Leaves Logged Today", value: "12", icon: <IconFileCheck />, isHighlight: false }
      ],
      chartTitle: "Absence Frequency Trends",
      recentTitle: "Recent Leave Logs",
      tableHeaders: ["Student", "Course / Module", "Date", "Status", "Action"],
      tableData: [
        { initials: "LM", name: "Lucas Martin", type: "Architecture Web", date: "Oct 24, 2023", status: "pending" },
        { initials: "SB", name: "Sarah Bernard", type: "C# Development", date: "Oct 23, 2023", status: "approved" },
        { initials: "ER", name: "Emma Richard", type: "Database Security", date: "Oct 22, 2023", status: "approved" }
      ]
    }
  };

  const currentView = config[dashboardMode];

  return (
    <div className="dashboard-scroll-area" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="overview-title">Vue d'ensemble</h2>
          <p className="overview-subtitle">Bienvenue, Alexandre. Voici ce qui se passe aujourd'hui.</p>
        </div>

        <div className="overview-actions" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px' }}><IconCalendar /></div> Cette semaine
          </button>
          <button className="btn-primary" style={{ width: 'auto' }}>
            Générer un rapport
          </button>
        </div>
      </div>

      {/* BLOCS DE STATISTIQUES */}
      <div className="stats-grid">
        {currentView.stats.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.isHighlight ? 'highlight' : ''}`}>
            <div className="stat-header">
              <span className="stat-title">{stat.label}</span>
              <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', color: stat.isHighlight ? 'var(--ynov-teal)' : 'var(--ynov-gray-500)' }}>
                {stat.icon}
              </div>
            </div>
            <div>
              <div className="stat-value-container">
                <span className="stat-value">{stat.value}</span>
                {stat.trend && <span className="stat-trend up">{stat.trend}</span>}
              </div>
              {stat.subtitle && <div className="stat-subtitle">{stat.subtitle}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* GRILLES DU DASHBOARD */}
      <div className="content-grid">
        <div className="left-col">
          {/* PANNEAU DE TENDANCE (GRAPHIQUE) */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">{currentView.chartTitle}</h3>
              <button className="action-dots" aria-label="Plus d'options" style={{ width: '20px', height: '20px', color: 'var(--ynov-gray-400)' }}>
                <IconDots />
              </button>
            </div>
            <div className="chart-placeholder">
              <svg className="chart-svg" viewBox="0 0 500 150" preserveAspectRatio="none">
                <path
                  d="M 0,100 Q 125,20 250,70 T 500,30"
                  fill="none"
                  stroke="var(--ynov-teal)"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
          </div>

          {/* TABLEAU DES DEMANDES RÉCENTES */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">{currentView.recentTitle}</h3>
              <button className="btn-outline" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>View All</button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  {currentView.tableHeaders.map((th, i) => <th key={i}>{th}</th>)}
                </tr>
              </thead>
              <tbody>
                {currentView.tableData.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <div className="user-cell">
                        <div className="mini-avatar">{row.initials}</div>
                        {row.name}
                      </div>
                    </td>
                    <td>{row.type}</td>
                    <td>{row.date}</td>
                    <td>
                      <span className={`status-badge ${row.status}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <button className="table-action-btn" title="Consulter" style={{ width: '18px', height: '18px' }}>
                        <IconEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLONNE DROITE : ALERTES & DISTRIBUTION */}
        <div className="right-col">
          <div className="panel urgent">
            <div className="panel-header" style={{ marginBottom: '14px' }}>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '18px', height: '18px' }}><IconAlertTriangle /></div> Urgent Attention
              </h3>
            </div>
            <div className="alert-item">
              <div className="alert-title">
                {dashboardMode === 'documents' ? 'Missing Signatures (12)' : 'Unjustified Absences > 48h (8)'}
              </div>
              <div className="alert-desc">
                {dashboardMode === 'documents' ? 'Required for final year transcripts.' : 'Requires immediate academic review.'}
              </div>
            </div>
            <div className="alert-item">
              <div className="alert-title">
                {dashboardMode === 'documents' ? 'Overdue Approvals (5)' : 'Pending Medical Certs (3)'}
              </div>
              <div className="alert-desc">Requests pending &gt; 48 hours.</div>
            </div>
          </div>

          <div className="panel">
            <h3 className="panel-title" style={{ marginBottom: '20px' }}>
              {dashboardMode === 'documents' ? 'Request Status Distribution' : 'Absence Status Distribution'}
            </h3>
            <div className="donut-chart-container">
              <div className="donut"></div>
            </div>
            <div className="chart-legend">
              <div className="legend-item"><span className="dot-approved"></span> Approved</div>
              <div className="legend-item"><span className="dot-pending"></span> Pending</div>
              <div className="legend-item"><span className="dot-urgent"></span> Rejected</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
