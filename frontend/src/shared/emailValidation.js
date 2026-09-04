export function isYnovEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@ynov\.com$/i.test(email.trim());
}
