import React, { useEffect, useMemo, useState } from 'react';
import {
  IconUsers,
  IconSearch,
  IconPlus,
  IconDots,
  IconEye,
} from '../components/Icons';

import { apiFetch } from '../services/api';

// ============================================================
// CONFIGURATION DES RÔLES
// ============================================================

const roleOptions = [
  {
    key: 'admin',
    label: 'Administrateur',
    description: 'Administration complète',
  },
  {
    key: 'rh',
    label: 'Ressources humaines',
    description: 'Gestion du personnel',
  },
  {
    key: 'manager',
    label: 'Manager',
    description: 'Gestion équipe',
  },
  {
    key: 'employee',
    label: 'Personnel',
    description: 'Accès utilisateur standard',
  },
  {
    key: 'student',
    label: 'Étudiant',
    description: 'Accès étudiant',
  },
  {
    key: 'teacher',
    label: 'Professeur',
    description: 'Enseignement',
  },
  {
    key: 'parent',
    label: 'Parent',
    description: 'Suivi des enfants',
  },
];

const levelOptions = [
  'Bachelor 1',
  'Bachelor 2',
  'Bachelor 3',
  'Master 1',
  'Master 2',
];

const fieldOptions = [
  'Informatique',
  'Réseaux & Cybersécurité',
  'Data Science',
  'Développement web',
  'UX / UI Design',
  'Systèmes embarqués',
];

const serviceOptions = [
  'Direction',
  'Ressources humaines',
  'Finance',
  'Admissions',
  'Pédagogie',
  'Campus',
];

const employeeDepartmentOptions = [
  'Administratif',
  'Direction',
  'Pédagogie',
  'Admissions',
  'Campus',
];

// ============================================================
// OUTILS
// ============================================================

function getRoleLabel(role) {
  const option = roleOptions.find((item) => item.key === role);

  return option ? option.label : role || 'Non défini';
}

