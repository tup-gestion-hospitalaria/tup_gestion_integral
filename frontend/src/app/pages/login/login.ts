import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AuthService } from '../../services/auth.service';
import { RegisterDialog } from '../register-dialog/register-dialog';
import { TranslateModule } from '@ngx-translate/core';

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
    TranslateModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loading = false;

  email = '';
  password = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}

  private setLoading(value: boolean): void {
    this.loading = value;
    this.cdr.detectChanges();
  }

  async loginWithGoogle(): Promise<void> {
    try {
      this.setLoading(true);

      await this.authService.loginWithGoogle();

      this.router.navigate(['/items']);
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

      this.router.navigate(['/items']);
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

        this.router.navigate(['/items']);
      } catch (error: any) {
        console.error(error);

        this.setLoading(false);

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
}
