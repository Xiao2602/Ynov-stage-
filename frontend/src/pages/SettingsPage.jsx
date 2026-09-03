import React, { useEffect, useState } from 'react';
import { IconActivity, IconCheckCircle, IconClock, IconSettings, IconUser, IconSun, IconMoon } from '../components/Icons';
import ChangePasswordPage from './ChangePasswordPage';
import ProfilePage from './ProfilePage';
import './SettingsPage.css';

const NOTIFICATIONS_KEY = 'ynov-notification-preferences';
const THEME_KEY = 'ynov-theme-preference';

const defaultNotifications = {
  absence: true,
  documents: true,
  security: true,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('appearance');
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  const [notifications, setNotifications] = useState(() => {
    try {
      return { ...defaultNotifications, ...JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '{}') };
    } catch {
      return defaultNotifications;
    }
  });

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const updateNotification = (key) => {
    setNotifications((current) => {
      const next = { ...current, [key]: !current[key] };
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <section className="settings-page">
      <header className="settings-header">
        <div className="settings-title-icon"><IconSettings /></div>
        <div>
          <h1>Paramètres</h1>
          <p>Gérez votre compte, vos préférences et la sécurité de votre espace.</p>
        </div>
      </header>

      <div className="settings-layout">
        <nav className="settings-tabs" aria-label="Sections des paramètres">
          <button className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')} type="button">
            <IconActivity /> Sécurité
          </button>
          <button className={activeTab === 'notifications' ? 'active' : ''} onClick={() => setActiveTab('notifications')} type="button">
            <IconClock /> Notifications
          </button>
          <button className={activeTab === 'appearance' ? 'active' : ''} onClick={() => setActiveTab('appearance')} type="button">
            <IconSettings /> Apparence
          </button>
        </nav>

        <div className="settings-content">
          {activeTab === 'security' && <ChangePasswordPage />}
          {activeTab === 'notifications' && (
            <div className="settings-panel">
              <h2>Notifications</h2>
              <p className="settings-muted">Choisissez les événements pour lesquels vous souhaitez être informé.</p>
              {[
                ['absence', 'Demandes d\'absence', 'Recevoir les mises à jour concernant vos absences.'],
                ['documents', 'Documents', 'Être informé du traitement de vos documents.'],
                ['security', 'Sécurité du compte', 'Recevoir les alertes importantes liées à votre compte.'],
              ].map(([key, title, description]) => (
                <label className="settings-toggle-row" key={key}>
                  <span><strong>{title}</strong><small>{description}</small></span>
                  <input type="checkbox" checked={notifications[key]} onChange={() => updateNotification(key)} />
                </label>
              ))}
              <div className="settings-feedback"><IconCheckCircle /> Préférences enregistrées automatiquement</div>
            </div>
          )}
          {activeTab === 'appearance' && (
            <div className="settings-appearance">
              <div className="settings-panel">
                <h2>Thème de l'interface</h2>
                <p className="settings-muted">Choisissez l'apparence de votre espace.</p>
                <div className="theme-options">
                  <button 
                    className={`theme-option-box ${theme === 'light' ? 'selected' : ''}`} 
                    onClick={() => setTheme('light')} 
                    type="button" 
                    aria-label="Thème Clair"
                  >
                    <div className="theme-preview-box light-preview">
                      <div className="preview-toolbar" />
                      <div className="preview-columns"><span /><span /></div>
                    </div>
                    <strong>Clair</strong>
                    <small>Interface lumineuse et aérée</small>
                    {theme === 'light' && <div className="theme-check"><IconCheckCircle /></div>}
                  </button>
                  
                  <button 
                    className={`theme-option-box ${theme === 'dark' ? 'selected' : ''}`} 
                    onClick={() => setTheme('dark')} 
                    type="button" 
                    aria-label="Thème Sombre"
                  >
                    <div className="theme-preview-box dark-preview">
                      <div className="preview-toolbar" />
                      <div className="preview-columns"><span /><span /></div>
                    </div>
                    <strong>Sombre</strong>
                    <small>Interface sombre et élégante</small>
                    {theme === 'dark' && <div className="theme-check"><IconCheckCircle /></div>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
