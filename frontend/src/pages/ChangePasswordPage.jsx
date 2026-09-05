import React, { useState } from 'react';
import { apiFetch } from '../api/api';

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (newPassword.length < 8) {
      setError(
        'Le nouveau mot de passe doit contenir au moins 8 caractères.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        'Les deux mots de passe ne correspondent pas.'
      );
      return;
    }

    try {
      setLoading(true);

      const result = await apiFetch(
        '/auth/change-password',
        {
          method: 'POST',
          body: JSON.stringify({
            newPassword
          })
        }
      );

      if (!result.success) {
        throw new Error(
          result.error ||
          'Impossible de modifier le mot de passe.'
        );
      }

      setSuccess(
        'Votre mot de passe a été modifié avec succès.'
      );

      setNewPassword('');
      setConfirmPassword('');

    } catch (err) {
      console.error(
        'Erreur changement mot de passe:',
        err
      );

      setError(err.message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="dashboard-scroll-area"
      style={{
        height: '100%',
        overflowY: 'auto'
      }}
    >
      <div className="overview-header">
        <div>
          <h2 className="overview-title">
            Sécurité
          </h2>

          <p className="overview-subtitle">
            Modifiez le mot de passe de votre compte.
          </p>
        </div>
      </div>

      <div
        className="panel"
        style={{
          maxWidth: '600px',
          marginTop: '24px'
        }}
      >
        <div className="panel-header">
          <h3 className="panel-title">
            Modifier mon mot de passe
          </h3>
        </div>

        <form
          onSubmit={handleSubmit}
          className="user-form"
          style={{ padding: '24px' }}
        >
          <div className="field-group">
            <label className="field-label">
              Nouveau mot de passe
            </label>

            <input
              className="field-input"
              type="password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              placeholder="Minimum 8 caractères"
              disabled={loading}
            />
          </div>

          <div className="field-group">
            <label className="field-label">
              Confirmer le nouveau mot de passe
            </label>

            <input
              className="field-input"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Répétez le nouveau mot de passe"
              disabled={loading}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: '#fef2f2',
                color: '#b91c1c'
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: '#f0fdf4',
                color: '#15803d'
              }}
            >
              {success}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading
                ? 'Modification...'
                : 'Modifier le mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}