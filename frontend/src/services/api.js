import { auth } from '../auth/firebase';

export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function buildUrl(baseUrl, endpoint) {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  if (cleanBase.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    return `${cleanBase}${cleanEndpoint.slice(4)}`;
  }
  if (!cleanBase.endsWith('/api') && !cleanEndpoint.startsWith('/api/')) {
    return `${cleanBase}/api${cleanEndpoint}`;
  }
  return `${cleanBase}${cleanEndpoint}`;
}

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

  const requestUrl = buildUrl(API_URL, endpoint);

  console.log('[API] Requête :', {
    method: options.method || 'GET',
    url: requestUrl,
    isFormData,
  });

  const response = await fetch(
    requestUrl,
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