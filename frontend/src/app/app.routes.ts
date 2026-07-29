import { Routes } from '@angular/router';

import { ReferralCenters } from './pages/referral-centers/referral-centers';
import { Login } from './pages/login/login';
import { Layout } from './pages/layout/layout';
import { Items } from './pages/items/items';
import { Settings } from './pages/settings/settings';
import { authGuard } from './core/guards/auth-guard';
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
      },
      {
        path: 'centros-derivacion',
        component: ReferralCenters,
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
