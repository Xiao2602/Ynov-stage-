import { apiFetch } from './api';

export async function getCurrentUserFromBackend() {
  return apiFetch('/api/auth/me');
}