import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api/api';
import { IconBell, IconX, IconCheck, IconTrash } from '../components/Icons';
import '../components/Icons';

// Fonction de formatage de date
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

export default function NotificationsDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/notifications/my');
      if (data.success) {
        const sorted = data.notifications.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
        setNotifications(sorted);
        const unread = sorted.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id) => {
    try {
      const data = await apiFetch(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (data.success) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === id ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erreur marquage lu:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const data = await apiFetch('/notifications/read-all', {
        method: 'POST',
      });
      if (data.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Erreur marquage tout lu:', error);
    }
  };

  // 🔥 NOUVEAU : Supprimer une notification
  const deleteNotification = async (id) => {
    try {
      const data = await apiFetch(`/notifications/${id}`, {
        method: 'DELETE',
      });
      if (data.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        // Recalculer les non-lues
        const unread = notifications.filter(n => n.id !== id && !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Erreur suppression notification:', error);
    }
  };

  // 🔥 NOUVEAU : Supprimer toutes les notifications lues
  const deleteReadNotifications = async () => {
    try {
      const data = await apiFetch('/notifications/read', {
        method: 'DELETE',
      });
      if (data.success) {
        setNotifications(prev => prev.filter(n => !n.read));
        // Les non-lues restent, donc le compteur ne change pas
      }
    } catch (error) {
      console.error('Erreur suppression notifications lues:', error);
    }
  };

  // Fermer le dropdown si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasReadNotifications = notifications.some(n => n.read);

  return (
    <div className="notifications-dropdown-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className={`notification-bell ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ width: '24px', height: '24px', color: '#1e293b' }}>
          <IconBell />
        </div>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              background: '#ef4444',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: '0',
            width: '420px',
            maxHeight: '450px',
            overflowY: 'auto',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
          }}
        >
          {/* En-tête avec actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
              Notifications {unreadCount > 0 && `(${unreadCount} non lues)`}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#23b2a4',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Tout lire
                </button>
              )}
              {hasReadNotifications && (
                <button
                  onClick={deleteReadNotifications}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Supprimer lues
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
              Chargement...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
              <p>Aucune notification</p>
            </div>
          ) : (
            <div>
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    background: notif.read ? 'white' : '#f0fdf4',
                    transition: 'background 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: notif.read ? '400' : '600', fontSize: '0.85rem', color: '#0f172a' }}>
                      {notif.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                      {notif.message}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                      {formatDate(notif.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    {!notif.read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#23b2a4',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        title="Marquer comme lu"
                      >
                        <IconCheck width={16} height={16} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                      title="Supprimer"
                    >
                      <IconTrash width={16} height={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}