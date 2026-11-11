import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../services/auth.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog.service';

@Component({
  selector: 'app-account-status',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterLink,
    TranslateModule,
  ],
  templateUrl: './account-status.html',
  styleUrl: './account-status.css',
})
export class AccountStatus {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  checking = false;
  messageKey = '';

  get status(): string {
    return this.authService.accountProfile?.status ?? 'pending';
  }

  get statusTitleKey(): string {
    switch (this.status) {
      case 'rejected':
        return 'ACCOUNT_STATUS.TITLE_REJECTED';
      case 'disabled':
        return 'ACCOUNT_STATUS.TITLE_DISABLED';
      case 'approved':
        return 'ACCOUNT_STATUS.TITLE_APPROVED';
      case 'pending':
      default:
        return 'ACCOUNT_STATUS.TITLE_PENDING';
    }
  }

  get statusDescriptionKey(): string {
    switch (this.status) {
      case 'rejected':
        return 'ACCOUNT_STATUS.DESC_REJECTED';
      case 'disabled':
        return 'ACCOUNT_STATUS.DESC_DISABLED';
      case 'approved':
        return 'ACCOUNT_STATUS.DESC_APPROVED';
      case 'pending':
      default:
        return 'ACCOUNT_STATUS.DESC_PENDING';
    }
  }

  roleLabel(): string {
    const role = this.authService.accountProfile?.role;
    if (role === 'admin') {
      return this.translate.instant('ACCOUNT_STATUS.ROLE_ADMIN');
    }
    return this.translate.instant('ACCOUNT_STATUS.ROLE_USER');
  }

  async checkStatus(): Promise<void> {
    this.checking = true;
    this.messageKey = '';

    try {
      const profile = await this.authService.refreshAccountProfile();
      if (profile?.status === 'approved') {
        await this.router.navigate(['/items']);
      } else {
        this.messageKey = 'ACCOUNT_STATUS.STILL_PENDING';
      }
    } catch {
      this.messageKey = 'ACCOUNT_STATUS.CHECK_ERROR';
    } finally {
      this.checking = false;
    }
  }

  logout(): void {
    this.confirmDialog.confirmLogout().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      void this.authService.logout().then(() => this.router.navigate(['/login']));
    });
  }
}
