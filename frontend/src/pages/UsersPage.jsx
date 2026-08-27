import React, { useEffect, useMemo, useState } from 'react';
import {
  IconUsers,
  IconSearch,
  IconPlus,
  IconDots,
  IconEye,
  IconX,
  IconCheckCircle,
  IconAlertTriangle
} from '../components/Icons';
import { apiFetch } from '../services/api';
import '../components/DashboardLayout.css';

// ============================================================
// CONFIGURATION DES RÔLES
// ============================================================

const roleOptions = [
  { key: 'admin', label: 'Administrateur', description: 'Administration complète' },
  { key: 'rh', label: 'Ressources humaines', description: 'Gestion du personnel' },
  { key: 'manager', label: 'Manager', description: 'Gestion équipe' },
  { key: 'employee', label: 'Personnel', description: 'Accès utilisateur standard' },
  { key: 'student', label: 'Étudiant', description: 'Accès étudiant' },
  { key: 'teacher', label: 'Professeur', description: 'Enseignement' },
];

const classOptions = [
  'Bachelor 1',
  'Bachelor 2',
  'Bachelor 3 - Cybersécurité',
  'Bachelor 3 - Intelligence Artificielle',
  'Bachelor 3 - Génie Logiciel',
  'Master 1 - Cybersécurité',
  'Master 1 - Intelligence Artificielle',
  'Master 1 - Génie Logiciel',
  'Master 2 - Cybersécurité',
  'Master 2 - Intelligence Artificielle',
  'Master 2 - Génie Logiciel',
];

const serviceOptions = [
  'Direction', 'Ressources humaines', 'Finance', 'Admissions', 'Pédagogie', 'Campus'
];

// ============================================================
// OUTILS
// ============================================================

function getRoleLabel(role) {
  const option = roleOptions.find((item) => item.key === role);
  return option ? option.label : role || 'Non défini';
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(date);
}

// ============================================================
// COMPOSANT
// ============================================================

export default function UsersPage() {
  // ----------------------------------------------------------
  // UTILISATEURS
  // ----------------------------------------------------------

  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');

  // ----------------------------------------------------------
  // RECHERCHE / FILTRE
  // ----------------------------------------------------------

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // ----------------------------------------------------------
  // MODAL DE CRÉATION
  // ----------------------------------------------------------

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [selectedRole, setSelectedRole] = useState('employee');

  // ----------------------------------------------------------
  // FORMULAIRE
  // ----------------------------------------------------------

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'employee',
    service: 'Direction',
    department: '',
    className: '',
    assignedClass: '',
  });

  // ----------------------------------------------------------
  // ENFANTS (pour parent)
  // ----------------------------------------------------------

  const [children, setChildren] = useState([
    { id: Date.now(), name: '', className: '' },
  ]);

  // ----------------------------------------------------------
  // MODAL D'ASSIGNATION DE CLASSE (pour professeurs)
  // ----------------------------------------------------------

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);


  // Ajoute ces états après les autres useState
const [showEditModal, setShowEditModal] = useState(false);
const [editingUser, setEditingUser] = useState(null);
const [editFormData, setEditFormData] = useState({});
const [isEditing, setIsEditing] = useState(false);

const openEditModal = (user) => {
  setEditingUser(user);
  setEditFormData({
    displayName: user.displayName || '',
    email: user.email || '',
    phone: user.phone || '',
    department: user.department || '',
    className: user.className || '',
    assignedClasses: user.assignedClasses || [],
  });
  setShowEditModal(true);
};

