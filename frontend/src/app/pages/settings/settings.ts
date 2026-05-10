import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings {

  user = {
    name: 'Juan Pérez',
    email: 'juan.perez@email.com',
    role: 'Administrador'
  };

  version = '1.0.0';
  userAgent = navigator.userAgent;

  constructor(private router: Router) {}

  logout(): void {
    const confirmLogout = confirm('¿Seguro que querés cerrar sesión?');

    if (confirmLogout) {
      sessionStorage.clear();
      this.router.navigate(['/login']);
    }
  }
}