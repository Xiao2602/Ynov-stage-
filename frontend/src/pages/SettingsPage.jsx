import React, { useState } from 'react';
import { IconActivity, IconCheckCircle, IconClock, IconSettings, IconUser } from '../components/Icons';
import ChangePasswordPage from './ChangePasswordPage';
import ProfilePage from './ProfilePage';
import './SettingsPage.css';

const NOTIFICATIONS_KEY = 'ynov-notification-preferences';
const defaultNotifications = { absence: true, documents: true, security: true };

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [notifications, setNotifications] = useState(() => {
    try { return { ...defaultNotifications, ...JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '{}') }; }
    catch { return defaultNotifications; }
  });
  const updateNotification = (key) => setNotifications((current) => {
    const next = { ...current, [key]: !current[key] };
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
    return next;
  });

  return <section className="settings-page">
    <header className="settings-header"><div className="settings-title-icon"><IconSettings /></div><div><h1>Paramètres</h1><p>Gérez votre compte, vos préférences et la sécurité de votre espace.</p></div></header>
    <div className="settings-layout">
      <nav className="settings-tabs" aria-label="Sections des paramètres">
        <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')} type="button"><IconUser /> Profil</button>
        <button className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')} type="button"><IconActivity /> Sécurité</button>
        <button className={activeTab === 'notifications' ? 'active' : ''} onClick={() => setActiveTab('notifications')} type="button"><IconClock /> Notifications</button>
      </nav>
      <div className="settings-content">
        {activeTab === 'profile' && <ProfilePage />}
        {activeTab === 'security' && <ChangePasswordPage />}
        {activeTab === 'notifications' && <div className="settings-panel"><h2>Notifications</h2><p className="settings-muted">Choisissez les événements pour lesquels vous souhaitez être informé.</p>{[
          ['absence', "Demandes d'absence", 'Recevoir les mises à jour concernant vos absences.'],
          ['documents', 'Documents', 'Être informé du traitement de vos documents.'],
          ['security', 'Sécurité du compte', 'Recevoir les alertes importantes liées à votre compte.'],
        ].map(([key, title, description]) => <label className="settings-toggle-row" key={key}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={notifications[key]} onChange={() => updateNotification(key)} /></label>)}<div className="settings-feedback"><IconCheckCircle /> Préférences enregistrées automatiquement</div></div>}
      </div>
    </div>
  </section>;
}
