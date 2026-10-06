import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api/api';
import AuthLayout from '../components/AuthLayout';
import './ConsentPage.css';

export default function ConsentPage() {
  const { refreshBackendUser, logout } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    if (!accepted) {
      setError('Vous devez accepter les conditions pour accéder à l’application.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await apiFetch('/auth/consent', {
        method: 'POST',
        body: JSON.stringify({ version: '2026-09' }),
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      await refreshBackendUser();
    } catch (e) {
      setError(e.message || 'Une erreur est survenue pendant l’enregistrement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="consent-page">
        <header className="consent-header">
          <p className="consent-kicker">Première connexion</p>
          <h2>Bienvenue sur Ynov Campus</h2>
          <p className="ynov-subtitle">
            Avant de poursuivre, veuillez lire et accepter les conditions d’utilisation de la plateforme.
          </p>
        </header>

        <div className="consent-summary">
          <div className="consent-summary-header">
            <h3>Protection des données</h3>
            <span className="consented-badge">Confidentialité</span>
          </div>

          <ul className="consent-list">
            <li>Ynov traite vos données d’identité, de scolarité, de planning, d’absences et de documents pour gérer votre compte et votre parcours académique.</li>
            <li>Les accès sont limités selon votre rôle et votre statut au sein de l’établissement.</li>
            <li>Vos informations sont conservées uniquement pendant la durée nécessaire aux finalités pédagogiques et administratives.</li>
          </ul>
        </div>

        <form onSubmit={submit} className="ynov-form consent-form">
          <label className="consent-checkbox">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              J’ai lu et j’accepte les conditions d’utilisation ainsi que la politique de protection des données.
            </span>
          </label>

          {error && (
            <div className="ynov-alert-error" role="alert">
              {error}
            </div>
          )}

          <div className="consent-actions">
            <button type="button" className="ynov-secondary-btn" onClick={logout}>
              Refuser et se déconnecter
            </button>
            <button type="submit" className="ynov-submit-btn" disabled={loading}>
              {loading ? 'Enregistrement…' : 'Accepter et continuer'}
            </button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
