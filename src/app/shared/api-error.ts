import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return error instanceof Error ? error.message : 'Une erreur est survenue.';
  }
  if (error.status === 0) return 'Impossible de joindre le serveur. Réessayez dans quelques instants.';
  if (error.status === 401) return 'Votre session a expiré. Veuillez vous reconnecter.';
  let body: unknown = error.error;
  if (typeof body === 'string') {
    const text = body;
    try {
      body = JSON.parse(text);
    } catch {
      if (text.trim() && !text.trim().startsWith('<')) return text;
    }
  }
  if (body && typeof body === 'object') {
    const details = body as { message?: unknown; detail?: unknown };
    const message = details.message ?? details.detail;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (error.status === 404) return 'Cet étudiant est introuvable.';
  if (error.status === 400) return 'Les données envoyées sont invalides. Vérifiez les champs.';
  return `La requête a échoué (erreur ${error.status}). Réessayez.`;
}
