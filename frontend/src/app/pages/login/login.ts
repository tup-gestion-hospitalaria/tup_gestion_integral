import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AuthService } from '../../services/auth.service';
import { RegisterDialog } from '../register-dialog/register-dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
    private authService: AuthService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  private setLoading(value: boolean): void {
    this.loading = value;
    this.cdr.detectChanges();
  }

  async loginWithGoogle(): Promise<void> {
    try {
      this.setLoading(true);

      await this.authService.loginWithGoogle();
    } catch (error) {
      console.error(error);
      this.translate.get('LOGIN.GOOGLE_ERROR').subscribe((res: string) => alert(res));
    } finally {
      this.setLoading(false);
    }
  }

  async loginWithEmail(): Promise<void> {
    if (!this.email.trim() || !this.password.trim()) {
      this.translate.get('LOGIN.FIELDS_REQUIRED').subscribe((res: string) => alert(res));
      return;
    }

    try {
      this.setLoading(true);

      await this.authService.loginWithEmail(this.email.trim(), this.password);
    } catch (error: any) {
      console.error(error);

      if (error.code === 'auth/invalid-email') {
        this.translate.get('LOGIN.INVALID_EMAIL').subscribe((res: string) => alert(res));
      } else if (error.code === 'auth/invalid-credential') {
        this.translate.get('LOGIN.INVALID_CREDENTIALS').subscribe((res: string) => alert(res));
      } else {
        this.translate.get('LOGIN.EMAIL_LOGIN_ERROR').subscribe((res: string) => alert(res));
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
          this.translate.get('LOGIN.EMAIL_ALREADY_IN_USE').subscribe((res: string) => alert(res));
        } else if (error.code === 'auth/invalid-email') {
          this.translate.get('LOGIN.INVALID_EMAIL').subscribe((res: string) => alert(res));
        } else if (error.code === 'auth/weak-password') {
          this.translate.get('LOGIN.WEAK_PASSWORD').subscribe((res: string) => alert(res));
        } else {
          this.translate.get('LOGIN.CREATE_ACCOUNT_ERROR').subscribe((res: string) => alert(res));
        }
      } finally {
        this.setLoading(false);
      }
    });
  }
}
