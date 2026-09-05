import { auth } from '../auth/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getValidToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Utilisateur non authentifié. Veuillez vous reconnecter.');
  try {
    return await user.getIdToken(true);
  } catch {
    throw new Error("Impossible de récupérer le jeton d'authentification.");
  }
};

async function request(endpoint, options = {}, expectBlob = false) {
  const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(4) : endpoint;
  const url = `${API_URL}${cleanEndpoint.startsWith('/') ? '' : '/'}${cleanEndpoint}`;
  const headersFor = (token) => ({
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
  });
  let response = await fetch(url, { ...options, headers: headersFor(await getValidToken()) });
  if (response.status === 401) response = await fetch(url, { ...options, headers: headersFor(await getValidToken()) });
  if (!response.ok) {
    let message = `Erreur HTTP ${response.status}`;
    try { const data = await response.json(); message = data.error || data.message || message; } catch { /* réponse non JSON */ }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return expectBlob ? response.blob() : response.json();
}

export const apiFetch = (endpoint, options = {}) => request(endpoint, options, false);
export const apiFetchBlob = (endpoint, options = {}) => request(endpoint, options, true);
export { API_URL };
