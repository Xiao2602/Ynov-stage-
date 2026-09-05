import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import AuthLayout from '../components/AuthLayout';
import { auth } from '../auth/firebase';
import { isYnovEmail } from '../shared/emailValidation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      await sendPasswordResetEmail(auth, normalizedEmail);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Erreur de réinitialisation :', err);

      // Message volontairement générique pour éviter de révéler
      // si une adresse existe ou non dans Firebase.
      if (err.code === 'auth/invalid-email') {
        setError('Veuillez saisir une adresse e-mail valide.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Trop de demandes. Veuillez patienter avant de réessayer.');
      } else {
        setError('Impossible d’envoyer le lien. Vérifiez l’adresse puis réessayez.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2>Mot de passe oublié ?</h2>
      <p className="ynov-subtitle">
        Saisissez votre adresse e-mail Ynov pour recevoir un lien de réinitialisation.
      </p>

      {error && <div className="ynov-alert-error" role="alert">{error}</div>}

      {isSubmitted ? (
        <div className="ynov-alert-success">
          <p>
            Si un compte Ynov correspond à cette adresse, un lien de réinitialisation
            vient d’être envoyé à <strong>{email}</strong>.
          </p>
          <button
            type="button"
            className="ynov-secondary-btn"
            onClick={() => {
              setIsSubmitted(false);
              setEmail('');
              setError('');
            }}
          >
            Renvoyer à une autre adresse
          </button>
        </div>
      ) : (
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

          <button type="submit" className="ynov-submit-btn" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>
      )}

      <div className="form-footer">
        <Link to="/" className="back-link">← Retour à la connexion</Link>
      </div>
    </AuthLayout>
  );
}
