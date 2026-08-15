import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import AuthLayout from '../components/AuthLayout';
import { auth } from '../auth/firebase';
import { isYnovEmail } from '../shared/emailValidation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!isYnovEmail(normalizedEmail)) {
      setError('Seules les adresses e-mail @ynov.com sont autorisées.');
      return;
    }

    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);

      // Force-refresh so the backend sees the latest Custom Claims.
      await credential.user.getIdToken(true);

      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Erreur de connexion Firebase:', err);

      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          setError('Adresse e-mail ou mot de passe incorrect.');
          break;
        case 'auth/invalid-email':
          setError('Veuillez saisir une adresse e-mail valide.');
          break;
        case 'auth/user-disabled':
          setError('Ce compte a été désactivé.');
          break;
        case 'auth/too-many-requests':
          setError('Trop de tentatives. Veuillez patienter quelques instants.');
          break;
        default:
          setError('Impossible de se connecter. Vérifiez que le backend est démarré puis réessayez.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
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
    </AuthLayout>
  );
}
