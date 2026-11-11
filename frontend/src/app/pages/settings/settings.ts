import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../services/auth.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog.service';

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

  readonly authService = inject(AuthService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translate = inject(TranslateService);

  get accountStatusLabel(): string {
    const status = this.authService.accountProfile?.status ?? 'pending';

    switch (status) {
      case 'approved':
        return this.translate.instant('SETTINGS.STATUS_APPROVED');
      case 'rejected':
        return this.translate.instant('SETTINGS.STATUS_REJECTED');
      case 'disabled':
        return this.translate.instant('SETTINGS.STATUS_DISABLED');
      case 'pending':
      default:
        return this.translate.instant('SETTINGS.STATUS_PENDING');
    }
  }

  get accountRoleLabel(): string {
    switch (this.authService.accountProfile?.role) {
      case 'admin':
        return this.translate.instant('SETTINGS.ROLE_ADMIN');
      case 'user':
        return this.translate.instant('SETTINGS.ROLE_USER');
      default:
        return this.translate.instant('SETTINGS.ROLE_UNASSIGNED');
    }
  }

  get statusNotice(): { textKey: string; type: 'info' | 'warning' | 'error' } | null {
    const status = this.authService.accountProfile?.status;

    if (!status || status === 'approved') {
      return null;
    }

    switch (status) {
      case 'pending':
        return { textKey: 'SETTINGS.NOTICE_PENDING', type: 'warning' };
      case 'rejected':
        return { textKey: 'SETTINGS.NOTICE_REJECTED', type: 'error' };
      case 'disabled':
        return { textKey: 'SETTINGS.NOTICE_DISABLED', type: 'error' };
      default:
        return null;
    }
  }

  logout(): void {
    this.confirmDialog.confirmLogout().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      void this.authService.logout();
    });
  }
}