function getInitials(name = '') {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '??';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function buildYnovEmail(firstName, lastName) {
  const normalizePart = (value) => value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  const normalizedFirstName = normalizePart(firstName);
  const normalizedLastName = normalizePart(lastName);

  if (!normalizedFirstName || !normalizedLastName) {
    return '';
  }

  return `${normalizedFirstName}.${normalizedLastName}@ynov.com`;
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
  // MODAL
  // ----------------------------------------------------------

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [formSuccess, setFormSuccess] = useState('');

  // ----------------------------------------------------------
  // ROLE SELECTION
  // ----------------------------------------------------------

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
    level: 'Bachelor 1',
    field: 'Informatique',
    service: 'Direction',
    department: '',
  });

  // ----------------------------------------------------------
  // ENFANTS
  // ----------------------------------------------------------

  const [children, setChildren] = useState([
    {
      id: 1,
      name: '',
      level: 'Bachelor 1',
      field: 'Informatique',
    },
  ]);

  // ==========================================================
  // CHARGEMENT DES UTILISATEURS
  // ==========================================================

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setUsersError('');

      const result = await apiFetch('/api/users');

      if (!result?.success) {
        throw new Error(
          result?.error || 'Impossible de récupérer les utilisateurs.'
        );
      }

      setUsers(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error('Erreur chargement utilisateurs :', error);

      setUsersError(
        error?.message ||
          'Impossible de récupérer les utilisateurs.'
      );
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    loadUsers();
  }, []);

  // ==========================================================
  // UTILISATEURS FILTRÉS
  // ==========================================================

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole =
        roleFilter === 'all' ||
        user.role === roleFilter;

      if (!matchesRole) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        user.displayName,
        user.email,
        user.department,
        user.role,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [users, roleFilter, searchTerm]);

  // ==========================================================
  // STATISTIQUES
  // ==========================================================

  const totalUsers = users.length;

  const activeUsers = users.filter(
    (user) => user.disabled !== true
  ).length;

  const inactiveUsers = users.filter(
    (user) => user.disabled === true
  ).length;

  // ==========================================================
  // OUVERTURE MODAL
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
      level: 'Bachelor 1',
      field: 'Informatique',
      service: 'Direction',
      department: '',
    });

    setChildren([
      {
        id: Date.now(),
        name: '',
        level: 'Bachelor 1',
        field: 'Informatique',
      },
    ]);

    setFormError('');
    setFieldErrors({});
    setFormSuccess('');

    setIsModalOpen(true);
  };

  // ==========================================================
  // FERMETURE MODAL
  // ==========================================================

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setFormError('');
    setFieldErrors({});
    setFormSuccess('');
  };

  // ==========================================================
  // CHANGEMENT FORMULAIRE
  // ==========================================================

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === 'firstName' || name === 'lastName'
        ? value
        : value,
      ...(name === 'firstName' || name === 'lastName'
        ? {
            email: buildYnovEmail(
              name === 'firstName' ? value : prev.firstName,
              name === 'lastName' ? value : prev.lastName,
            ),
          }
        : {}),
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: '',
      ...(name === 'firstName' || name === 'lastName' ? { email: '' } : {}),
    }));
    setFormError('');
  };

  // ==========================================================
  // CHANGEMENT ROLE
  // ==========================================================

  const handleRoleSelection = (roleKey) => {
    setSelectedRole(roleKey);

    setFormData((prev) => ({
      ...prev,
      role: roleKey,
    }));

    setFormError('');
  };

  // ==========================================================
  // NIVEAU
  // ==========================================================

  const handleLevelSelection = (level) => {
    setFormData((prev) => ({
      ...prev,
      level,
    }));
  };

  // ==========================================================
  // FILIERE
  // ==========================================================

  const handleFieldSelection = (field) => {
    setFormData((prev) => ({
      ...prev,
      field,
    }));
  };

  // ==========================================================
  // ENFANTS
  // ==========================================================

  const handleChildChange = (id, key, value) => {
    setChildren((prev) =>
      prev.map((child) =>
        child.id === id
          ? {
              ...child,
              [key]: value,
            }
          : child
      )
    );
  };

  const addChild = () => {
    setChildren((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: '',
        level: 'Bachelor 1',
        field: 'Informatique',
      },
    ]);
  };

  const removeChild = (id) => {
    setChildren((prev) =>
      prev.length > 1
        ? prev.filter((child) => child.id !== id)
        : prev
    );
  };

  // ==========================================================
  // VALIDATION FRONTEND
  // ==========================================================

  const validateForm = () => {
    const errors = {};
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!firstName) {
      errors.firstName = 'Le prénom est obligatoire.';
    }

    if (!lastName) {
      errors.lastName = 'Le nom est obligatoire.';
    }

    if (!email) {
      errors.email = "L'adresse email est générée à partir du prénom et du nom.";
    }

    if (!password) {
      errors.password = 'Le mot de passe est obligatoire.';
    } else if (password.length < 8) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères.';
    }

    if (!roleOptions.some((role) => role.key === selectedRole)) {
      errors.role = 'Sélectionnez un rôle.';
    }

    if (selectedRole === 'parent' && !children.some((child) => child.name.trim())) {
      errors.children = 'Ajoutez au moins un enfant avec un nom complet.';
    }

    return errors;
  };

  // ==========================================================
  // CREATION UTILISATEUR
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError('');
    setFormSuccess('');

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormError('Certains champs doivent être corrigés avant la création du compte.');
      return;
    }

    try {
      setIsSubmitting(true);

      const displayName =
        `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();

      const department =
        formData.department.trim() ||
        (
          selectedRole === 'student'
            ? formData.field
            : selectedRole === 'teacher'
              ? formData.field
              : selectedRole === 'rh'
                ? 'Ressources humaines'
                : selectedRole === 'administrative'
                  ? formData.service
                  : ''
        );

      const result = await apiFetch('/api/users/create', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          displayName,
          role: selectedRole,
          department,
          level: selectedRole === 'student' ? formData.level : '',
          children: selectedRole === 'parent'
            ? children
              .filter((child) => child.name.trim())
              .map(({ id, ...child }) => child)
            : [],
        }),
      });

      if (!result?.success) {
        throw new Error(
          result?.error || 'La création du compte a échoué.'
        );
      }

      setFormSuccess(
        'Le compte utilisateur a été créé avec succès.'
      );

      await loadUsers();

      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess('');
      }, 800);
    } catch (error) {
      console.error('Erreur création utilisateur :', error);

      setFormError(
        error?.message ||
          'Impossible de créer le compte utilisateur.'
      );
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
        .map((role) => `${role.key} → ${role.label}`)
        .join('\n')}`,
      user.role || 'employee'
    );

    if (!newRole) {
      return;
    }

    const normalizedRole = newRole.trim().toLowerCase();

    if (!roleOptions.some((role) => role.key === normalizedRole)) {
      window.alert(
        'Rôle invalide.\n\n' +
          roleOptions
            .map((role) => role.key)
            .join(', ')
      );

      return;
    }

    try {
      const result = await apiFetch('/api/roles/assign', {
        method: 'POST',
        body: JSON.stringify({
          uid: user.uid,
          role: normalizedRole,
        }),
      });

      if (!result?.success) {
        throw new Error(
          result?.error ||
            'Impossible de modifier le rôle.'
        );
      }

      window.alert(
        `Le rôle de ${user.displayName || user.email} a été modifié.`
      );

      await loadUsers();
    } catch (error) {
      console.error('Erreur modification rôle :', error);

      window.alert(
        error?.message ||
          'Impossible de modifier le rôle.'
      );
    }
  };

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <div
      className="dashboard-scroll-area"
      style={{
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {/* ================================================== */}
      {/* HEADER                                             */}
      {/* ================================================== */}

      <div
        className="overview-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 className="overview-title">
            Utilisateurs
          </h2>

          <p className="overview-subtitle">
            Gérez les accès et les rôles de tous les membres.
          </p>
        </div>

        <div
          className="overview-actions"
          style={{
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            type="button"
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onClick={openModal}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
              }}
            >
              <IconPlus />
            </div>

            Ajouter un utilisateur
          </button>
        </div>
      </div>

      {/* ================================================== */}
      {/* ERREUR CHARGEMENT                                  */}
      {/* ================================================== */}

      {usersError && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fecaca',
          }}
        >
          <strong>Erreur :</strong> {usersError}

          <button
            type="button"
            onClick={loadUsers}
            style={{
              marginLeft: '12px',
              border: 'none',
              background: 'transparent',
              textDecoration: 'underline',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ================================================== */}
      {/* STATISTIQUES                                       */}
      {/* ================================================== */}

      <div
        className="stats-grid"
        style={{
          gridTemplateColumns: 'repeat(3, 1fr)',
        }}
      >
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">
              Total Utilisateurs
            </span>

            <div
              className="stat-icon-wrapper"
              style={{
                width: '32px',
                height: '32px',
                color: 'var(--ynov-gray-500)',
              }}
            >
              <IconUsers />
            </div>
          </div>

          <div className="stat-value-container">
            <span className="stat-value">
              {isLoadingUsers ? '...' : totalUsers}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">
              Comptes actifs
            </span>

            <div
              className="stat-icon-wrapper"
              style={{
                width: '32px',
                height: '32px',
                color: 'var(--ynov-teal)',
              }}
            >
              <IconPlus />
            </div>
          </div>

          <div className="stat-value-container">
            <span className="stat-value">
              {isLoadingUsers ? '...' : activeUsers}
            </span>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-header">
            <span className="stat-title">
              Comptes inactifs
            </span>

            <div
              className="stat-icon-wrapper"
              style={{
                width: '32px',
                height: '32px',
                color: 'var(--status-pending)',
              }}
            >
              <IconDots />
            </div>
          </div>

          <div className="stat-value-container">
            <span className="stat-value">
              {isLoadingUsers ? '...' : inactiveUsers}
            </span>
          </div>

          <div className="stat-subtitle">
            Comptes désactivés
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* TABLEAU                                            */}
      {/* ================================================== */}

      <div
        className="panel"
        style={{
          marginTop: '24px',
        }}
      >
        <div
          className="panel-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <h3 className="panel-title">
            Liste des utilisateurs
          </h3>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* RECHERCHE */}

            <div
              className="search-bar"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                boxShadow: 'none',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                }}
              >
                <IconSearch />
              </div>

              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                style={{
                  background: 'transparent',
                }}
              />
            </div>

            {/* FILTRE ROLE */}

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value)
              }
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#334155',
                fontSize: '0.85rem',
                fontWeight: '500',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">
                Tous les rôles
              </option>

              {roleOptions.map((role) => (
                <option
                  key={role.key}
                  value={role.key}
                >
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <table
          className="data-table"
          style={{
            marginTop: '16px',
          }}
        >
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Département</th>
              <th>Date de création</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {isLoadingUsers ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    textAlign: 'center',
                    padding: '32px',
                  }}
                >
                  Chargement des utilisateurs...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    textAlign: 'center',
                    padding: '32px',
                    color: '#64748b',
                  }}
                >
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const displayName =
                  user.displayName ||
                  user.email ||
                  'Utilisateur';

                const isDisabled =
                  user.disabled === true;

                return (
                  <tr key={user.uid || user.id}>
                    {/* UTILISATEUR */}

                    <td>
                      <div className="user-cell">
                        <div className="mini-avatar">
                          {getInitials(displayName)}
                        </div>

                        <span>
                          {displayName}
                        </span>
                      </div>
                    </td>

                    {/* EMAIL */}

                    <td
                      style={{
                        color: '#64748b',
                      }}
                    >
                      {user.email || '—'}
                    </td>

                    {/* ROLE */}

                    <td>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          fontWeight: '500',
                          background:
                            user.role === 'admin'
                              ? '#fee2e2'
                              : user.role === 'rh'
                                ? '#fef3c7'
                                : user.role === 'manager'
                                  ? '#dbeafe'
                                  : '#f1f5f9',
                          color:
                            user.role === 'admin'
                              ? '#991b1b'
                              : user.role === 'rh'
                                ? '#92400e'
                                : user.role === 'manager'
                                  ? '#1d4ed8'
                                  : '#475569',
                        }}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>

                    {/* DEPARTEMENT */}

                    <td>
                      {user.department || '—'}
                    </td>

                    {/* DATE */}

                    <td>
                      {formatDate(
                        user.createdAt
                      )}
                    </td>

                    {/* STATUT */}

                    <td>
                      <span
                        className={`status-badge ${
                          isDisabled
                            ? 'urgent'
                            : 'approved'
                        }`}
                      >
                        {isDisabled
                          ? 'Inactif'
                          : 'Actif'}
                      </span>
                    </td>

                    {/* ACTION */}

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                        }}
                      >
                        <button
                          type="button"
                          className="table-action-btn"
                          title="Consulter"
                          onClick={() => {
                            window.alert(
                              `${displayName}\n\nEmail : ${
                                user.email || '—'
                              }\nRôle : ${
                                getRoleLabel(
                                  user.role
                                )
                              }\nDépartement : ${
                                user.department ||
                                '—'
                              }`
                            );
                          }}
                        >
                          <IconEye />
                        </button>

                        <button
                          type="button"
                          className="table-action-btn"
                          title="Modifier le rôle"
                          onClick={() =>
                            handleChangeRole(user)
                          }
                        >
                          <IconDots />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================================================== */}
      {/* MODAL CREATION                                     */}
      {/* ================================================== */}

      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={closeModal}
        >
          <div
            className="user-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <p className="modal-kicker">
                  Nouvel accès
                </p>

                <h3>
                  Ajouter un utilisateur
                </h3>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                aria-label="Fermer"
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>

            {/* ERREUR */}

            {formError && (
              <div
                style={{
                  margin: '0 24px 16px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                }}
              >
                {formError}
              </div>
            )}

            {/* SUCCES */}

            {formSuccess && (
              <div
                style={{
                  margin: '0 24px 16px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                }}
              >
                {formSuccess}
              </div>
            )}

            <form
              className="user-form"
              onSubmit={handleSubmit}
            >
              {/* ROLE */}

              <div className="field-group">
                <label className="field-label">
                  Type de compte
                </label>

                <div className="role-selector">
                  {roleOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={`role-option ${
                        selectedRole === option.key
                          ? 'active'
                          : ''
                      }`}
                      onClick={() =>
                        handleRoleSelection(
                          option.key
                        )
                      }
                      disabled={isSubmitting}
                    >
                      <span>
                        {option.label}
                      </span>

                      <small>
                        {option.description}
                      </small>
                    </button>
                  ))}
                </div>
                {fieldErrors.role && <p className="field-error">{fieldErrors.role}</p>}
              </div>

              {/* INFORMATIONS GENERALES */}

              <div className="form-grid">
                <div className="field-group">
                  <label className="field-label">
                    Prénom *
                  </label>

                  <input
                    className="field-input"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleFieldChange}
                    placeholder="Ex : Emma"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.firstName && <p className="field-error">{fieldErrors.firstName}</p>}
                </div>

                <div className="field-group">
                  <label className="field-label">
                    Nom *
                  </label>

                  <input
                    className="field-input"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleFieldChange}
                    placeholder="Ex : Dupont"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.lastName && <p className="field-error">{fieldErrors.lastName}</p>}
                </div>

                <div className="field-group full-width">
                  <label className="field-label">
                    Email professionnel *
                  </label>

                  <input
                    className="field-input"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFieldChange}
                    placeholder="prenom.nom@ynov.com"
                    readOnly
                    disabled={isSubmitting}
                  />
                  <p className="field-help">L’adresse est générée automatiquement à partir du prénom et du nom.</p>
                  {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
                </div>

                <div className="field-group full-width">
                  <label className="field-label">
                    Mot de passe initial *
                  </label>

                  <input
                    className="field-input"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleFieldChange}
                    placeholder="Minimum 6 caractères"
                    disabled={isSubmitting}
                    minLength={8}
                  />
                  {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
                </div>

                <div className="field-group full-width">
                  <label className="field-label">
                    Téléphone
                  </label>

                  <input
                    className="field-input"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFieldChange}
                    placeholder="Ex : +33 6 12 34 56 78"
                    disabled={isSubmitting}
                  />
                </div>

                {selectedRole !== 'parent' && (
                  <div className="field-group full-width">
                    <label className="field-label">
                      Département
                    </label>

                    {selectedRole === 'employee' ? (
                      <select
                        className="field-input"
                        name="department"
                        value={formData.department}
                        onChange={handleFieldChange}
                        disabled={isSubmitting}
                      >
                        <option value="">Sélectionner un département</option>
                        {employeeDepartmentOptions.map((department) => (
                          <option key={department} value={department}>{department}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="field-input"
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleFieldChange}
                        placeholder="Ex : Informatique"
                        disabled={isSubmitting}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* ETUDIANT */}

              {selectedRole === 'student' && (
                <div className="dynamic-section">
                  <div className="field-group">
                    <label className="field-label">
                      Niveau
                    </label>

                    <div className="pill-grid">
                      {levelOptions.map(
                        (level) => (
                          <button
                            key={level}
                            type="button"
                            className={`pill-option ${
                              formData.level ===
                              level
                                ? 'active'
                                : ''
                            }`}
                            onClick={() =>
                              handleLevelSelection(
                                level
                              )
                            }
                            disabled={isSubmitting}
                          >
                            {level}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label">
                      Filière
                    </label>

                    <div className="pill-grid">
                      {fieldOptions.map(
                        (field) => (
                          <button
                            key={field}
                            type="button"
                            className={`pill-option ${
                              formData.field ===
                              field
                                ? 'active'
                                : ''
                            }`}
                            onClick={() =>
                              handleFieldSelection(
                                field
                              )
                            }
                            disabled={isSubmitting}
                          >
                            {field}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PROFESSEUR */}

              {selectedRole === 'teacher' && (
                <div className="dynamic-section">
                  <div className="field-group">
                    <label className="field-label">
                      Département / Filière
                    </label>

                    <div className="pill-grid">
                      {fieldOptions.map(
                        (field) => (
                          <button
                            key={field}
                            type="button"
                            className={`pill-option ${
                              formData.field ===
                              field
                                ? 'active'
                                : ''
                            }`}
                            onClick={() =>
                              handleFieldSelection(
                                field
                              )
                            }
                            disabled={isSubmitting}
                          >
                            {field}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* RH */}

              {selectedRole === 'rh' && (
                <div className="dynamic-section">
                  <div className="field-group">
                    <label className="field-label">
                      Service
                    </label>

                    <div className="pill-grid compact">
                      {serviceOptions.map(
                        (service) => (
                          <button
                            key={service}
                            type="button"
                            className={`pill-option ${
                              formData.service ===
                              service
                                ? 'active'
                                : ''
                            }`}
                            onClick={() =>
                              setFormData(
                                (prev) => ({
                                  ...prev,
                                  service,
                                })
                              )
                            }
                            disabled={isSubmitting}
                          >
                            {service}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PARENT */}

              {selectedRole === 'parent' && (
                <div className="dynamic-section">
                  <div className="section-header">
                    <div>
                      <label className="field-label">Enfants associés</label>
                      <p className="dynamic-help">
                        Ajoutez les enfants que ce parent pourra suivre dans l’application.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-inline"
                      onClick={addChild}
                      disabled={isSubmitting}
                    >
                      + Ajouter un enfant
                    </button>
                  </div>
                  {fieldErrors.children && <p className="field-error">{fieldErrors.children}</p>}

                  <div className="child-list">
                    {children.map((child, index) => (
                      <div className="child-card" key={child.id}>
                        <div className="section-header">
                          <strong>Enfant {index + 1}</strong>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => removeChild(child.id)}
                            disabled={isSubmitting || children.length === 1}
                          >
                            Supprimer
                          </button>
                        </div>
                        <div className="mini-form-grid">
                          <div className="field-group">
                            <label className="field-label" htmlFor={`child-name-${child.id}`}>Nom complet</label>
                            <input
                              id={`child-name-${child.id}`}
                              className="field-input"
                              type="text"
                              value={child.name}
                              onChange={(event) => handleChildChange(child.id, 'name', event.target.value)}
                              placeholder="Ex : Lucas Martin"
                              disabled={isSubmitting}
                            />
                          </div>
                          <div className="field-group">
                            <label className="field-label" htmlFor={`child-level-${child.id}`}>Niveau</label>
                            <select
                              id={`child-level-${child.id}`}
                              className="field-input"
                              value={child.level}
                              onChange={(event) => handleChildChange(child.id, 'level', event.target.value)}
                              disabled={isSubmitting}
                            >
                              {levelOptions.map((level) => <option key={level}>{level}</option>)}
                            </select>
                          </div>
                          <div className="field-group full-width">
                            <label className="field-label" htmlFor={`child-field-${child.id}`}>Filière</label>
                            <select
                              id={`child-field-${child.id}`}
                              className="field-input"
                              value={child.field}
                              onChange={(event) => handleChildChange(child.id, 'field', event.target.value)}
                              disabled={isSubmitting}
                            >
                              {fieldOptions.map((field) => <option key={field}>{field}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ADMIN / MANAGER / EMPLOYEE */}

              {(selectedRole === 'admin' ||
                selectedRole === 'manager' ||
                selectedRole === 'employee') && (
                <div
                  className="dynamic-section"
                  style={{
                    padding: '12px 0',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: '#64748b',
                      fontSize: '0.9rem',
                    }}
                  >
                    Le compte sera créé avec le rôle{' '}
                    <strong>
                      {getRoleLabel(
                        selectedRole
                      )}
                    </strong>
                    .
                  </p>
                </div>
              )}

              {/* ACTIONS */}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Création...'
                    : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}