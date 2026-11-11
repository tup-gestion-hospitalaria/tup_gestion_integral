import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { RegisterDialog } from '../register-dialog/register-dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppToastService } from '../../shared/app-toast.service';

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
  loginErrorKey = '';

  email = '';
  password = '';

  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(AppToastService);

  private setLoading(value: boolean): void {
    this.loading = value;
    this.cdr.detectChanges();
  }

  private showError(messageKey: string): void {
    this.loginErrorKey = messageKey;
    const message = this.translate.instant(messageKey);
    this.toast.show(message, 'err');
    this.cdr.detectChanges();
  }

  private redirectAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];

    if (!this.authService.isApproved()) {
      this.router.navigate(['/cuenta-estado']);
      return;
    }

    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/items']);
    }
  }

  async loginWithGoogle(): Promise<void> {
    try {
      this.loginErrorKey = '';
      this.setLoading(true);

      await this.authService.loginWithGoogle();
      this.redirectAfterLogin();
    } catch {
      this.showError('LOGIN.GOOGLE_ERROR');
    } finally {
      this.setLoading(false);
    }
  }

  async loginWithEmail(): Promise<void> {
    if (!this.email.trim() || !this.password.trim()) {
      this.showError('LOGIN.FIELDS_REQUIRED');
      return;
    }

    try {
      this.loginErrorKey = '';
      this.setLoading(true);

      await this.authService.loginWithEmail(this.email.trim(), this.password);
      this.redirectAfterLogin();
    } catch (error: unknown) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      if (code === 'auth/invalid-email') {
        this.showError('LOGIN.INVALID_EMAIL');
      } else if (code === 'auth/invalid-credential') {
        this.showError('LOGIN.INVALID_CREDENTIALS');
      } else {
        this.showError('LOGIN.EMAIL_LOGIN_ERROR');
      }
    } finally {
      this.setLoading(false);
    }
  }

  registerWithEmail(): void {
    const dialogRef = this.dialog.open(RegisterDialog, {
      width: 'min(28rem, calc(100vw - 1.5rem))',
      maxWidth: 'calc(100vw - 1rem)',
      disableClose: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result) {
        this.setLoading(false);
        return;
      }

      try {
        this.loginErrorKey = '';
        this.setLoading(true);

        await this.authService.registerWithEmail(
          result.email,
          result.password,
          result.displayName,
          result.photoURL,
        );
        this.redirectAfterLogin();
      } catch (error: unknown) {
        const code =
          typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
        if (code === 'auth/email-already-in-use') {
          this.showError('LOGIN.EMAIL_ALREADY_IN_USE');
        } else if (code === 'auth/invalid-email') {
          this.showError('LOGIN.INVALID_EMAIL');
        } else if (code === 'auth/weak-password') {
          this.showError('LOGIN.WEAK_PASSWORD');
        } else {
          this.showError('LOGIN.CREATE_ACCOUNT_ERROR');
        }
      } finally {
        this.setLoading(false);
      }
    });
  }
}
