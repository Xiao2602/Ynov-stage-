import { auth } from '../auth/firebase';

export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function apiFetch(endpoint, options = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Utilisateur non authentifié.');
  }

  const token = await user.getIdToken();

  const isFormData =
    options.body instanceof FormData;

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  // NE JAMAIS définir Content-Type manuellement
  // lorsqu'on utilise FormData.
  if (
    options.body &&
    !isFormData &&
    !headers['Content-Type']
  ) {
    headers['Content-Type'] = 'application/json';
  }

  console.log('[API] Requête :', {
    method: options.method || 'GET',
    url: `${API_URL}${endpoint}`,
    isFormData,
  });

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  console.log(
    '[API] Réponse :',
    response.status,
    response.statusText
  );

  let data = null;

  const contentType =
    response.headers.get('content-type') || '';

  if (
    contentType.includes('application/json')
  ) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    console.error(
      '[API] Erreur serveur :',
      data
    );

    const message =
      typeof data === 'object'
        ? (
            data.error ||
            data.message ||
            `Erreur HTTP ${response.status}`
          )
        : (
            data ||
            `Erreur HTTP ${response.status}`
          );

    throw new Error(message);
  }

  console.log(
    '[API] Succès :',
    data
  );

  return data;
}