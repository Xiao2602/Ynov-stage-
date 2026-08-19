import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { IconCamera, IconCheckCircle, IconEdit, IconUser, IconClock } from '../components/Icons';
import { requestProfileUpdate, adminUpdateProfile } from '../services/profileApi';
import './ProfilePage.css';

const PROFILE_IMAGE_KEY = 'ynov-profile-photo';
const PROFILE_DATA_KEY = 'ynov-profile-data';

const roleLabels = {
  admin: 'Administrateur',
  rh: 'Ressources humaines',
  manager: 'Manager',
  employee: 'Personnel',
  student: 'Étudiant',
  teacher: 'Professeur',
  parent: 'Parent',
};

function getInitials(name = '', email = '') {
  const source = name.trim() || email.split('@')[0] || 'Utilisateur';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : source.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const { user, backendUser, role } = useAuth();
  const fileInputRef = useRef(null);
  const email = user?.email || backendUser?.email || '';
  const defaultName = user?.displayName
    || (backendUser?.firstName && backendUser?.lastName
      ? `${backendUser.firstName} ${backendUser.lastName}`
      : email.split('@')[0] || 'Utilisateur');
  const storedProfile = JSON.parse(localStorage.getItem(PROFILE_DATA_KEY) || '{}');
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem(PROFILE_IMAGE_KEY) || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [formData, setFormData] = useState({
    name: defaultName,
    department: backendUser?.department || '',
    phone: backendUser?.phone || '',
    profileRole: role || 'employee',
  });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const savedProfile = JSON.parse(localStorage.getItem(PROFILE_DATA_KEY) || '{}');
    setFormData({
      name: defaultName,
      department: backendUser?.department || '',
      phone: backendUser?.phone || '',
      profileRole: role || 'employee',
    });
  }, [backendUser, defaultName, role]);

  const handleImageChange = (event) => {
    const [file] = event.target.files;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      localStorage.setItem(PROFILE_IMAGE_KEY, reader.result);
      setProfileImage(reader.result);
      window.dispatchEvent(new Event('profile-photo-updated'));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const updateData = {
        name: formData.name,
        department: formData.department,
        phone: formData.phone,
        // On ne met pas à jour le rôle via cette interface
      };

      if (role === 'admin') {
        await adminUpdateProfile(backendUser?.uid || user?.uid, updateData);
        setSuccessMessage('Vos informations ont été mises à jour.');
        // Update local storage just for UI consistency if needed, but not strictly necessary if we refresh backendUser
        localStorage.setItem(PROFILE_DATA_KEY, JSON.stringify(formData));
      } else {
        await requestProfileUpdate(updateData);
        setFormData({
          name: defaultName,
          department: backendUser?.department || '',
          phone: backendUser?.phone || '',
          profileRole: role || 'employee',
        });
        setSuccessMessage('Votre demande de modification a été envoyée à l\'administrateur.');
      }

      setIsEditing(false);
      setIsSaved(true);
      window.setTimeout(() => setIsSaved(false), 5000);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement :", error);
      alert("Une erreur est survenue lors de l'enregistrement de vos informations.");
    }
  };

  const handleCancel = () => {
    setFormData({
      name: defaultName,
      department: backendUser?.department || '',
      phone: backendUser?.phone || '',
      profileRole: role || 'employee',
    });
    setIsEditing(false);
  };

  const displayName = formData.name || defaultName;
  const displayRole = roleLabels[formData.profileRole] || formData.profileRole || 'Utilisateur';
  const children = Array.isArray(backendUser?.children) ? backendUser.children : [];

  return (
    <section className="profile-page">
      <header className="profile-page-header">
        <div>
          <p className="profile-eyebrow">Mon espace</p>
          <h1>Mon profil</h1>
          <p>Gérez vos informations personnelles et votre identité sur la plateforme.</p>
        </div>
        {!isEditing && (
          <button className="profile-edit-button" type="button" onClick={() => setIsEditing(true)}>
            <span className="profile-button-icon"><IconEdit /></span>
            Modifier le profil
          </button>
        )}
      </header>

      {isSaved && (
        <div className="profile-success" role="status">
          <span>{role === 'admin' ? <IconCheckCircle /> : <IconClock />}</span>
          {successMessage}
        </div>
      )}

      <div className="profile-grid">
        <article className="profile-summary-card">
          <div className="profile-photo-wrap">
            <button
              className="profile-photo-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Modifier la photo de profil"
            >
              {profileImage ? (
                <img src={profileImage} alt={`Portrait de ${displayName}`} />
              ) : (
                <span className="profile-initials">{getInitials(displayName, email)}</span>
              )}
              <span className="profile-photo-overlay">
                <span className="profile-camera-icon"><IconCamera /></span>
                <span>Modifier la photo</span>
              </span>
            </button>
            <input ref={fileInputRef} className="profile-file-input" type="file" accept="image/*" onChange={handleImageChange} />
          </div>
          <h2>{displayName}</h2>
          <span className="profile-role-badge">{displayRole}</span>
          <div className="profile-summary-divider" />
          <div className="profile-summary-item">
            <span className="profile-summary-label">Adresse e-mail</span>
            <strong>{email || 'Non renseignée'}</strong>
          </div>
          {formData.profileRole === 'parent' ? (
            <div className="profile-summary-item">
              <span className="profile-summary-label">Enfants suivis</span>
              <strong>{children.length || 'Aucun enfant renseigné'}</strong>
            </div>
          ) : (
            <div className="profile-summary-item">
              <span className="profile-summary-label">Département</span>
              <strong>{formData.department || 'Non renseigné'}</strong>
            </div>
          )}
        </article>

        <article className="profile-details-card">
          <div className="profile-card-heading">
            <div>
              <p className="profile-eyebrow">Informations</p>
              <h2>Informations personnelles</h2>
            </div>
            <span className="profile-heading-icon"><IconUser /></span>
          </div>

          <div className="profile-form-grid">
            <label className="profile-field profile-field-wide">
              <span>Nom complet</span>
              <input name="name" type="text" value={formData.name} onChange={handleFieldChange} disabled={!isEditing} />
            </label>
            <label className="profile-field">
              <span>Adresse e-mail <em>Non modifiable</em></span>
              <input type="email" value={email} disabled />
            </label>
            <label className="profile-field">
              <span>Rôle <em>Non modifiable</em></span>
              <input type="text" value={displayRole} disabled />
            </label>
            {formData.profileRole !== 'parent' && (
              <label className="profile-field">
                <span>Département</span>
                <input name="department" type="text" value={formData.department} onChange={handleFieldChange} disabled={!isEditing} placeholder="Ex. Informatique" />
              </label>
            )}
            <label className="profile-field">
              <span>Téléphone</span>
              <input name="phone" type="tel" value={formData.phone} onChange={handleFieldChange} disabled={!isEditing} placeholder="Ex. 06 00 00 00 00" />
            </label>
          </div>

          {formData.profileRole === 'parent' && (
            <div className="profile-children-summary">
              <span className="profile-summary-label">Enfants associés</span>
              {children.length > 0 ? (
                <ul>
                  {children.map((child, index) => (
                    <li key={`${child.name}-${index}`}>
                      {child.name || 'Enfant sans nom'}
                      {(child.level || child.field) && <small>{[child.level, child.field].filter(Boolean).join(' · ')}</small>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Aucun enfant associé à ce profil.</p>
              )}
            </div>
          )}

          {isEditing && (
            <div className="profile-form-actions">
              <button className="profile-cancel-button" type="button" onClick={handleCancel}>Annuler</button>
              <button className="profile-save-button" type="button" onClick={handleSave}>Enregistrer</button>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}