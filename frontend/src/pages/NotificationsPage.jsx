import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/api';
import { IconBell, IconCheckCircle, IconAlertTriangle, IconInbox, IconClock, IconRefreshCw, IconTrash } from '../components/Icons';

const formatNotificationDate = (timestamp) => {
  if (!timestamp) return 'Date inconnue';
  try {
    if (typeof timestamp === 'object' && timestamp._seconds !== undefined) {
      return new Date(timestamp._seconds * 1000).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    if (typeof timestamp === 'object' && timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return 'Date inconnue';
  } catch {
    return 'Date inconnue';
  }
};

const typeConfig = {
  info: { color: 'var(--ynov-teal)', bg: 'rgba(0, 180, 216, 0.1)', Icon: IconBell },
  success: { color: '#059669', bg: 'rgba(5, 150, 105, 0.1)', Icon: IconCheckCircle },
  warning: { color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)', Icon: IconAlertTriangle },
  danger: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', Icon: IconAlertTriangle },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/notifications/my');
      if (data && data.success) {
        const sorted = (data.notifications || []).sort((a, b) => {
          const dateA = a.createdAt?._seconds || a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
          const dateB = b.createdAt?._seconds || b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
          return dateB - dateA;
        });
        setNotifications(sorted);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
      setError(err.message || 'Impossible de récupérer les notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const handleSync = () => {
      fetchNotifications();
    };

    window.addEventListener('notifications-updated', handleSync);
    return () => {
      window.removeEventListener('notifications-updated', handleSync);
    };
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      const data = await apiFetch(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (data && data.success) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        window.dispatchEvent(new Event('notifications-updated'));
      }
    } catch (err) {
      console.error('Erreur marquage lu:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const data = await apiFetch('/notifications/read-all', {
        method: 'POST',
      });
      if (data && data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        window.dispatchEvent(new Event('notifications-updated'));
      }
    } catch (err) {
      console.error('Erreur marquage tout lu:', err);
    }
  };

  const deleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const data = await apiFetch(`/notifications/${id}`, {
        method: 'DELETE',
      });
      if (data && data.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        window.dispatchEvent(new Event('notifications-updated'));
      }
    } catch (err) {
      console.error('Erreur suppression notification:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;
  const displayed = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <div className="dashboard-scroll-area" style={{ height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="overview-title">Notifications</h2>
          <p className="overview-subtitle">
            Restez informé des mises à jour et actions importantes en temps réel.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-outline"
            onClick={fetchNotifications}
            title="Actualiser"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <div style={{ width: '16px', height: '16px' }}><IconRefreshCw /></div>
            Actualiser
          </button>
          {unreadCount > 0 && (
            <button
              className="btn-primary"
              onClick={markAllAsRead}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <div style={{ width: '16px', height: '16px' }}><IconCheckCircle /></div>
              Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#ef4444',
          marginBottom: '20px',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

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
            Notifications reçues
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
            {unreadCount > 0 ? 'À consulter' : 'Toutes lues'}
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
            <span className="stat-value">{readCount}</span>
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
          {loading && notifications.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ynov-text-muted)' }}>
              Chargement de vos notifications...
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ynov-text-muted)' }}>
              <div style={{ width: '40px', height: '40px', margin: '0 auto 12px', opacity: 0.4 }}><IconBell /></div>
              <div style={{ fontWeight: '500' }}>Aucune notification</div>
              <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                {filter === 'unread' ? 'Toutes vos notifications ont été lues.' : 'Vous n\'avez aucune notification pour le moment.'}
              </p>
            </div>
          ) : (
            displayed.map((notif) => {
              const config = typeConfig[notif.type] || typeConfig.info;
              const { Icon } = config;
              return (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: notif.read ? 'default' : 'pointer',
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
                        {formatNotificationDate(notif.createdAt)}
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

                  {/* Actions & Unread dot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!notif.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--ynov-teal)',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Marquer comme lu"
                      >
                        <div style={{ width: '16px', height: '16px' }}><IconCheckCircle /></div>
                      </button>
                    )}
                    <button
                      onClick={(e) => deleteNotification(notif.id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--ynov-text-muted)',
                        padding: '4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Supprimer"
                    >
                      <div style={{ width: '16px', height: '16px' }}><IconTrash /></div>
                    </button>
                    {!notif.read && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        minWidth: '8px',
                        borderRadius: '50%',
                        background: 'var(--ynov-teal)',
                      }} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
