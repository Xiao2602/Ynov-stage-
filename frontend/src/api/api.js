import { auth } from "../auth/firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getValidToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.error("❌ Aucun utilisateur connecté");
    throw new Error("Utilisateur non authentifié. Veuillez vous reconnecter.");
  }
  try {
    const token = await user.getIdToken(true);
    console.log(`✅ Token récupéré (longueur: ${token.length})`);
    return token;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du token:", error);
    throw new Error("Impossible de récupérer le token d'authentification.");
  }
};

export async function apiFetch(endpoint, options = {}) {
  try {
    const token = await getValidToken();
    const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(4) : endpoint;
    const url = `${API_URL}${cleanEndpoint.startsWith('/') ? '' : '/'}${cleanEndpoint}`;
    console.log(`🌐 [apiFetch] ${options.method || 'GET'} ${url}`);
    
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };

    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    console.log(`📨 [apiFetch] Status: ${response.status}`);

    if (response.status === 401) {
      console.warn("⚠️ Token expiré, tentative de rafraîchissement...");
      const newToken = await getValidToken();
      const newHeaders = {
        ...(options.headers || {}),
        Authorization: `Bearer ${newToken}`
      };
      const retryResponse = await fetch(url, {
        ...options,
        headers: newHeaders
      });
      if (retryResponse.ok) {
        if (retryResponse.status === 204) return null;
        return retryResponse.json();
      }
      throw new Error(`Erreur HTTP ${retryResponse.status} après rafraîchissement`);
    }

    if (!response.ok) {
      let errorMessage = `Erreur HTTP ${response.status}`;
      try {
        const data = await response.json();
        errorMessage = data.error || data.message || errorMessage;
      } catch { /* ignore */ }
      throw new Error(errorMessage);
    }

    if (response.status === 204) return null;
    return response.json();
  } catch (error) {
    console.error("❌ apiFetch error:", error);
    throw error;
  }
}

export async function apiFetchBlob(endpoint, options = {}) {
  try {
    const token = await getValidToken();
    const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(4) : endpoint;
    const url = `${API_URL}${cleanEndpoint.startsWith('/') ? '' : '/'}${cleanEndpoint}`;
    console.log(`🌐 [apiFetchBlob] ${options.method || 'GET'} ${url}`);
    
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorMessage = `Erreur HTTP ${response.status}`;
      try {
        const data = await response.json();
        errorMessage = data.error || data.message || errorMessage;
      } catch { /* ignore */ }
      throw new Error(errorMessage);
    }

    return response.blob();
  } catch (error) {
    console.error("❌ apiFetchBlob error:", error);
    throw error;
  }
}

export { API_URL };