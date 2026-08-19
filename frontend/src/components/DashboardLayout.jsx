import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import ynovLogo from '../assets/ynov-logo.png';
import './DashboardLayout.css';

const PROFILE_IMAGE_KEY = 'ynov-profile-photo';
import { 
  IconDashboard, 
  IconUsers, 
  IconInbox, 
  IconBarChart, 
  IconActivity, 
  IconSettings, 
  IconCalendar, 
  IconFolder, 
  IconClock,
  IconUser, 
  IconLogOut, 
  IconDots,
  IconBell,
  IconShieldAlert
} from './Icons';

export default function DashboardLayout() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem(PROFILE_IMAGE_KEY) || '');
  const profileMenuRef = useRef(null);
  const { user, backendUser, role, logout } = useAuth();
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
  parent: 'Parent',
};

const staffRoles = ['admin', 'rh', 'manager', 'employee'];
const absenceRoles = {
  dashboard: ['admin', 'student', 'teacher', 'parent', ...staffRoles],
  myAbsences: ['admin', 'student', 'teacher', 'parent'],
  requests: ['admin', 'student', 'teacher', ...staffRoles],
  stats: ['admin', ...staffRoles],
};
const documentRoles = {
  dashboard: ['admin', 'student', 'parent', ...staffRoles],
  myDocuments: ['admin', 'student', 'parent', ...staffRoles],
  requests: ['admin', 'student', 'parent', ...staffRoles],
};

function normalizeDepartment(value = '') {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
}

const isAdministrativeStaff = role === 'employee'
  && ['administratif', 'administrative', 'administration'].includes(normalizeDepartment(backendUser?.department));

function canAccess(allowedRoles, role) {
  return allowedRoles.includes(role);
}

const childCount = Array.isArray(backendUser?.children)
  ? backendUser.children.length
  : 0;

const parentAbsenceLabel = childCount === 1
  ? 'Absence de mon enfant'
  : 'Absences de mes enfants';

const parentDocumentsLabel = childCount === 1
  ? 'Documents de mon enfant'
  : 'Documents de mes enfants';

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

  useEffect(() => {
    const updateProfileImage = () => {
      setProfileImage(localStorage.getItem(PROFILE_IMAGE_KEY) || '');
    };

    window.addEventListener('profile-photo-updated', updateProfileImage);
    window.addEventListener('storage', updateProfileImage);

    return () => {
      window.removeEventListener('profile-photo-updated', updateProfileImage);
      window.removeEventListener('storage', updateProfileImage);
    };
  }, []);

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
          <img src={ynovLogo} alt="Ynov Campus" className="sidebar-logo" />
        </div>

        <nav className="sidebar-nav">
          {/* GROUPE 1 : ABSENCES */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">Absences</div>
            <div className="sidebar-group-items">
              {canAccess(absenceRoles.dashboard, role) && <NavLink to="/dashboard" end className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}>
                <div className="nav-icon"><IconDashboard /></div><span>Dashboard</span>
              </NavLink>}
              {canAccess(absenceRoles.myAbsences, role) && <NavLink to="/absences/mes-absences" className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}>
                <div className="nav-icon"><IconCalendar /></div><span>{role === 'parent' ? parentAbsenceLabel : role === 'teacher' ? 'Mes absences déclarées' : 'Mes Absences'}</span>
              </NavLink>}
              {canAccess(absenceRoles.requests, role) && <NavLink to="/absences/demandes" className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}>
                <div className="nav-icon"><IconInbox /></div><span>{staffRoles.includes(role) ? 'Absences à traiter' : 'Demandes'}</span>
              </NavLink>}
              {canAccess(absenceRoles.stats, role) && <NavLink to="/absences/stats" className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}>
                <div className="nav-icon"><IconBarChart /></div><span>Analyses / Stats</span>
              </NavLink>}
            </div>
          </div>

          {/* GROUPE 2 : DOCUMENTS OU ESPACE PEDAGOGIQUE */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">{role === 'teacher' ? 'Espace pédagogique' : 'Gestion Documentaire'}</div>
            <div className="sidebar-group-items">
              {role === 'teacher' ? (
                <>
                  <NavLink to="/pedagogie/eleves" className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}>
                    <div className="nav-icon"><IconUsers /></div><span>Mes élèves</span>
                  </NavLink>
                  <NavLink to="/pedagogie/planning" className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}>
                    <div className="nav-icon"><IconClock /></div><span>Mon planning</span>
                  </NavLink>
                  <NavLink to="/pedagogie/appel" className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}>
                    <div className="nav-icon"><IconCalendar /></div><span>Appel</span>
                  </NavLink>
                </>
              ) : (
                <>
                  {canAccess(documentRoles.dashboard, role) && <NavLink to="/documents/dashboard" className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}>
                    <div className="nav-icon"><IconDashboard /></div><span>Dashboard</span>
                  </NavLink>}
                  {canAccess(documentRoles.myDocuments, role) && <NavLink to="/documents" end className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}>
                    <div className="nav-icon"><IconFolder /></div><span>{role === 'parent' ? parentDocumentsLabel : staffRoles.includes(role) ? 'Documents à gérer' : 'Mes Documents'}</span>
                  </NavLink>}
                  {isAdministrativeStaff ? (
                    <NavLink to="/documents/traitement" className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}>
                      <div className="nav-icon"><IconInbox /></div><span>Demandes à traiter</span>
                    </NavLink>
                  ) : canAccess(documentRoles.requests, role) && (
                    <NavLink to="/documents/demandes" className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}>
                      <div className="nav-icon"><IconInbox /></div><span>Demandes</span>
                    </NavLink>
                  )}
                </>
              )}
            </div>
          </div>

          {/* GROUPE 3 : NOTIFICATIONS */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">Notifications</div>
            <div className="sidebar-group-items">
              <NavLink to="/notifications" className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}>
                <div className="nav-icon"><IconBell /></div><span>Notifications</span>
              </NavLink>
            </div>
          </div>

          {/* GROUPE 4 : CONFIGURATIONS */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">Configurations</div>
            <div className="sidebar-group-items">
              {role === 'admin' && <NavLink to="/users" className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}>
                <div className="nav-icon"><IconUsers /></div><span>Utilisateurs</span>
              </NavLink>}
              {role === 'admin' && (
                <NavLink 
                  to="/activity-logs" 
                  className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
                >
                  <div className="nav-icon"><IconActivity /></div>
                  <span>Activity Logs</span>
                </NavLink>
              )}
              {role === 'admin' && (
                <NavLink 
                  to="/profile-requests" 
                  className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
                >
                  <div className="nav-icon"><IconUser /></div>
                  <span>Demandes de profil</span>
                </NavLink>
              )}
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
              {profileImage ? (
                <img src={profileImage} alt={userName} className="sidebar-user-avatar-image" />
              ) : (
                userInitials
              )}
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