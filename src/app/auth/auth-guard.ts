import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getCurrentUser().pipe(
    map(res => {
      authService.user.set(res.user);
      return true;
    }),
    catchError(() => {
      authService.user.set(null);
      router.navigate(['/auth/login']);
      return of(false);
    })
  );
};
