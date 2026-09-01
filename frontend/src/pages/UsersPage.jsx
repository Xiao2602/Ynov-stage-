import React, { useEffect, useMemo, useState } from 'react';
import {
  IconUsers,
  IconSearch,
  IconPlus,
  IconDots,
  IconEye,
  IconX,
  IconCheckCircle,
  IconAlertTriangle,
  IconUpload,
  IconDownload
} from '../components/Icons';
import { apiFetch } from '../api/api'; // ✅ Correction : plus de /api en double
import * as XLSX from 'xlsx';
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
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // ----------------------------------------------------------
  // MODAL D'ÉDITION
  // ----------------------------------------------------------

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  // ----------------------------------------------------------
  // MODAL DE VISUALISATION UTILISATEUR
  // ----------------------------------------------------------
  const [viewingUser, setViewingUser] = useState(null);

  // ----------------------------------------------------------
  // 🔥 MODAL D'IMPORT MASSIF
  // ----------------------------------------------------------

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // ----------------------------------------------------------
  // 🔥 EXPORTATION EXCEL (.XLSX)
  // ----------------------------------------------------------
  const handleExportUsers = () => {
    if (!users || users.length === 0) {
      alert("Aucun utilisateur à exporter.");
      return;
    }
    const dataToExport = filteredUsers.map(user => ({
      "Nom complet": user.displayName || '-',
      "Email": user.email || '-',
      "Rôle": getRoleLabel(user.role),
      "Département": user.department || '-',
      "Classe (Étudiant)": user.className || '-',
      "Classe(s) Assignée(s) (Prof)": Array.isArray(user.assignedClasses) ? user.assignedClasses.join(', ') : (user.assignedClass || '-'),
      "Téléphone": user.phone || '-',
      "Date de création": formatDate(user.createdAt),
      "Statut": user.disabled ? "Inactif / Suspendu" : "Actif"
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, ws, "Utilisateurs");
    XLSX.writeFile(wb, `utilisateurs_ynov_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ==========================================================
  // CHARGEMENT DES UTILISATEURS
  // ==========================================================

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setUsersError('');
      const result = await apiFetch('/users');
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

      const result = await apiFetch('/users/create', {
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

  // ==========================================================
  // MODIFICATION ROLE
  // ==========================================================

  const handleChangeRole = async (user) => {
    const uid = user.uid || user.id;
    if (!uid) {
      window.alert("Identifiant utilisateur manquant.");
      return;
    }
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
      const result = await apiFetch('/roles/assign', {
        method: 'POST',
        body: JSON.stringify({ uid, role: normalizedRole }),
      });
      if (!result?.success) {
        throw new Error(result?.error || 'Impossible de modifier le rôle.');
      }
      window.alert(`Le rôle de ${user.displayName || user.email} a été modifié en ${getRoleLabel(normalizedRole)}.`);
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
    const uid = user.uid || user.id;
    if (!uid) {
      window.alert("Identifiant utilisateur manquant.");
      return;
    }
    const newStatus = !user.disabled;
    const confirmMsg = newStatus
      ? `Suspendre le compte de ${user.displayName || user.email} ?`
      : `Réactiver le compte de ${user.displayName || user.email} ?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      const result = await apiFetch(`/users/${uid}/suspend`, {
        method: 'PATCH',
        body: JSON.stringify({ disabled: newStatus }),
      });
      if (!result.success) throw new Error(result.error || 'Erreur');
      alert(result.message || (newStatus ? "Compte suspendu." : "Compte réactivé."));
      await loadUsers();
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
  };

  const handleDeleteUser = async (user) => {
    const uid = user.uid || user.id;
    if (!uid) {
      window.alert("Identifiant utilisateur manquant.");
      return;
    }
    if (!window.confirm(`Supprimer définitivement le compte de ${user.displayName || user.email} ?`)) return;
    try {
      const result = await apiFetch(`/users/${uid}`, { method: 'DELETE' });
      if (!result.success) throw new Error(result.error || 'Erreur');
      alert(result.message || "Compte utilisateur supprimé.");
      await loadUsers();
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
  };

  const openAssignModal = (teacher) => {
    const classes = Array.isArray(teacher.assignedClasses) && teacher.assignedClasses.length > 0
      ? teacher.assignedClasses
      : (teacher.assignedClass ? [teacher.assignedClass] : []);
    setSelectedTeacher({ ...teacher, uid: teacher.uid || teacher.id });
    setSelectedClasses(classes);
    setShowAssignModal(true);
  };

  const handleAssignClass = async (classes) => {
    const teacherUid = selectedTeacher?.uid || selectedTeacher?.id;
    if (!teacherUid || !classes || classes.length === 0) {
      alert('Veuillez sélectionner au moins une classe.');
      return;
    }
    setIsAssigning(true);
    try {
      const result = await apiFetch('/users/assign-teacher', {
        method: 'POST',
        body: JSON.stringify({
          teacherUid,
          assignedClasses: classes
        }),
      });
      if (!result.success) throw new Error(result.error || 'Erreur');
      alert(result.message || "Classes assignées avec succès.");
      setShowAssignModal(false);
      setSelectedTeacher(null);
      setSelectedClasses([]);
      await loadUsers();
    } catch (error) {
      alert('Erreur : ' + error.message);
    } finally {
      setIsAssigning(false);
    }
  };

  // ==========================================================
  // 🔥 GESTION DE L'IMPORT MASSIF
  // ==========================================================

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

  // 🔥 Télécharger le template avec listes de validation
  const downloadTemplate = () => {
    const roleList = roleOptions.map(r => r.key).join(',');
    const classList = classOptions.join(',');

    const templateData = [
      ['Email', 'Mot de passe', 'Nom complet', 'Rôle', 'Département (optionnel)', 'Classe (étudiant)', 'Classe assignée (professeur)', 'Téléphone']
    ];
    templateData.push(['prenom.nom@ynov.com', 'Password123!', 'Jean Dupont', 'student', 'Informatique', 'Bachelor 1 - Informatique', '', '0612345678']);
    templateData.push(['prof@ynov.com', 'Password123!', 'Marie Martin', 'teacher', 'Informatique', '', 'Bachelor 1 - Informatique', '0612345679']);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // 🔥 Ajouter des listes de validation (Data Validation) pour les colonnes
    // Colle D (Rôle) : colonne 4
    // Colle F (Classe étudiant) : colonne 6
    // Colle G (Classe assignée professeur) : colonne 7

    ws['!dataValidation'] = [
      {
        type: 'list',
        operator: 'equal',
        formula1: `"${roleList}"`,
        ranges: [
          { s: { r: 1, c: 3 }, e: { r: 100, c: 3 } } // Colonne D (Rôle) de la ligne 2 à 100
        ],
        showErrorMessage: true,
        errorTitle: 'Rôle invalide',
        error: 'Veuillez choisir un rôle parmi : ' + roleList
      },
      {
        type: 'list',
        operator: 'equal',
        formula1: `"${classList}"`,
        ranges: [
          { s: { r: 1, c: 5 }, e: { r: 100, c: 5 } } // Colonne F (Classe étudiant)
        ],
        showErrorMessage: true,
        errorTitle: 'Classe invalide',
        error: 'Veuillez choisir une classe parmi : ' + classList
      },
      {
        type: 'list',
        operator: 'equal',
        formula1: `"${classList}"`,
        ranges: [
          { s: { r: 1, c: 6 }, e: { r: 100, c: 6 } } // Colonne G (Classe assignée professeur)
        ],
        showErrorMessage: true,
        errorTitle: 'Classe invalide',
        error: 'Veuillez choisir une classe parmi : ' + classList
      }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const url = window.URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'utilisateurs_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // 🔥 Gestion du changement de fichier
  const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        setImportPreview(rows.slice(0, 6));
      } catch (err) {
        setImportResult({ success: false, message: 'Erreur lecture fichier: ' + err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 🔥 Importation des utilisateurs
  const handleImportUsers = async () => {
    if (!importFile) {
      setImportResult({ success: false, message: 'Veuillez sélectionner un fichier.' });
      return;
    }

    setImportLoading(true);
    setImportResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          const usersToCreate = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 3) continue;

            // 🔥 Sécurisation des accès : convertir chaque valeur en chaîne
            const email = String(row[0] || '').trim();
            const password = String(row[1] || '').trim();
            const displayName = String(row[2] || '').trim();
            const role = String(row[3] || 'student').trim().toLowerCase();
            const department = String(row[4] || '').trim();
            const className = String(row[5] || '').trim();
            const assignedClass = String(row[6] || '').trim();
            const phone = String(row[7] || '').trim();

            if (email && password && displayName) {
              const userData = { email, password, displayName, role, phone };
              if (department) userData.department = department;
              if (role === 'student' && className) userData.className = className;
              if (role === 'teacher' && assignedClass) userData.assignedClass = assignedClass;
              usersToCreate.push(userData);
            }
          }

          if (usersToCreate.length === 0) {
            setImportResult({ success: false, message: 'Aucun utilisateur valide trouvé.' });
            setImportLoading(false);
            return;
          }

          let successCount = 0;
          let failCount = 0;
          const errors = [];

          for (const user of usersToCreate) {
            try {
              // 🔥 Utiliser /users/create (pas /api/users/create car apiFetch ajoute déjà /api)
              const result = await apiFetch('/users/create', {
                method: 'POST',
                body: JSON.stringify(user)
              });
              if (result.success) {
                successCount++;
              } else {
                failCount++;
                errors.push(`${user.email}: ${result.error}`);
              }
            } catch (err) {
              failCount++;
              errors.push(`${user.email}: ${err.message}`);
            }
          }

          setImportResult({
            success: true,
            message: `${successCount} utilisateur(s) créé(s) avec succès. ${failCount} échec(s).`,
            details: errors.length > 0 ? errors : null
          });

          await loadUsers();
          setImportFile(null);
          setImportPreview([]);
          document.getElementById('import-file-input').value = '';
        } catch (err) {
          setImportResult({ success: false, message: 'Erreur: ' + err.message });
        } finally {
          setImportLoading(false);
        }
      };
      reader.readAsArrayBuffer(importFile);
    } catch (err) {
      setImportResult({ success: false, message: 'Erreur: ' + err.message });
      setImportLoading(false);
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
        <div className="overview-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={openModal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconPlus className="icon-sm" /> Ajouter un utilisateur
          </button>
          <button className="btn-secondary" onClick={() => setShowImportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconUpload className="icon-sm" /> Importer (.xlsx)
          </button>
          <button className="btn-secondary" onClick={handleExportUsers} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconDownload className="icon-sm" /> Exporter (.xlsx)
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
                        Array.isArray(user.assignedClasses) && user.assignedClasses.length > 0 ? (
                          <span style={{ color: 'var(--ynov-cyan)', fontWeight: '500' }}>{user.assignedClasses.join(', ')}</span>
                        ) : user.assignedClass ? (
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
                    <td style={{ whiteSpace: 'nowrap', width: '1%' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button className="table-action-btn" onClick={() => setViewingUser(user)} title="Voir les détails" style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconEye className="action-icon" />
                        </button>
                        <button className="table-action-btn" onClick={() => openEditModal(user)} title="Modifier les informations" style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          ✏️
                        </button>
                        <button className="table-action-btn" onClick={() => handleChangeRole(user)} title="Changer de rôle" style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconDots className="action-icon" />
                        </button>
                        {isTeacher && (
                          <button className="table-action-btn" style={{ color: '#23b2a4', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openAssignModal(user)} title="Assigner des classes">
                            📚
                          </button>
                        )}
                        <button className="table-action-btn" style={{ color: isDisabled ? '#10b981' : '#f59e0b', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleSuspendUser(user)} title={isDisabled ? "Réactiver le compte" : "Suspendre le compte"}>
                          {isDisabled ? '🔓' : '🔒'}
                        </button>
                        <button className="table-action-btn" style={{ color: '#ef4444', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleDeleteUser(user)} title="Supprimer définitivement">
                          🗑️
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

      {/* MODAL CREATION (inchangée) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><p className="modal-kicker">Nouvel accès</p><h3>Ajouter un utilisateur</h3></div>
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
                <div className="field-group"><label className="field-label">Prénom *</label><input className="field-input" type="text" name="firstName" value={formData.firstName} onChange={handleFieldChange} disabled={isSubmitting} /></div>
                <div className="field-group"><label className="field-label">Nom *</label><input className="field-input" type="text" name="lastName" value={formData.lastName} onChange={handleFieldChange} disabled={isSubmitting} /></div>
                <div className="field-group full-width"><label className="field-label">Email professionnel *</label><input className="field-input" type="email" name="email" value={formData.email} onChange={handleFieldChange} placeholder="prenom.nom@ynov.com" disabled={isSubmitting} /></div>
                <div className="field-group full-width"><label className="field-label">Mot de passe initial *</label><input className="field-input" type="password" name="password" value={formData.password} onChange={handleFieldChange} placeholder="Minimum 6 caractères" disabled={isSubmitting} minLength={6} /></div>
                <div className="field-group full-width"><label className="field-label">Téléphone</label><input className="field-input" type="tel" name="phone" value={formData.phone} onChange={handleFieldChange} placeholder="Ex : +33 6 12 34 56 78" disabled={isSubmitting} /></div>
                {selectedRole === 'student' && (
                  <div className="field-group full-width">
                    <label className="field-label">Classe *</label>
                    <select name="className" value={formData.className} onChange={handleFieldChange} className="field-input" disabled={isSubmitting}>
                      <option value="">-- Sélectionner --</option>
                      {classOptions.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
                    </select>
                  </div>
                )}
                {selectedRole === 'teacher' && (
                  <div className="field-group full-width">
                    <label className="field-label">Classe assignée *</label>
                    <select name="assignedClass" value={formData.assignedClass} onChange={handleFieldChange} className="field-input" disabled={isSubmitting}>
                      <option value="">-- Sélectionner --</option>
                      {classOptions.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
                    </select>
                  </div>
                )}
                {selectedRole === 'rh' && (
                  <div className="field-group full-width">
                    <label className="field-label">Service</label>
                    <select name="service" value={formData.service} onChange={handleFieldChange} className="field-input" disabled={isSubmitting}>
                      {serviceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
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
                <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Création...' : 'Créer le compte'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL D'ASSIGNATION DE CLASSE */}
      {showAssignModal && selectedTeacher && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="user-modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><p className="modal-kicker">Assigner des classes</p><h3>Professeur : {selectedTeacher.displayName}</h3></div>
              <button className="modal-close" onClick={() => setShowAssignModal(false)} disabled={isAssigning}>×</button>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              <div className="field-group">
                <label className="field-label">Classes assignées (cochez plusieurs)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  {classOptions.map((cls) => {
                    const isSelected = (selectedClasses || []).includes(cls);
                    return (
                      <label key={cls} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 8px', background: isSelected ? '#e0f2fe' : 'transparent', borderRadius: '4px' }}>
                        <input type="checkbox" checked={isSelected} onChange={(e) => { if (e.target.checked) { setSelectedClasses(prev => [...prev, cls]); } else { setSelectedClasses(prev => prev.filter(c => c !== cls)); } }} />
                        <span>{cls}</span>
                      </label>
                    );
                  })}
                </div>
                <small style={{ color: '#64748b' }}>Cochez toutes les classes que ce professeur doit enseigner.</small>
              </div>
              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button className="btn-secondary" onClick={() => setShowAssignModal(false)} disabled={isAssigning}>Annuler</button>
                <button className="btn-primary" onClick={() => handleAssignClass(selectedClasses)} disabled={isAssigning || selectedClasses.length === 0}>
                  {isAssigning ? 'Assignation...' : `Assigner (${selectedClasses.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL D'ÉDITION */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" style={{ maxWidth: '600px', padding: '24px', background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Modifier le compte</h3>
              <button className="modal-close" onClick={closeEditModal} disabled={isEditing} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>
            <form onSubmit={async (e) => { e.preventDefault(); setIsEditing(true); try { const uid = editingUser.uid || editingUser.id; const result = await apiFetch(`/users/${uid}`, { method: 'PATCH', body: JSON.stringify(editFormData) }); if (!result.success) throw new Error(result.error || 'Erreur'); alert('Compte modifié avec succès.'); closeEditModal(); await loadUsers(); } catch (error) { alert('Erreur : ' + error.message); } finally { setIsEditing(false); } }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="field-group"><label className="field-label">Nom complet</label><input className="field-input" type="text" value={editFormData.displayName || ''} onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })} /></div>
                <div className="field-group"><label className="field-label">Email</label><input className="field-input" type="email" value={editFormData.email || ''} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} /></div>
                <div className="field-group"><label className="field-label">Téléphone</label><input className="field-input" type="tel" value={editFormData.phone || ''} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} /></div>
                <div className="field-group"><label className="field-label">Département</label><input className="field-input" type="text" value={editFormData.department || ''} onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })} /></div>
              </div>
              {editingUser.role === 'student' && (
                <div className="field-group" style={{ marginTop: '16px' }}><label className="field-label">Classe</label><select className="field-input" value={editFormData.className || ''} onChange={(e) => setEditFormData({ ...editFormData, className: e.target.value })}><option value="">-- Sélectionner --</option>{classOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}</select></div>
              )}
              {editingUser.role === 'teacher' && (
                <div className="field-group" style={{ marginTop: '16px' }}>
                  <label className="field-label">Classes assignées (cochez plusieurs)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc' }}>
                    {classOptions.map(cls => {
                      const isChecked = (editFormData.assignedClasses || []).includes(cls);
                      return (
                        <label key={cls} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 10px', background: isChecked ? '#e0f2fe' : 'transparent', borderRadius: '4px', border: isChecked ? '1px solid #23b2a4' : '1px solid transparent' }}>
                          <input type="checkbox" checked={isChecked} onChange={(e) => { const current = editFormData.assignedClasses || []; if (e.target.checked) { setEditFormData({ ...editFormData, assignedClasses: [...current, cls] }); } else { setEditFormData({ ...editFormData, assignedClasses: current.filter(c => c !== cls) }); } }} />
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
                <button type="submit" className="btn-primary" disabled={isEditing}>{isEditing ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔥 MODAL D'IMPORT MASSIF */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" style={{ maxWidth: '650px', padding: '24px', background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Importer des utilisateurs</h3>
              <button className="modal-close" onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>

            <p style={{ color: '#64748b', marginBottom: '16px' }}>Téléchargez le template, remplissez les données, puis importez le fichier Excel.</p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={downloadTemplate}><IconDownload className="icon-sm" /> Télécharger le template</button>
              <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                <IconUpload className="icon-sm" /> Sélectionner un fichier
                <input id="import-file-input" type="file" accept=".xlsx,.xls" onChange={handleImportFileChange} style={{ display: 'none' }} />
              </label>
            </div>

            {importFile && <p style={{ marginBottom: '12px', color: '#0f172a' }}>Fichier sélectionné : <strong>{importFile.name}</strong> ({(importFile.size / 1024).toFixed(0)} Ko)</p>}

            {importPreview.length > 0 && (
              <div style={{ marginBottom: '16px', overflowX: 'auto' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>Aperçu (5 premières lignes)</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead><tr style={{ background: '#f1f5f9' }}>{importPreview[0]?.map((h, i) => <th key={i} style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
                  <tbody>{importPreview.slice(1).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>{cell}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}

            {importResult && (
              <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '16px', background: importResult.success ? '#d1fae5' : '#fee2e2', color: importResult.success ? '#065f46' : '#991b1b', border: importResult.success ? '1px solid #10b981' : '1px solid #fca5a5' }}>
                <strong>{importResult.message}</strong>
                {importResult.details && <ul style={{ marginTop: '8px', paddingLeft: '16px', fontSize: '0.85rem' }}>{importResult.details.map((err, i) => <li key={i}>{err}</li>)}</ul>}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => setShowImportModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleImportUsers} disabled={importLoading || !importFile}>
                {importLoading ? 'Importation...' : 'Importer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALISATION UTILISATEUR */}
      {viewingUser && (
        <div className="modal-overlay" onClick={() => setViewingUser(null)}>
          <div className="modal-content" style={{ maxWidth: '540px', padding: '24px', background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Détails de l'utilisateur</h3>
              <button className="modal-close" onClick={() => setViewingUser(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', color: '#1e293b' }}>
              <div><strong>Nom complet :</strong> {viewingUser.displayName || '—'}</div>
              <div><strong>Email :</strong> {viewingUser.email || '—'}</div>
              <div><strong>Rôle :</strong> <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>{getRoleLabel(viewingUser.role)}</span></div>
              {viewingUser.department && <div><strong>Département :</strong> {viewingUser.department}</div>}
              {viewingUser.className && <div><strong>Classe :</strong> {viewingUser.className}</div>}
              {viewingUser.assignedClass && <div><strong>Classe assignée :</strong> {viewingUser.assignedClass}</div>}
              {viewingUser.assignedClasses && viewingUser.assignedClasses.length > 0 && (
                <div><strong>Classes enseignées :</strong> {viewingUser.assignedClasses.join(', ')}</div>
              )}
              <div><strong>Téléphone :</strong> {viewingUser.phone || '—'}</div>
              <div><strong>Date d'inscription :</strong> {formatDate(viewingUser.createdAt)}</div>
              <div><strong>Statut du compte :</strong> <span style={{ color: viewingUser.disabled ? '#ef4444' : '#10b981', fontWeight: 600 }}>{viewingUser.disabled ? 'Suspendu / Inactif' : 'Actif'}</span></div>
              <div><strong>Identifiant unique (UID) :</strong> <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{viewingUser.uid || viewingUser.id}</code></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button className="btn-secondary" onClick={() => setViewingUser(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}