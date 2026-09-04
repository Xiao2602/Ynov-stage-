import React, { useState } from 'react';
import { IconBell, IconCheckCircle, IconAlertTriangle, IconInbox, IconClock } from '../components/Icons';

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'info',
    title: 'Nouvelle absence enregistrée',
    message: 'Votre absence du 18/08/2026 a bien été enregistrée et transmise au service pédagogique.',
    date: 'Il y a 2 heures',
    read: false,
  },
  {
    id: 2,
    type: 'success',
    title: 'Demande approuvée',
    message: 'Votre justificatif pour l\'absence du 12/08 a été validé par l\'administration.',
    date: 'Il y a 5 heures',
    read: false,
  },
  {
    id: 3,
    type: 'warning',
    title: 'Document en attente',
    message: 'Un document nécessite votre signature avant le 25/08/2026.',
    date: 'Hier',
    read: true,
  },
  {
    id: 4,
    type: 'info',
    title: 'Mise à jour du planning',
    message: 'Le planning de la semaine du 25/08 a été mis à jour. Consultez vos nouveaux horaires.',
    date: 'Il y a 2 jours',
    read: true,
  },
  {
    id: 5,
    type: 'success',
    title: 'Profil mis à jour',
    message: 'Vos informations personnelles ont été mises à jour avec succès.',
    date: 'Il y a 3 jours',
    read: true,
  },
];

const typeConfig = {
  info: { color: 'var(--ynov-teal)', bg: 'rgba(0, 180, 216, 0.1)', Icon: IconBell },
  success: { color: '#059669', bg: 'rgba(5, 150, 105, 0.1)', Icon: IconCheckCircle },
  warning: { color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)', Icon: IconAlertTriangle },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayed = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <div className="dashboard-scroll-area" style={{ height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="overview-title">Notifications</h2>
          <p className="overview-subtitle">
            Restez informé des mises à jour et actions importantes.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            className="btn-outline"
            onClick={markAllAsRead}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <div style={{ width: '16px', height: '16px' }}><IconCheckCircle /></div>
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total</span>
            <div className="stat-icon-wrapper">
              <IconBell />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{notifications.length}</span>
          </div>
          <div className="stat-subtitle" style={{ color: 'var(--ynov-text-muted)', fontWeight: '400' }}>
            Notifications
          </div>
        </div>

        <div className={`stat-card ${unreadCount > 0 ? 'highlight' : ''}`}>
          <div className="stat-header">
            <span className="stat-title">Non lues</span>
            <div className="stat-icon-wrapper" style={{ color: 'var(--status-pending)' }}>
              <IconClock />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{unreadCount}</span>
          </div>
          <div className="stat-subtitle" style={{ color: unreadCount > 0 ? 'var(--status-pending)' : 'var(--ynov-text-muted)', fontWeight: '400' }}>
            {unreadCount > 0 ? 'À consulter' : 'Aucune'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Lues</span>
            <div className="stat-icon-wrapper" style={{ color: 'var(--status-approved)' }}>
              <IconCheckCircle />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{notifications.filter(n => n.read).length}</span>
          </div>
          <div className="stat-subtitle" style={{ color: 'var(--status-approved)', fontWeight: '400' }}>
            Consultées
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="panel-title">
            <div style={{ width: '18px', height: '18px', display: 'inline-flex' }}><IconInbox /></div>
            Toutes les notifications
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: filter === 'all' ? 'var(--ynov-teal)' : 'var(--bg-card)',
                color: filter === 'all' ? '#fff' : 'var(--ynov-text-main)',
                fontSize: '0.8rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Toutes ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: filter === 'unread' ? 'var(--ynov-teal)' : 'var(--bg-card)',
                color: filter === 'unread' ? '#fff' : 'var(--ynov-text-main)',
                fontSize: '0.8rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Non lues ({unreadCount})
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {displayed.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ynov-text-muted)' }}>
              <div style={{ width: '40px', height: '40px', margin: '0 auto 12px', opacity: 0.4 }}><IconBell /></div>
              <div style={{ fontWeight: '500' }}>Aucune notification</div>
              <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                {filter === 'unread' ? 'Toutes vos notifications ont été lues.' : 'Vous n\'avez aucune notification.'}
              </p>
            </div>
          ) : (
            displayed.map((notif) => {
              const config = typeConfig[notif.type] || typeConfig.info;
              const { Icon } = config;
              return (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    background: notif.read ? 'transparent' : 'var(--bg-card-hover)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseOut={(e) => e.currentTarget.style.background = notif.read ? 'transparent' : 'var(--bg-card-hover)'}
                >
                  {/* Icon */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    borderRadius: '10px',
                    background: config.bg,
                    color: config.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    marginTop: '2px',
                  }}>
                    <Icon />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontWeight: notif.read ? '500' : '600',
                        fontSize: '0.88rem',
                        color: 'var(--ynov-dark)',
                      }}>
                        {notif.title}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--ynov-text-muted)', whiteSpace: 'nowrap' }}>
                        {notif.date}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '0.82rem',
                      color: 'var(--ynov-text-muted)',
                      marginTop: '4px',
                      lineHeight: '1.4',
                    }}>
                      {notif.message}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notif.read && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      minWidth: '8px',
                      borderRadius: '50%',
                      background: 'var(--ynov-teal)',
                      marginTop: '8px',
                    }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
