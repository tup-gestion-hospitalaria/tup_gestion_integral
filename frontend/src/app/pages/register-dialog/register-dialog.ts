import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';

import { auth } from '../../firebase';
import { updateProfile } from 'firebase/auth';

@Component({
  selector: 'app-register-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule
  ],
  templateUrl: './register-dialog.html',
  styleUrl: './register-dialog.css'
})
export class RegisterDialog {
  email = '';
  password = '';
  confirmPassword = '';
  displayName = '';
  photoURL = '';
  errorMessage = '';

  constructor(
    private dialogRef: MatDialogRef<RegisterDialog>
  ) {}

  cancel(): void {
    this.dialogRef.close();
  }

  createAccount(): void {
    if (!this.displayName.trim()) {
      this.errorMessage = 'Completá el nombre de usuario.';
      return;
    }

    if (!this.email.trim() || !this.password.trim() || !this.confirmPassword.trim()) {
      this.errorMessage = 'Completá todos los campos.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.dialogRef.close({
      email: this.email.trim(),
      password: this.password,
      displayName: this.displayName.trim(),
      photoURL: this.photoURL.trim()
    });
  }
}