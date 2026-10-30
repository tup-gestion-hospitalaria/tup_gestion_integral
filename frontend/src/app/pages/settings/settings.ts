import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, RouterLink, TranslateModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  readonly version = '1.0.0';
  readonly userAgent = navigator.userAgent;

  constructor(public authService: AuthService) {}

  get accountStatusLabel(): string {
    const status = this.authService.accountProfile?.status ?? 'pending';

    switch (status) {
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      case 'disabled':
        return 'Deshabilitada';
      case 'pending':
      default:
        return 'Pendiente';
    }
  }

  get accountRoleLabel(): string {
    switch (this.authService.accountProfile?.role) {
      case 'admin':
        return 'Administrador';
      case 'user':
        return 'Usuario';
      default:
        return 'Sin rol asignado';
    }
  }

  get statusNotice(): { text: string; type: 'info' | 'warning' | 'error' } | null {
    const status = this.authService.accountProfile?.status;

    if (!status || status === 'approved') {
      return null;
    }

    switch (status) {
      case 'pending':
        return {
          text: 'Tu cuenta se encuentra pendiente de aprobación. Un administrador debe autorizar tu acceso para poder operar en el sistema.',
          type: 'warning',
        };
      case 'rejected':
        return {
          text: 'Tu solicitud de acceso fue rechazada. Si considerás que se trata de un error, comunicate con el equipo de soporte o administración.',
          type: 'error',
        };
      case 'disabled':
        return {
          text: 'Esta cuenta ha sido deshabilitada. Comunicate con el administrador para más información.',
          type: 'error',
        };
      default:
        return null;
    }
  }

  async logout(): Promise<void> {
    const confirmLogout = confirm('¿Seguro que querés cerrar sesión?');

    if (!confirmLogout) {
      return;
    }

    await this.authService.logout();
  }
}
