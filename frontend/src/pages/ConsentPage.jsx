import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api/api';

export default function ConsentPage() {
  const { refreshBackendUser, logout } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!accepted) return setError('Vous devez accepter les conditions pour accéder à l’application.');
    setLoading(true); setError('');
    try { const result = await apiFetch('/auth/consent', { method: 'POST', body: JSON.stringify({ version: '2026-09' }) }); if (!result.success) throw new Error(result.error); await refreshBackendUser(); } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  return <main style={{ maxWidth: 760, margin: '60px auto', padding: 32, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}><h1>Conditions d’utilisation et protection des données</h1><p>Ynov traite vos données d’identité, de scolarité, de planning, d’absences et de documents uniquement pour gérer votre compte, la présence, le suivi pédagogique et les obligations administratives.</p><p>Les accès sont limités selon votre rôle. Vos données sont conservées pendant la durée nécessaire à ces finalités et vous pouvez exercer vos droits d’accès, rectification ou suppression auprès de l’administration.</p><label style={{ display: 'flex', gap: 10, margin: '24px 0' }}><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />J’ai lu et j’accepte ces conditions.</label>{error && <p style={{ color: '#b91c1c' }}>{error}</p>}<button onClick={submit} disabled={loading} className="btn-primary">{loading ? 'Enregistrement…' : 'Accepter et continuer'}</button><button onClick={logout} style={{ marginLeft: 12 }}>Refuser et se déconnecter</button></main>;
}
