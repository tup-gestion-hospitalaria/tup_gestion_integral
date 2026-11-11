import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';

import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(MatDialog);

  open(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open(ConfirmDialog, {
        width: 'min(28rem, calc(100vw - 1.5rem))',
        maxWidth: 'calc(100vw - 1rem)',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        data,
      })
      .afterClosed()
      .pipe(map((value) => value === true));
  }

  confirmLogout(): Observable<boolean> {
    return this.open({
      titleKey: 'COMMON.LOGOUT_CONFIRM_TITLE',
      messageKey: 'COMMON.LOGOUT_CONFIRM_MESSAGE',
      confirmKey: 'SETTINGS.LOGOUT',
      danger: true,
    });
  }
}
