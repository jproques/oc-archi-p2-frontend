import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { UserService } from '../service/user.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  // Only send the token to this backend's student endpoints.
  if (!/^\/api\/students(?:\/|\?|$)/.test(request.url)) return next(request);
  const userService = inject(UserService);
  const router = inject(Router);
  const token = userService.token();
  const authenticatedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;
  return next(authenticatedRequest).pipe(catchError((error: unknown) => {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      userService.logout();
      void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    }
    return throwError(() => error);
  }));
};
