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

  get accountPermissions(): { label: string; enabled: boolean }[] {
    const status = this.authService.accountProfile?.status;
    const role = this.authService.accountProfile?.role;

    if (status !== 'approved') {
      return [
        { label: `Cuenta ${this.accountStatusLabel.toLowerCase()}. Los permisos se habilitan cuando la cuenta es aprobada.`, enabled: false },
      ];
    }

    if (role === 'admin') {
      return [
        { label: 'Consultar pacientes', enabled: true },
        { label: 'Administrar pacientes', enabled: true },
        { label: 'Gestionar derivaciones', enabled: true },
        { label: 'Administrar usuarios', enabled: true },
        { label: 'Consultar auditoría', enabled: true },
      ];
    }

    if (role === 'user') {
      return [
        { label: 'Consultar pacientes', enabled: true },
        { label: 'Crear derivaciones', enabled: true },
        { label: 'Editar mis derivaciones', enabled: true },
        { label: 'Administrar usuarios', enabled: false },
        { label: 'Consultar auditoría', enabled: false },
      ];
    }

    return [
      { label: 'Sin permisos asignados', enabled: false },
    ];
  }

  async logout(): Promise<void> {
    const confirmLogout = confirm('¿Seguro que querés cerrar sesión?');

    if (!confirmLogout) {
      return;
    }

    await this.authService.logout();
  }
}
