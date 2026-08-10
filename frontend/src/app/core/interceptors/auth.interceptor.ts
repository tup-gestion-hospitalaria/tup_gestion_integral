import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const user = authService.getCurrentUser();

  if (!request.url.startsWith(environment.backendApiUrl) || !user) {
    return next(request);
  }

  return from(user.getIdToken()).pipe(
    switchMap((token) =>
      next(
        request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ),
    ),
  );
};
