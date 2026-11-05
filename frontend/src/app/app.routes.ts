import { Routes } from '@angular/router';

import { adminAccountGuard } from './core/guards/admin-account-guard';
import { approvedAccountGuard } from './core/guards/approved-account-guard';
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
        canActivate: [approvedAccountGuard],
      },
      {
        path: 'items/nuevo',
        loadComponent: () =>
          import('./pages/patient/patient-form-page').then((m) => m.PatientFormPage),
        canActivate: [adminAccountGuard],
        data: { mode: 'create' },
      },
      {
        path: 'items/:id/editar',
        loadComponent: () =>
          import('./pages/patient/patient-form-page').then((m) => m.PatientFormPage),
        canActivate: [adminAccountGuard],
        data: { mode: 'edit' },
      },
      {
        path: 'items/:id',
        loadComponent: () => import('./pages/patient/patient-detail').then((m) => m.PatientDetail),
        canActivate: [approvedAccountGuard],
      },
      {
        path: 'pacientes/:id/derivar',
        loadComponent: () =>
          import('./pages/referral/referral-form-page').then((m) => m.ReferralFormPage),
        canActivate: [approvedAccountGuard],
      },
      {
        path: 'pacientes/:id',
        loadComponent: () => import('./pages/patient/patient-detail').then((m) => m.PatientDetail),
        canActivate: [approvedAccountGuard],
      },
      {
        path: 'derivaciones/:id',
        loadComponent: () =>
          import('./pages/referral/referral-detail').then((m) => m.ReferralDetail),
        canActivate: [approvedAccountGuard],
      },
      {
        path: 'centros-derivacion',
        loadComponent: () =>
          import('./pages/referral-centers/referral-centers').then((m) => m.ReferralCenters),
        canActivate: [approvedAccountGuard],
      },
      {
        path: 'cuenta-estado',
        loadComponent: () =>
          import('./pages/account-status/account-status').then((m) => m.AccountStatus),
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
