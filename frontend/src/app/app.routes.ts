import { Routes } from '@angular/router';

import { ReferralCenters } from './pages/referral-centers/referral-centers';
import { Login } from './pages/login/login';
import { Layout } from './pages/layout/layout';
import { Items } from './pages/items/items';
import { Settings } from './pages/settings/settings';
import { AccountStatus } from './pages/account-status/account-status';
import { authGuard } from './core/guards/auth-guard';
import { approvedAccountGuard } from './core/guards/approved-account-guard';
import { autoLoginGuard } from './core/guards/auto-login-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login,
    canActivate: [autoLoginGuard],
  },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      {
        path: 'items',
        component: Items,
        canActivate: [approvedAccountGuard],
      },
      {
        path: 'centros-derivacion',
        component: ReferralCenters,
        canActivate: [approvedAccountGuard],
      },
      {
        path: 'cuenta-estado',
        component: AccountStatus,
      },
      {
        path: 'configuracion',
        component: Settings,
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
