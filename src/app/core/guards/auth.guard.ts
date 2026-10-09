import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../service/user.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const userService = inject(UserService);
  if (userService.isAuthenticated()) return true;
  userService.logout();
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
