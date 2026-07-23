import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import * as Sentry from '@sentry/angular';

import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';
import { RegisterDialog } from '../register-dialog/register-dialog';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loading = false;

  email = '';
  password = '';

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private analyticsService: AnalyticsService,
  ) {}

  private setLoading(value: boolean): void {
    this.loading = value;
    this.cdr.detectChanges();
  }

  async loginWithGoogle(): Promise<void> {
    try {
      this.setLoading(true);

      await this.authService.loginWithGoogle();

      const email = this.authService.getCurrentUser()?.email ?? 'email-no-disponible';
      this.analyticsService.login(email, 'google');
      this.reportSentryLoginTestError(email, 'google');
    } catch (error) {
      console.error(error);
      alert('No se pudo iniciar sesión con Google.');
    } finally {
      this.setLoading(false);
    }
  }

  async loginWithEmail(): Promise<void> {
    if (!this.email.trim() || !this.password.trim()) {
      alert('Completá correo electrónico y contraseña.');
      return;
    }

    try {
      this.setLoading(true);

      await this.authService.loginWithEmail(this.email.trim(), this.password);

      const email = this.authService.getCurrentUser()?.email ?? this.email.trim();
      this.analyticsService.login(email, 'email_password');
      this.reportSentryLoginTestError(email, 'email_password');
    } catch (error: any) {
      console.error(error);

      if (error.code === 'auth/invalid-email') {
        alert('El correo electrónico no tiene un formato válido.');
      } else if (error.code === 'auth/invalid-credential') {
        alert('Correo o contraseña incorrectos.');
      } else {
        alert('No se pudo iniciar sesión con Email.');
      }
    } finally {
      this.setLoading(false);
    }
  }

  registerWithEmail(): void {
    const dialogRef = this.dialog.open(RegisterDialog, {
      width: '28rem',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result) {
        this.setLoading(false);
        return;
      }

      try {
        this.setLoading(true);

        await this.authService.registerWithEmail(
          result.email,
          result.password,
          result.displayName,
          result.photoURL,
        );
      } catch (error: any) {
        console.error(error);

        if (error.code === 'auth/email-already-in-use') {
          alert('Ese correo ya está registrado. Iniciá sesión con Email.');
        } else if (error.code === 'auth/invalid-email') {
          alert('El correo electrónico no tiene un formato válido.');
        } else if (error.code === 'auth/weak-password') {
          alert('La contraseña debe tener al menos 6 caracteres.');
        } else {
          alert('No se pudo crear la cuenta.');
        }
      } finally {
        this.setLoading(false);
      }
    });
  }

  private reportSentryLoginTestError(email: string, loginMethod: string): void {
    Sentry.withScope((scope) => {
      scope.setUser({ email });
      scope.setTag('login_method', loginMethod);
      scope.setContext('login', { email, method: loginMethod });
      Sentry.captureException(new Error(`Sentry test error after login: ${email}`));
    });
  }
}
