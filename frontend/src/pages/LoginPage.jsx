import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import AuthLayout from '../components/AuthLayout';
import { auth } from '../auth/firebase';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [tempUserId, setTempUserId] = useState('');
  const [uid, setUid] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { refreshBackendUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Veuillez saisir une adresse e-mail valide.');
      return;
    }

    setLoading(true);

    try {
      // 1. Connexion Firebase
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      await credential.user.getIdToken(true);

      // 2. Vérification 2FA auprès du backend
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password })
      });

      if (response.requiresTwoFactor) {
        // Rediriger vers l'étape 2FA
        setTempUserId(response.tempUserId);
        setTwoFactorStep(true);
        setUid(credential.user.uid);
        setLoading(false);
        return;
      }

      // Pas de 2FA requise
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError(err.message || 'Échec de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiFetch('/auth/2fa/verify-login', {
        method: 'POST',
        body: JSON.stringify({ token: twoFactorCode, tempUserId })
      });

      if (response.success) {
        await refreshBackendUser();
        // Connexion réussie
        const destination = location.state?.from?.pathname || '/dashboard';
        navigate(destination, { replace: true });
      } else {
        setError(response.error || 'Code 2FA invalide.');
      }
    } catch (err) {
      setError('Erreur lors de la vérification 2FA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {!twoFactorStep ? (
        <>
          <h2>Espace Connexion</h2>
          <p className="ynov-subtitle">Accédez à votre portail</p>

          {error && <div className="ynov-alert-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="ynov-form">
            <div className="form-group">
              <label htmlFor="email">Adresse e-mail Ynov</label>
              <input
                type="email"
                id="email"
                placeholder="prenom.nom@ynov.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="form-actions">
              <Link to="/forgot-password" className="forgot-link">
                Mot de passe oublié ?
              </Link>
            </div>

            <button type="submit" className="ynov-submit-btn" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </>
      ) : (
        <>
          <h2>Authentification à double facteur</h2>
          <p className="ynov-subtitle">Entrez le code généré par votre application d'authentification.</p>

          {error && <div className="ynov-alert-error" role="alert">{error}</div>}

          <form onSubmit={handleTwoFactorSubmit} className="ynov-form">
            <div className="form-group">
              <label htmlFor="2fa-code">Code à 6 chiffres</label>
              <input
                type="text"
                id="2fa-code"
                placeholder="123456"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                autoComplete="one-time-code"
                required
                pattern="[0-9]{6}"
                maxLength="6"
              />
            </div>

            <button type="submit" className="ynov-submit-btn" disabled={loading}>
              {loading ? 'Vérification...' : 'Vérifier le code'}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
