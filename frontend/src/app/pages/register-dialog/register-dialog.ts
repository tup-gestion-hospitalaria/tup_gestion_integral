import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-register-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, TranslateModule],
  templateUrl: './register-dialog.html',
  styleUrl: './register-dialog.css',
})
export class RegisterDialog {
  email = '';
  password = '';
  confirmPassword = '';
  displayName = '';
  photoURL = '';
  errorMessageKey = '';

  private readonly dialogRef = inject(MatDialogRef<RegisterDialog>);

  cancel(): void {
    this.dialogRef.close();
  }

  createAccount(): void {
    this.errorMessageKey = '';

    if (!this.displayName.trim()) {
      this.errorMessageKey = 'REGISTER.NAME_REQUIRED';
      return;
    }

    if (!this.email.trim() || !this.password.trim() || !this.confirmPassword.trim()) {
      this.errorMessageKey = 'REGISTER.FIELDS_REQUIRED';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessageKey = 'REGISTER.WEAK_PASSWORD';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessageKey = 'REGISTER.PASSWORD_MISMATCH';
      return;
    }

    this.dialogRef.close({
      email: this.email.trim(),
      password: this.password,
      displayName: this.displayName.trim(),
      photoURL: this.photoURL.trim(),
    });
  }
}
