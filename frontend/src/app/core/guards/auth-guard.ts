import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { auth } from '../../firebase';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);

  await auth.authStateReady();

  if (auth.currentUser) {
    return true;
  }

  return router.createUrlTree(['/login']);
};