import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../api/api';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../auth/AuthContext';

export default function TwoFactorLoginPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userId = location.state?.userId || null;
  const { refreshBackendUser } = useAuth();

  useEffect(() => {
    if (!userId) {
      setError('Session invalide. Veuillez vous reconnecter.');
    }
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      setError('Session invalide.');
      return;
    }
    if (code.length !== 6) {
      setError('Veuillez entrer un code à 6 chiffres.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/auth/2fa/verify-login', {
        method: 'POST',
        body: JSON.stringify({ userId, token: code })
      });
      if (data.success) {
        await refreshBackendUser();
        // Rediriger vers le dashboard
        navigate('/dashboard', { replace: true });
      } else {
        setError(data.error || 'Code invalide.');
      }
    } catch (err) {
      setError('Erreur de connexion : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2>Authentification à double facteur</h2>
      <p className="ynov-subtitle">Entrez le code généré par votre application d'authentification.</p>

      {error && <div className="ynov-alert-error" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="ynov-form">
        <div className="form-group">
          <label htmlFor="code">Code à 6 chiffres</label>
          <input
            type="text"
            id="code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoComplete="one-time-code"
            required
          />
        </div>

        <button type="submit" className="ynov-submit-btn" disabled={loading}>
          {loading ? 'Vérification...' : 'Vérifier'}
        </button>
      </form>
    </AuthLayout>
  );
}
