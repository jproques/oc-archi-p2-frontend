import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  function httpError(status: number, error: unknown = null): HttpErrorResponse {
    return new HttpErrorResponse({ status, error });
  }

  it('preserves the message of an ordinary Error', () => {
    expect(apiErrorMessage(new Error('Une erreur locale'))).toBe('Une erreur locale');
  });

  it.each([null, undefined, 'unexpected', 42, { message: 'not an Error' }])(
    'returns a fallback for an unexpected error: %p', error => {
      expect(apiErrorMessage(error)).toBe('Une erreur est survenue.');
    }
  );

  it('reports an unreachable server instead of the response body', () => {
    expect(apiErrorMessage(httpError(0, { message: 'Technical error' })))
      .toBe('Impossible de joindre le serveur. Réessayez dans quelques instants.');
  });

  it('asks for reconnection on a 401 instead of exposing the server message', () => {
    expect(apiErrorMessage(httpError(401, { message: 'Invalid JWT' })))
      .toBe('Votre session a expiré. Veuillez vous reconnecter.');
  });

  it.each([
    { message: 'Email déjà utilisé' },
    JSON.stringify({ message: 'Email déjà utilisé' })
  ])('reads a server message from an object or JSON string: %p', body => {
    expect(apiErrorMessage(httpError(400, body))).toBe('Email déjà utilisé');
  });

  it.each([
    { detail: 'Suppression impossible' },
    JSON.stringify({ detail: 'Suppression impossible' }),
    { message: null, detail: 'Suppression impossible' }
  ])('uses detail when message is absent or null: %p', body => {
    expect(apiErrorMessage(httpError(500, body))).toBe('Suppression impossible');
  });

  it('prefers message when both message and detail are present', () => {
    expect(apiErrorMessage(httpError(500, { message: 'Message public', detail: 'Autre détail' })))
      .toBe('Message public');
  });

  it('preserves a plain text server response', () => {
    expect(apiErrorMessage(httpError(503, 'Service indisponible'))).toBe('Service indisponible');
  });

  it.each([
    '', '   ', '  <html><body>Internal Server Error</body></html>',
    null, {}, { message: 123 }, { message: '   ' }, { detail: false },
    'null', '42', 'true', JSON.stringify('Unexpected body')
  ])('uses the status fallback for an unusable response body: %p', body => {
    expect(apiErrorMessage(httpError(500, body)))
      .toBe('La requête a échoué (erreur 500). Réessayez.');
  });

  it('reports a missing student on a 404 without a server message', () => {
    expect(apiErrorMessage(httpError(404))).toBe('Cet étudiant est introuvable.');
  });

  it('reports invalid fields on a 400 without a server message', () => {
    expect(apiErrorMessage(httpError(400)))
      .toBe('Les données envoyées sont invalides. Vérifiez les champs.');
  });

  it('preserves a custom server message on a 404', () => {
    expect(apiErrorMessage(httpError(404, { message: 'Étudiant supprimé par un autre utilisateur' })))
      .toBe('Étudiant supprimé par un autre utilisateur');
  });

  it('includes the HTTP status for other errors without a usable message', () => {
    expect(apiErrorMessage(httpError(403)))
      .toBe('La requête a échoué (erreur 403). Réessayez.');
  });
});
