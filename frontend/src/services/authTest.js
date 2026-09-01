import { apiFetch } from '../api/api';

export async function getCurrentUserFromBackend() {
  return apiFetch('/auth/me');
}