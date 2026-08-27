import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api/api';
import './DataTermsPage.css';

export default function DataTermsPage() {
  const { user, refreshBackendUser, logout } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleAccept = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiFetch('/auth/accept-data-terms', {
        method: 'POST',
        body: JSON.stringify({ accepted: true }),
      });

      if (!result.success) {
        throw new Error(result.error || 'Impossible d’enregistrer votre acceptation.');
      }

      await refreshBackendUser();
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (acceptError) {
      console.error('Erreur lors de l’acceptation des conditions :', acceptError);
      setError(acceptError.message || 'Impossible d’enregistrer votre acceptation.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout>
      <div className="data-terms-page">
        <p className="data-terms-eyebrow">Première connexion</p>
        <h2>Conditions d’utilisation des données</h2>
        <p className="ynov-subtitle">
          Pour accéder à votre espace Ynov, veuillez prendre connaissance des règles suivantes.
        </p>

        <div className="data-terms-content">
          <p>Vos données sont utilisées uniquement pour :</p>
          <ul>
            <li>gérer votre compte et vos accès à la plateforme ;</li>
            <li>vous permettre d’utiliser les services liés à votre profil ;</li>
            <li>assurer la sécurité et le bon fonctionnement du service.</li>
          </ul>
          <p>Elles sont accessibles uniquement aux personnes habilitées et conservées pendant la durée nécessaire à ces usages.</p>
        </div>

        {error && <div className="ynov-alert-error" role="alert">{error}</div>}

        <form onSubmit={handleAccept} className="data-terms-form">
          <label className="data-terms-checkbox">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              disabled={loading}
              required
            />
            <span>J’ai lu et j’accepte l’utilisation de mes données dans le cadre présenté ci-dessus.</span>
          </label>

          <button type="submit" className="ynov-submit-btn" disabled={!accepted || loading}>
            {loading ? 'Enregistrement...' : 'Accepter et continuer'}
          </button>
        </form>

        <button type="button" className="data-terms-logout" onClick={handleLogout} disabled={loading}>
          Se déconnecter
        </button>

        <p className="data-terms-account">Compte connecté : {user?.email || 'Utilisateur'}</p>
      </div>
    </AuthLayout>
  );
}
