// Shared Utilities - Utilitaires partagés du projet
export function formatResponse(success, dataOrError, message = "") {
  if (success) {
    return { success: true, data: dataOrError, message };
  }
  return { success: false, error: dataOrError };
}