const closeEditModal = () => {
  setShowEditModal(false);
  setEditingUser(null);
  setEditFormData({});
  setIsEditing(false);
};

  // ==========================================================
  // CHARGEMENT DES UTILISATEURS
  // ==========================================================

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setUsersError('');
      const result = await apiFetch('/api/users');
      if (!result?.success) {
        throw new Error(result?.error || 'Impossible de récupérer les utilisateurs.');
      }
      setUsers(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error('Erreur chargement utilisateurs :', error);
      setUsersError(error?.message || 'Impossible de récupérer les utilisateurs.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // ==========================================================
  // UTILISATEURS FILTRÉS
  // ==========================================================

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      if (!matchesRole) return false;
      if (!normalizedSearch) return true;
      const searchableText = [
        user.displayName, user.email, user.department,
        user.className, user.assignedClass, user.role
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableText.includes(normalizedSearch);
    });
  }, [users, roleFilter, searchTerm]);

  // ==========================================================
  // STATISTIQUES
  // ==========================================================

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.disabled !== true).length;
  const inactiveUsers = users.filter((user) => user.disabled === true).length;

  const [selectedClasses, setSelectedClasses] = useState([]);

  // ==========================================================
  // OUVERTURE / FERMETURE MODAL DE CRÉATION
  // ==========================================================

  const openModal = () => {
    setSelectedRole('employee');
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      role: 'employee',
      service: 'Direction',
      department: '',
      className: '',
      assignedClass: '',
    });
    setChildren([{ id: Date.now(), name: '', className: '' }]);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setFormError('');
    setFormSuccess('');
  };

  // ==========================================================
  // CHANGEMENT FORMULAIRE
  // ==========================================================

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleSelection = (roleKey) => {
    setSelectedRole(roleKey);
    setFormData((prev) => ({ ...prev, role: roleKey }));
    setFormError('');
  };

  // ==========================================================
  // ENFANTS
  // ==========================================================

  const handleChildChange = (id, key, value) => {
    setChildren((prev) =>
      prev.map((child) => (child.id === id ? { ...child, [key]: value } : child))
    );
  };

  const addChild = () => {
    setChildren((prev) => [...prev, { id: Date.now(), name: '', className: '' }]);
  };

  const removeChild = (id) => {
    setChildren((prev) => (prev.length > 1 ? prev.filter((child) => child.id !== id) : prev));
  };

  // ==========================================================
  // VALIDATION FRONTEND
  // ==========================================================

  const validateForm = () => {
    const { firstName, lastName, email, password, role, className, assignedClass } = formData;
    if (!firstName.trim()) return 'Le prénom est obligatoire.';
    if (!lastName.trim()) return 'Le nom est obligatoire.';
    if (!email.trim()) return "L'adresse email est obligatoire.";
    if (!/^[^\s@]+@ynov\.com$/i.test(email.trim())) return "L'adresse email doit appartenir au domaine @ynov.com.";
    if (!password) return 'Le mot de passe est obligatoire.';
    if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères.';
    if (!roleOptions.some((r) => r.key === role)) return 'Le rôle sélectionné est invalide.';
    if (role === 'student' && !className) return 'Veuillez sélectionner une classe pour l\'étudiant.';
    if (role === 'teacher' && !assignedClass) return 'Veuillez sélectionner une classe pour le professeur.';
    return '';
  };

  // ==========================================================
  // CREATION UTILISATEUR
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);

      const displayName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      let department = formData.department.trim();

      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        displayName,
        role: selectedRole,
      };

      if (selectedRole === 'student') {
        payload.className = formData.className;
        payload.department = formData.className;
      } else if (selectedRole === 'teacher') {
        payload.assignedClass = formData.assignedClass;
        payload.department = formData.assignedClass;
      } else if (selectedRole === 'rh') {
        payload.department = formData.service || 'Ressources humaines';
      } else {
        payload.department = department || '—';
      }

      const result = await apiFetch('/api/users/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!result?.success) {
        throw new Error(result?.error || 'La création du compte a échoué.');
      }

      setFormSuccess('Le compte utilisateur a été créé avec succès.');
      await loadUsers();

      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess('');
      }, 800);
    } catch (error) {
      console.error('Erreur création utilisateur :', error);
      setFormError(error?.message || 'Impossible de créer le compte utilisateur.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================
  // MODIFICATION ROLE
  // ==========================================================

  const handleChangeRole = async (user) => {
    const newRole = window.prompt(
      `Nouveau rôle pour ${user.displayName || user.email} :\n\n${roleOptions
        .map((r) => `${r.key} → ${r.label}`)
        .join('\n')}`,
      user.role || 'employee'
    );
    if (!newRole) return;
    const normalizedRole = newRole.trim().toLowerCase();
    if (!roleOptions.some((r) => r.key === normalizedRole)) {
      window.alert('Rôle invalide.\n\n' + roleOptions.map((r) => r.key).join(', '));
      return;
    }
    try {
      const result = await apiFetch('/api/roles/assign', {
        method: 'POST',
        body: JSON.stringify({ uid: user.uid, role: normalizedRole }),
      });
      if (!result?.success) {
        throw new Error(result?.error || 'Impossible de modifier le rôle.');
      }
      window.alert(`Le rôle de ${user.displayName || user.email} a été modifié.`);
      await loadUsers();
    } catch (error) {
      console.error('Erreur modification rôle :', error);
      window.alert(error?.message || 'Impossible de modifier le rôle.');
    }
  };

  // ==========================================================
  // ACTIONS ADMIN
  // ==========================================================

  const handleSuspendUser = async (user) => {
    const newStatus = !user.disabled;
    const confirmMsg = newStatus
      ? `Suspendre le compte de ${user.displayName || user.email} ?`
      : `Réactiver le compte de ${user.displayName || user.email} ?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      const result = await apiFetch(`/api/users/${user.uid}/suspend`, {
        method: 'PATCH',
        body: JSON.stringify({ disabled: newStatus }),
      });
      if (!result.success) throw new Error(result.error || 'Erreur');
      alert(result.message);
      await loadUsers();
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Supprimer définitivement le compte de ${user.displayName || user.email} ?`)) return;
    try {
      const result = await apiFetch(`/api/users/${user.uid}`, { method: 'DELETE' });
      if (!result.success) throw new Error(result.error || 'Erreur');
      alert(result.message);
      await loadUsers();
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
  };

  const openAssignModal = (teacher) => {
    setSelectedTeacher(teacher);
    setSelectedClasses(teacher.assignedClasses || []);
    setShowAssignModal(true);
  };

  const handleAssignClass = async (classes) => {
    if (!selectedTeacher || !classes || classes.length === 0) {
      alert('Veuillez sélectionner au moins une classe.');
      return;
    }
    setIsAssigning(true);
    try {
      const result = await apiFetch('/api/users/assign-teacher', {
        method: 'POST',
        body: JSON.stringify({
          teacherUid: selectedTeacher.uid,
          assignedClasses: classes
        }),
      });
      if (!result.success) throw new Error(result.error || 'Erreur');
      alert(result.message);
      setShowAssignModal(false);
      setSelectedTeacher(null);
      setSelectedClass([]);
      await loadUsers();
    } catch (error) {
      alert('Erreur : ' + error.message);
    } finally {
      setIsAssigning(false);
    }
  };

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <div className="dashboard-scroll-area" style={{ height: '100%', overflowY: 'auto' }}>
      {/* HEADER */}
      <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="overview-title">Utilisateurs</h2>
          <p className="overview-subtitle">Gérez les accès, les rôles, les classes et les comptes.</p>
        </div>
        <div className="overview-actions" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" onClick={openModal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconPlus className="icon-sm" /> Ajouter un utilisateur
          </button>
        </div>
      </div>

      {usersError && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
          <strong>Erreur :</strong> {usersError}
          <button onClick={loadUsers} style={{ marginLeft: '12px', border: 'none', background: 'transparent', textDecoration: 'underline', cursor: 'pointer', color: 'inherit' }}>Réessayer</button>
        </div>
      )}

      {/* STATISTIQUES */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Utilisateurs</span>
            <div className="stat-icon-wrapper"><IconUsers className="icon-md" /></div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{isLoadingUsers ? '...' : totalUsers}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Comptes actifs</span>
            <div className="stat-icon-wrapper"><IconCheckCircle className="icon-md" /></div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{isLoadingUsers ? '...' : activeUsers}</span>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-header">
            <span className="stat-title">Comptes inactifs</span>
            <div className="stat-icon-wrapper"><IconAlertTriangle className="icon-md" /></div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{isLoadingUsers ? '...' : inactiveUsers}</span>
          </div>
          <div className="stat-subtitle">Comptes suspendus</div>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 className="panel-title">Liste des utilisateurs</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="search-bar">
              <IconSearch className="search-icon" />
              <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: '0.85rem', fontWeight: '500', outline: 'none', cursor: 'pointer' }}>
              <option value="all">Tous les rôles</option>
              {roleOptions.map((role) => (
                <option key={role.key} value={role.key}>{role.label}</option>
              ))}
            </select>
          </div>
        </div>

        <table className="data-table" style={{ marginTop: '16px' }}>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Classe (étudiant)</th>
              <th>Classe assignée (prof)</th>
              <th>Date création</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingUsers ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '32px' }}>Chargement...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Aucun utilisateur trouvé.</td></tr>
            ) : (
              filteredUsers.map((user) => {
                const displayName = user.displayName || user.email || 'Utilisateur';
                const isDisabled = user.disabled === true;
                const isStudent = user.role === 'student';
                const isTeacher = user.role === 'teacher';
                return (
                  <tr key={user.uid || user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="mini-avatar">{getInitials(displayName)}</div>
                        <span>{displayName}</span>
                      </div>
                    </td>
                    <td style={{ color: '#64748b' }}>{user.email || '—'}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        fontWeight: '500',
                        background: user.role === 'admin' ? '#fee2e2' : user.role === 'rh' ? '#fef3c7' : user.role === 'manager' ? '#dbeafe' : '#f1f5f9',
                        color: user.role === 'admin' ? '#991b1b' : user.role === 'rh' ? '#92400e' : user.role === 'manager' ? '#1d4ed8' : '#475569'
                      }}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td>
                      {isStudent ? (user.className || user.department || '—') : '—'}
                    </td>
                    <td>
                      {isTeacher ? (
                        user.assignedClass ? (
                          <span style={{ color: 'var(--ynov-cyan)', fontWeight: '500' }}>{user.assignedClass}</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Non assigné</span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <span className={`status-badge ${isDisabled ? 'urgent' : 'approved'}`}>
                        {isDisabled ? 'Inactif' : 'Actif'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button className="table-action-btn" onClick={() => window.alert(
                          `${displayName}\nEmail : ${user.email || '—'}\nRôle : ${getRoleLabel(user.role)}${isStudent ? `\nClasse : ${user.className || '—'}` : ''}${isTeacher ? `\nClasse assignée : ${user.assignedClass || '—'}` : ''}`
                        )}><IconEye className="action-icon" /></button>
                        <button className="table-action-btn" onClick={() => openEditModal(user)} title="Modifier">
                          ✏️
                        </button>
                        <button className="table-action-btn" onClick={() => handleChangeRole(user)} title="Changer rôle">
                          <IconDots className="action-icon" />
                        </button>
                        {isTeacher && (
                          <button className="table-action-btn" style={{ color: '#23b2a4' }} onClick={() => openAssignModal(user)}>📚</button>
                        )}
                        <button className="table-action-btn" style={{ color: isDisabled ? '#10b981' : '#f59e0b' }} onClick={() => handleSuspendUser(user)}>
                          {isDisabled ? '🔓' : '🔒'}
                        </button>
                        <button className="table-action-btn" style={{ color: '#ef4444' }} onClick={() => handleDeleteUser(user)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CREATION */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Nouvel accès</p>
                <h3>Ajouter un utilisateur</h3>
              </div>
              <button className="modal-close" onClick={closeModal} disabled={isSubmitting}>×</button>
            </div>

            {formError && <div className="form-error">{formError}</div>}
            {formSuccess && <div className="form-success">{formSuccess}</div>}

            <form className="user-form" onSubmit={handleSubmit}>
              <div className="field-group">
                <label className="field-label">Type de compte</label>
                <div className="role-selector">
                  {roleOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={`role-option ${selectedRole === option.key ? 'active' : ''}`}
                      onClick={() => handleRoleSelection(option.key)}
                      disabled={isSubmitting}
                    >
                      <span>{option.label}</span>
                      <small>{option.description}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <div className="field-group">
                  <label className="field-label">Prénom *</label>
                  <input className="field-input" type="text" name="firstName" value={formData.firstName} onChange={handleFieldChange} disabled={isSubmitting} />
                </div>
                <div className="field-group">
                  <label className="field-label">Nom *</label>
                  <input className="field-input" type="text" name="lastName" value={formData.lastName} onChange={handleFieldChange} disabled={isSubmitting} />
                </div>
                <div className="field-group full-width">
                  <label className="field-label">Email professionnel *</label>
                  <input className="field-input" type="email" name="email" value={formData.email} onChange={handleFieldChange} placeholder="prenom.nom@ynov.com" disabled={isSubmitting} />
                </div>
                <div className="field-group full-width">
                  <label className="field-label">Mot de passe initial *</label>
                  <input className="field-input" type="password" name="password" value={formData.password} onChange={handleFieldChange} placeholder="Minimum 6 caractères" disabled={isSubmitting} minLength={6} />
                </div>
                <div className="field-group full-width">
                  <label className="field-label">Téléphone</label>
                  <input className="field-input" type="tel" name="phone" value={formData.phone} onChange={handleFieldChange} placeholder="Ex : +33 6 12 34 56 78" disabled={isSubmitting} />
                </div>

                {selectedRole === 'student' && (
                  <div className="field-group full-width">
                    <label className="field-label">Classe *</label>
                    <select name="className" value={formData.className} onChange={handleFieldChange} className="field-input" disabled={isSubmitting}>
                      <option value="">-- Sélectionner --</option>
                      {classOptions.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedRole === 'teacher' && (
                  <div className="field-group full-width">
                    <label className="field-label">Classe assignée *</label>
                    <select name="assignedClass" value={formData.assignedClass} onChange={handleFieldChange} className="field-input" disabled={isSubmitting}>
                      <option value="">-- Sélectionner --</option>
                      {classOptions.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedRole === 'rh' && (
                  <div className="field-group full-width">
                    <label className="field-label">Service</label>
                    <select name="service" value={formData.service} onChange={handleFieldChange} className="field-input" disabled={isSubmitting}>
                      {serviceOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(selectedRole === 'admin' || selectedRole === 'manager' || selectedRole === 'employee') && (
                  <div className="field-group full-width">
                    <label className="field-label">Département (optionnel)</label>
                    <input className="field-input" type="text" name="department" value={formData.department} onChange={handleFieldChange} placeholder="Ex : Informatique" disabled={isSubmitting} />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL D'ASSIGNATION DE CLASSE (pour professeurs) avec cases à cocher */}
      {showAssignModal && selectedTeacher && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="user-modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Assigner des classes</p>
                <h3>Professeur : {selectedTeacher.displayName}</h3>
              </div>
              <button className="modal-close" onClick={() => setShowAssignModal(false)} disabled={isAssigning}>×</button>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              <div className="field-group">
                <label className="field-label">Classes assignées (cochez plusieurs)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  {classOptions.map((cls) => {
                    const isChecked = (selectedClass ? [selectedClass] : []).includes(cls) || (selectedTeacher?.assignedClasses || []).includes(cls);
                    // Pour simplifier, on utilise selectedClass comme string mais on va gérer un tableau
                    // On va utiliser un état local selectedClasses
                    const isSelected = (selectedClasses || []).includes(cls);
                    return (
                      <label key={cls} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 8px', background: isSelected ? '#e0f2fe' : 'transparent', borderRadius: '4px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClasses(prev => [...prev, cls]);
                            } else {
                              setSelectedClasses(prev => prev.filter(c => c !== cls));
                            }
                          }}
                        />
                        <span>{cls}</span>
                      </label>
                    );
                  })}
                </div>
                <small style={{ color: '#64748b' }}>Cochez toutes les classes que ce professeur doit enseigner.</small>
              </div>
              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button className="btn-secondary" onClick={() => setShowAssignModal(false)} disabled={isAssigning}>Annuler</button>
                <button className="btn-primary" onClick={async () => {
                  if (selectedClasses.length === 0) {
                    alert('Veuillez sélectionner au moins une classe.');
                    return;
                  }
                  setIsAssigning(true);
                  try {
                    const result = await apiFetch('/api/users/assign-teacher', {
                      method: 'POST',
                      body: JSON.stringify({
                        teacherUid: selectedTeacher.uid,
                        assignedClasses: selectedClasses,
                      }),
                    });
                    if (!result.success) throw new Error(result.error || 'Erreur');
                    alert(result.message);
                    setShowAssignModal(false);
                    setSelectedTeacher(null);
                    setSelectedClasses([]);
                    await loadUsers();
                  } catch (error) {
                    alert('Erreur : ' + error.message);
                  } finally {
                    setIsAssigning(false);
                  }
                }} disabled={isAssigning || selectedClasses.length === 0}>
                  {isAssigning ? 'Assignation...' : `Assigner (${selectedClasses.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ================================================== */}
      {/* MODAL D'ÉDITION UTILISATEUR                        */}
      {/* ================================================== */}

      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" style={{
            maxWidth: '600px',
            padding: '24px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '16px',
              marginBottom: '20px'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Modifier le compte</h3>
              <button className="modal-close" onClick={closeEditModal} disabled={isEditing} style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#94a3b8'
              }}>×</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsEditing(true);
              try {
                const result = await apiFetch(`/api/users/${editingUser.uid}`, {
                  method: 'PATCH',
                  body: JSON.stringify(editFormData),
                });
                if (!result.success) throw new Error(result.error || 'Erreur');
                alert('Compte modifié avec succès.');
                closeEditModal();
                await loadUsers();
              } catch (error) {
                alert('Erreur : ' + error.message);
              } finally {
                setIsEditing(false);
              }
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="field-group">
                  <label className="field-label">Nom complet</label>
                  <input className="field-input" type="text" value={editFormData.displayName || ''} onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })} />
                </div>
                <div className="field-group">
                  <label className="field-label">Email</label>
                  <input className="field-input" type="email" value={editFormData.email || ''} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} />
                </div>
                <div className="field-group">
                  <label className="field-label">Téléphone</label>
                  <input className="field-input" type="tel" value={editFormData.phone || ''} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} />
                </div>
                <div className="field-group">
                  <label className="field-label">Département</label>
                  <input className="field-input" type="text" value={editFormData.department || ''} onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })} />
                </div>
              </div>

              {/* Champs spécifiques selon le rôle */}
              {editingUser.role === 'student' && (
                <div className="field-group" style={{ marginTop: '16px' }}>
                  <label className="field-label">Classe</label>
                  <select className="field-input" value={editFormData.className || ''} onChange={(e) => setEditFormData({ ...editFormData, className: e.target.value })}>
                    <option value="">-- Sélectionner --</option>
                    {classOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                </div>
              )}

              {editingUser.role === 'teacher' && (
                <div className="field-group" style={{ marginTop: '16px' }}>
                  <label className="field-label">Classes assignées (cochez plusieurs)</label>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: '#f8fafc'
                  }}>
                    {classOptions.map(cls => {
                      const isChecked = (editFormData.assignedClasses || []).includes(cls);
                      return (
                        <label key={cls} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          padding: '4px 10px',
                          background: isChecked ? '#e0f2fe' : 'transparent',
                          borderRadius: '4px',
                          border: isChecked ? '1px solid #23b2a4' : '1px solid transparent'
                        }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = editFormData.assignedClasses || [];
                              if (e.target.checked) {
                                setEditFormData({ ...editFormData, assignedClasses: [...current, cls] });
                              } else {
                                setEditFormData({ ...editFormData, assignedClasses: current.filter(c => c !== cls) });
                              }
                            }}
                          />
                          <span>{cls}</span>
                        </label>
                      );
                    })}
                  </div>
                  <small style={{ color: '#64748b' }}>Cochez toutes les classes que ce professeur doit enseigner.</small>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={closeEditModal} disabled={isEditing}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={isEditing}>
                  {isEditing ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}