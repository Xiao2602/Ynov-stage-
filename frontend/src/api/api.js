import { auth } from "../auth/firebase";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

/*
|--------------------------------------------------------------------------
| API JSON
|--------------------------------------------------------------------------
*/

export async function apiFetch(
  endpoint,
  options = {}
) {
  const user =
    auth.currentUser;

  if (!user) {
    throw new Error(
      "Utilisateur non authentifié."
    );
  }

  const token =
    await user.getIdToken();

  const headers = {
    ...(options.headers || {}),
    Authorization:
      `Bearer ${token}`
  };

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers["Content-Type"] =
      "application/json";
  }

  const response =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers
      }
    );

  if (!response.ok) {
    let errorMessage =
      `Erreur HTTP ${response.status}`;

    try {
      const data =
        await response.json();

      errorMessage =
        data.error ||
        data.message ||
        errorMessage;

    } catch {
      // réponse non JSON
    }

    throw new Error(
      errorMessage
    );
  }

  if (
    response.status === 204
  ) {
    return null;
  }

  return response.json();
}

/*
|--------------------------------------------------------------------------
| API BINAIRE
|--------------------------------------------------------------------------
|
| Utilisé pour consulter les PDF/JPG.
|--------------------------------------------------------------------------
*/

export async function apiFetchBlob(
  endpoint,
  options = {}
) {
  const user =
    auth.currentUser;

  if (!user) {
    throw new Error(
      "Utilisateur non authentifié."
    );
  }

  const token =
    await user.getIdToken();

  const headers = {
    ...(options.headers || {}),
    Authorization:
      `Bearer ${token}`
  };

  const response =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers
      }
    );

  if (!response.ok) {
    let errorMessage =
      `Erreur HTTP ${response.status}`;

    try {
      const data =
        await response.json();

      errorMessage =
        data.error ||
        data.message ||
        errorMessage;

    } catch {
      // réponse binaire ou non JSON
    }

    throw new Error(
      errorMessage
    );
  }

  return response.blob();
}

export {
  API_URL
};