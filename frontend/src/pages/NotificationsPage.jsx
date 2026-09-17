import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api/api';
import { IconBell, IconCheckCircle, IconAlertTriangle, IconInbox, IconClock, IconCheck, IconTrash } from '../components/Icons';

const formatDate = (timestamp) => {
  if (!timestamp) return 'Date inconnue';
  try {
    if (typeof timestamp === 'object' && timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('fr-FR', {
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
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleDateString('fr-FR', {
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

export default function NotificationsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/notifications/my');
      if (data?.success && Array.isArray(data.notifications)) {
        const sorted = data.notifications.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
        setNotifications(sorted);
      }
    } catch (err) {
      console.error('Erreur chargement notifications :', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      const data = await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      if (data?.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    try {
      const data = await apiFetch('/notifications/read-all', { method: 'POST' });
      if (data?.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (e) {}
  };

  const deleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const data = await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
      if (data?.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (e) {}
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    const type = notif.type || '';
    const relatedId = notif.relatedId || '';

    if (type.includes('document_request') || type.includes('document')) {
      navigate(`/documents/demandes${relatedId ? `?search=${encodeURIComponent(relatedId)}` : ''}`);
    } else if (type.includes('absence')) {
      if (['admin', 'rh', 'manager', 'employee'].includes(role)) {
        navigate('/absences/demandes');
      } else if (role === 'teacher') {
        navigate('/pedagogie/absences');
      } else {
        navigate('/absences/mes-absences');
      }
    } else {
      navigate('/dashboard');
    }
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
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ynov-text-muted)' }}>
              Chargement des notifications...
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ynov-text-muted)' }}>
              <div style={{ width: '40px', height: '40px', margin: '0 auto 12px', opacity: 0.4 }}><IconBell /></div>
              <div style={{ fontWeight: '500' }}>Aucune notification</div>
              <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                {filter === 'unread' ? 'Toutes vos notifications ont été lues.' : 'Vous n\'avez aucune notification.'}
              </p>
            </div>
          ) : (
            displayed.map((notif) => {
              const isUrgent = String(notif.title || '').includes('URGENT');
              const isAbsence = String(notif.type || '').includes('absence');
              const iconColor = isUrgent ? '#ef4444' : isAbsence ? '#f59e0b' : '#0284c7';
              const iconBg = isUrgent ? 'rgba(239, 68, 68, 0.1)' : isAbsence ? 'rgba(245, 158, 11, 0.1)' : 'rgba(2, 132, 199, 0.1)';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    background: notif.read ? 'transparent' : 'var(--bg-card-hover)',
                    transition: 'all 0.15s ease',
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
                    background: iconBg,
                    color: iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    marginTop: '2px',
                  }}>
                    {isUrgent ? <IconAlertTriangle /> : isAbsence ? <IconClock /> : <IconBell />}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontWeight: notif.read ? '500' : '700',
                        fontSize: '0.88rem',
                        color: 'var(--ynov-dark)',
                      }}>
                        {notif.title}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--ynov-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(notif.createdAt)}
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: '600' }}>
                        Accéder à l'action &rarr;
                      </span>
                      <button
                        type="button"
                        onClick={(e) => deleteNotification(notif.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        title="Supprimer"
                      >
                        <IconTrash width={14} height={14} />
                      </button>
                    </div>
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
