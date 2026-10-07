import { Injectable, signal } from '@angular/core';
import { LoginRequest } from '../models/LoginRequest';
import { Register } from '../models/Register';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private authenticationToken = signal<string | null>(null);
  readonly token = this.authenticationToken.asReadonly();

  constructor(private httpClient: HttpClient) { }

  register(user: Register): Observable<Object> {
    return this.httpClient.post('/api/register', user);
  }

  login(credentials: LoginRequest): Observable<string> {
    this.authenticationToken.set(null);
    return this.httpClient.post('/api/login', credentials, { responseType: 'text' })
      .pipe(tap(token => {
        if (!token.trim()) {
          throw new Error('Le serveur n’a pas renvoyé de token d’authentification.');
        }
        this.authenticationToken.set(token);
      }));
  }
}
