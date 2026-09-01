import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
  IconCamera, 
  IconCheckCircle, 
  IconEdit, 
  IconUser, 
  IconClock,
  IconX 
} from '../components/Icons';
import { apiFetch } from '../api/api';
import './ProfilePage.css';

const PROFILE_IMAGE_KEY = 'ynov-profile-photo';

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

  // 🔥 ÉTATS POUR 2FA
  const [twoFactor, setTwoFactor] = useState({ enabled: false, qrCode: '', secret: '' });
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');

  useEffect(() => {
    const savedProfile = JSON.parse(localStorage.getItem('ynov-profile-data') || '{}');
    setFormData({
      name: defaultName,
      department: backendUser?.department || '',
      phone: backendUser?.phone || '',
      profileRole: role || 'employee',
    });
    // 🔥 Récupérer l'état 2FA depuis le contexte
    if (user) {
      setTwoFactor(prev => ({ ...prev, enabled: user.twoFactorEnabled || false }));
    }
  }, [backendUser, defaultName, role, user]);

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
      const isAdminOrStaff = ['admin', 'rh', 'employee', 'manager'].includes(role);

      if (isAdminOrStaff) {
        const result = await apiFetch(`/users/${user?.uid}`, {
          method: 'PATCH',
          body: JSON.stringify({
            displayName: formData.name,
            department: formData.department,
            phone: formData.phone,
          }),
        });

        if (!result.success) throw new Error(result.error || 'Erreur');
        setSuccessMessage('Vos informations ont été mises à jour avec succès.');
      } else {
        const result = await apiFetch('/profile/request', {
          method: 'POST',
          body: JSON.stringify({
            requestedChanges: {
              name: formData.name,
              department: formData.department,
              phone: formData.phone,
            },
            reason: 'Mise à jour demandée par l\'utilisateur'
          }),
        });

        if (!result.success) throw new Error(result.error || 'Erreur');
        setSuccessMessage('Votre demande de modification a été transmise à l\'administration pour validation.');
      }

      setIsEditing(false);
      setIsSaved(true);
      window.setTimeout(() => setIsSaved(false), 6000);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement :", error);
      alert("Une erreur est survenue lors de l'enregistrement : " + (error.message || error));
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

  // 🔥 FONCTIONS 2FA
  const handleSetup2FA = async () => {
    console.log("🔐 Demande de setup 2FA");
    setTwoFactorError('');
    try {
      const data = await apiFetch('/auth/2fa/setup');
      console.log("📥 Réponse setup 2FA:", data);
      if (data.success) {
        setTwoFactor({ ...twoFactor, qrCode: data.qrCodeUrl, secret: data.secret });
      } else {
        setTwoFactorError(data.error || 'Erreur setup 2FA');
      }
    } catch (err) {
      console.error("❌ Erreur setup 2FA:", err);
      setTwoFactorError('Erreur: ' + err.message);
    }
  };

  const handleEnable2FA = async () => {
    if (!twoFactorToken) {
      setTwoFactorError('Entrez le code généré par Google Authenticator.');
      return;
    }
    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      console.log("🔐 Activation 2FA avec token:", twoFactorToken);
      const data = await apiFetch('/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ token: twoFactorToken })
      });
      console.log("📥 Réponse activation 2FA:", data);
      if (data.success) {
        alert('✅ 2FA activée !');
        setTwoFactor({ ...twoFactor, enabled: true, qrCode: '' });
        setTwoFactorToken('');
      } else {
        setTwoFactorError(data.error || 'Erreur activation');
      }
    } catch (err) {
      console.error("❌ Erreur enable 2FA:", err);
      setTwoFactorError('Erreur: ' + err.message);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!twoFactorToken) {
      setTwoFactorError('Entrez votre code actuel pour désactiver.');
      return;
    }
    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      console.log("🔐 Désactivation 2FA avec token:", twoFactorToken);
      const data = await apiFetch('/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ token: twoFactorToken })
      });
      console.log("📥 Réponse désactivation 2FA:", data);
      if (data.success) {
        alert('✅ 2FA désactivée.');
        setTwoFactor({ ...twoFactor, enabled: false });
        setTwoFactorToken('');
      } else {
        setTwoFactorError(data.error || 'Erreur désactivation');
      }
    } catch (err) {
      console.error("❌ Erreur disable 2FA:", err);
      setTwoFactorError('Erreur: ' + err.message);
    } finally {
      setTwoFactorLoading(false);
    }
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

          {/* 🔥 SECTION 2FA */}
          <div className="profile-2fa-section" style={{ 
            marginTop: '2rem', 
            paddingTop: '2rem', 
            borderTop: '1px solid #e2e8f0' 
          }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: '600' }}>
              🔐 Authentification à double facteur
            </h3>
            <p style={{ color: 'var(--ynov-text-muted)', marginBottom: '1rem' }}>
              {twoFactor.enabled ? '✅ 2FA activée' : '❌ 2FA désactivée'}
            </p>
            {twoFactorError && (
              <div style={{ 
                color: '#ef4444', 
                marginBottom: '1rem', 
                padding: '8px 12px', 
                background: '#fef2f2', 
                borderRadius: '6px',
                border: '1px solid #fca5a5'
              }}>
                ⚠️ {twoFactorError}
              </div>
            )}
            {!twoFactor.enabled ? (
              <>
                {!twoFactor.qrCode ? (
                  <button 
                    className="profile-edit-button" 
                    onClick={handleSetup2FA} 
                    disabled={twoFactorLoading}
                    style={{ 
                      padding: '8px 20px',
                      background: 'var(--ynov-cyan)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      opacity: twoFactorLoading ? 0.6 : 1
                    }}
                  >
                    {twoFactorLoading ? 'Chargement...' : 'Configurer 2FA'}
                  </button>
                ) : (
                  <div style={{ marginTop: '1rem' }}>
                    <p>Scannez ce QR code avec Google Authenticator :</p>
                    <img 
                      src={twoFactor.qrCode} 
                      alt="QR Code 2FA" 
                      style={{ width: '200px', height: '200px', margin: '1rem 0' }} 
                    />
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Code secret : <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{twoFactor.secret}</code>
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="Code à 6 chiffres"
                        value={twoFactorToken}
                        onChange={(e) => setTwoFactorToken(e.target.value)}
                        style={{ 
                          padding: '8px 12px', 
                          borderRadius: '6px', 
                          border: '1.5px solid #e2e8f0',
                          width: '150px',
                          fontSize: '0.95rem'
                        }}
                      />
                      <button 
                        className="profile-save-button" 
                        onClick={handleEnable2FA} 
                        disabled={twoFactorLoading}
                        style={{
                          padding: '8px 20px',
                          background: 'var(--ynov-cyan)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          opacity: twoFactorLoading ? 0.6 : 1
                        }}
                      >
                        {twoFactorLoading ? 'Activation...' : 'Activer'}
                      </button>
                      <button 
                        className="profile-cancel-button" 
                        onClick={() => setTwoFactor({ ...twoFactor, qrCode: '', secret: '' })}
                        style={{
                          padding: '8px 16px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          background: 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <p style={{ color: '#64748b', marginBottom: '8px' }}>
                  Pour désactiver, entrez votre code actuel :
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Code à 6 chiffres"
                    value={twoFactorToken}
                    onChange={(e) => setTwoFactorToken(e.target.value)}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      border: '1.5px solid #e2e8f0',
                      width: '150px',
                      fontSize: '0.95rem'
                    }}
                  />
                  <button 
                    className="profile-cancel-button" 
                    onClick={handleDisable2FA} 
                    disabled={twoFactorLoading}
                    style={{
                      padding: '8px 20px',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      opacity: twoFactorLoading ? 0.6 : 1
                    }}
                  >
                    {twoFactorLoading ? 'Désactivation...' : 'Désactiver 2FA'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}