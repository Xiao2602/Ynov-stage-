/**
 * Vérifie qu'un email appartient au domaine YNOV.
 */
export function isYnovEmail(email) {
  if (!email || typeof email !== "string") {
    return false;
  }

  return /^[^\s@]+@ynov\.com$/i.test(email.trim());
}