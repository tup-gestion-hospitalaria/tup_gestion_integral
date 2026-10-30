import { Routes } from '@angular/router';

import { ReferralCenters } from './pages/referral-centers/referral-centers';
import { Login } from './pages/login/login';
import { Layout } from './pages/layout/layout';
import { Items } from './pages/items/items';
import { Settings } from './pages/settings/settings';
import { PatientDetail } from './pages/patient/patient-detail';
import { PatientFormPage } from './pages/patient/patient-form-page';
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
        path: 'items/nuevo',
        component: PatientFormPage,
        data: { mode: 'create' },
      },
      {
        path: 'items/:id/editar',
        component: PatientFormPage,
        data: { mode: 'edit' },
      },
      {
        path: 'items/:id',
        component: PatientDetail,
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
