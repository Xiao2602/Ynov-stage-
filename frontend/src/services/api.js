import { auth } from '../auth/firebase';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiFetch(endpoint, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Utilisateur non authentifié.');
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${await user.getIdToken()}`,
  };
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(typeof data === 'object' ? data.error || data.message || `Erreur HTTP ${response.status}` : data || `Erreur HTTP ${response.status}`);
  }
  return data;
}
