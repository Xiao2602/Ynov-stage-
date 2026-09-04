import { auth } from '../auth/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Helper pour obtenir le token d'authentification
 */
const getAuthToken = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Utilisateur non connecté");
  return await currentUser.getIdToken();
};

/**
 * Soumet une demande de modification de profil (Non-Admin)
 */
export const requestProfileUpdate = async (updateData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/profile/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });
  return response.json();
};

/**
 * Récupère toutes les demandes de modification en attente (Admin)
 */
export const getPendingProfileRequests = async () => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/profile/requests`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
};

/**
 * Approuve une demande de modification (Admin)
 */
export const approveProfileRequest = async (requestId) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/profile/requests/${requestId}/approve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
};

/**
 * Rejette une demande de modification (Admin)
 */
export const rejectProfileRequest = async (requestId) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/profile/requests/${requestId}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.json();
};

/**
 * Modification directe du profil par un Admin
 */
export const adminUpdateProfile = async (uid, updateData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/profile/admin/${uid}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });
  return response.json();
};
