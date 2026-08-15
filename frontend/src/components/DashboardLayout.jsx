import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import ynovLogo from '../assets/ynov-logo.png';
import './DashboardLayout.css';
import { 
  IconDashboard, 
  IconUsers, 
  IconInbox, 
  IconBarChart, 
  IconActivity, 
  IconSettings, 
  IconCalendar, 
  IconFolder, 
  IconUser, 
  IconLogOut, 
  IconDots 
} from './Icons';

export default function DashboardLayout() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

const getInitials = (email) => {
  if (!email) return '?';

  const name = email.split('@')[0];

  const parts = name
    .split(/[._-]/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return name.substring(0, 2).toUpperCase();
};

const userEmail = user?.email || '';
const userName = user?.displayName || userEmail.split('@')[0];
const userInitials = getInitials(userEmail);

const roleLabels = {
  admin: 'Administrateur',
  rh: 'Ressources humaines',
  manager: 'Manager',
  employee: 'Personnel',
  student: 'Étudiant',
  teacher: 'Professeur',
};

const currentUser = {
  name: userName,
  email: userEmail,
  role: roleLabels[role] || role || 'Utilisateur',
  initials: userInitials,
};

  // Fermer le menu profil si on clique à l'extérieur
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      user.getIdToken().then((token) => {
        console.log('Token Firebase disponible :', !!token);
        console.log('TOKEN:', token);
      });
    }
  }, [user]); 

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion :', error);
    }
  };

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo-container">
          <img src={ynovLogo} alt="Ynov Campus" className="sidebar-logo" style={{ filter: 'brightness(0)' }} />
        </div>

        <nav className="sidebar-nav">
          {/* GROUPE 1 : ABSENCES */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">Absences</div>
            <div className="sidebar-group-items">
              <NavLink 
                to="/dashboard" 
                end 
                className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
              >
                <div className="nav-icon"><IconDashboard /></div>
                <span>Dashboard</span>
              </NavLink>
              <NavLink 
                to="/absences/mes-absences" 
                className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
              >
                <div className="nav-icon"><IconCalendar /></div>
                <span>Mes Absences</span>
              </NavLink>
              <NavLink 
                to="/absences/demandes" 
                className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
              >
                <div className="nav-icon"><IconInbox /></div>
                <span>Demandes</span>
              </NavLink>
              <NavLink 
                to="/absences/stats" 
                className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
              >
                <div className="nav-icon"><IconBarChart /></div>
                <span>Analyses / Stats</span>
              </NavLink>
            </div>
          </div>

          {/* GROUPE 2 : GESTION DOCUMENTAIRE */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">Gestion Documentaire</div>
            <div className="sidebar-group-items">
              <NavLink 
                to="/documents/dashboard" 
                className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
              >
                <div className="nav-icon"><IconDashboard /></div>
                <span>Dashboard</span>
              </NavLink>
              <NavLink 
                to="/documents" 
                end 
                className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
              >
                <div className="nav-icon"><IconFolder /></div>
                <span>Mes Documents</span>
              </NavLink>
              <NavLink 
                to="/documents/demandes" 
                className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
              >
                <div className="nav-icon"><IconInbox /></div>
                <span>Demandes</span>
              </NavLink>
            </div>
          </div>

          {/* GROUPE 3 : CONFIGURATIONS */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">Configurations</div>
            <div className="sidebar-group-items">
              <NavLink 
                to="/users" 
                className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
              >
                <div className="nav-icon"><IconUsers /></div>
                <span>Utilisateurs</span>
              </NavLink>
              <NavLink 
                to="/activity-logs" 
                className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
              >
                <div className="nav-icon"><IconActivity /></div>
                <span>Activity Logs</span>
              </NavLink>
              <NavLink 
                to="/settings" 
                className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
              >
                <div className="nav-icon"><IconSettings /></div>
                <span>Paramètres</span>
              </NavLink>
            </div>
          </div>
        </nav>

        {/* PROFIL UTILISATEUR DANS LE FOOTER DE LA SIDEBAR */}
        <div className="sidebar-footer" ref={profileMenuRef}>
          {/* MENU DÉROULANT AU CLIC */}
          {isProfileMenuOpen && (
            <div className="profile-dropdown-menu">
              <div className="profile-dropdown-header">
                <span className="dropdown-user-name">{userName}</span>
                <span className="dropdown-user-email">{userEmail}</span>
              </div>
              <div className="profile-dropdown-divider"></div>
              <button 
                className="profile-dropdown-item" 
                onClick={() => { setIsProfileMenuOpen(false); navigate('/settings'); }}
              >
                <div className="dropdown-item-icon"><IconUser /></div>
                <span>Mon Profil</span>
              </button>
              <button 
                className="profile-dropdown-item logout" 
                onClick={handleLogout}
              >
                <div className="dropdown-item-icon"><IconLogOut /></div>
                <span>Déconnexion</span>
              </button>
            </div>
          )}

          {/* CARTE UTILISATEUR CLIQUABLE */}
          <div 
            className={`sidebar-user-card ${isProfileMenuOpen ? 'open' : ''}`}
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            role="button"
            tabIndex={0}
          >
            <div className="sidebar-user-avatar">
              {userInitials}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{userName}</div>
              <div className="sidebar-user-role">{currentUser.role}</div>
            </div>
            <div className="sidebar-user-action">
              <IconDots />
            </div>
          </div>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL SANS HEADER */}
      <main className="main-content">
        <Outlet context={{ dashboardMode: location.pathname.startsWith('/documents') ? 'documents' : 'absences' }} />
      </main>
    </div>
  );
}