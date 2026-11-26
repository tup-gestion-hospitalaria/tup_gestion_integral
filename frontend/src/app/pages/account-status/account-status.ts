import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-account-status',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatProgressSpinnerModule, RouterLink],
  templateUrl: './account-status.html',
  styleUrl: './account-status.css',
})
export class AccountStatus {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  checking = false;
  message = '';

  get status(): string {
    return this.authService.accountProfile?.status ?? 'pending';
  }

  get statusTitle(): string {
    switch (this.status) {
      case 'rejected':
        return 'Solicitud de acceso rechazada';
      case 'disabled':
        return 'Cuenta deshabilitada';
      case 'approved':
        return 'Cuenta aprobada';
      case 'pending':
      default:
        return 'Cuenta pendiente de aprobación';
    }
  }

  get statusDescription(): string {
    switch (this.status) {
      case 'rejected':
        return 'Tu solicitud de acceso al sistema fue rechazada por la administración. Si considerás que se trata de un error, por favor comunicate con el soporte o la administración del hospital.';
      case 'disabled':
        return 'Tu cuenta ha sido deshabilitada temporal o definitivamente por un administrador. No tenés acceso operativo a la plataforma.';
      case 'approved':
        return '¡Tu cuenta ha sido aprobada! Ya podés acceder a todas las funciones del sistema.';
      case 'pending':
      default:
        return 'Un administrador debe verificar y habilitar tu usuario antes de que puedas acceder a los módulos de pacientes y derivaciones. Este proceso asegura la confidencialidad y seguridad de los datos médicos.';
    }
  }

  async checkStatus(): Promise<void> {
    this.checking = true;
    this.message = '';

    try {
      const profile = await this.authService.refreshAccountProfile();
      if (profile?.status === 'approved') {
        await this.router.navigate(['/items']);
      } else {
        this.message =
          'Tu cuenta aún no ha sido aprobada. Por favor, aguardá la validación del administrador.';
      }
    } catch {
      this.message =
        'No se pudo verificar el estado en este momento. Intentá nuevamente más tarde.';
    } finally {
      this.checking = false;
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
