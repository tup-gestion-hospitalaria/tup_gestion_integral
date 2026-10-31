import { Routes } from '@angular/router';

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
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    canActivate: [autoLoginGuard],
  },
  {
    path: '',
    loadComponent: () => import('./pages/layout/layout').then((m) => m.Layout),
    canActivate: [authGuard],
    children: [
      {
        path: 'items',
        loadComponent: () => import('./pages/items/items').then((m) => m.Items),
      },
      {
        path: 'items/nuevo',
        loadComponent: () =>
          import('./pages/patient/patient-form-page').then((m) => m.PatientFormPage),
        data: { mode: 'create' },
      },
      {
        path: 'items/:id/editar',
        loadComponent: () =>
          import('./pages/patient/patient-form-page').then((m) => m.PatientFormPage),
        data: { mode: 'edit' },
      },
      {
        path: 'items/:id',
        loadComponent: () => import('./pages/patient/patient-detail').then((m) => m.PatientDetail),
      },
      {
        path: 'centros-derivacion',
        loadComponent: () =>
          import('./pages/referral-centers/referral-centers').then((m) => m.ReferralCenters),
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.Settings),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
