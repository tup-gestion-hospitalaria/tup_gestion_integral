import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings {
  version = '1.0.0';
  userAgent = navigator.userAgent;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  async logout(): Promise<void> {
    const confirmLogout = confirm('¿Seguro que querés cerrar sesión?');

    if (!confirmLogout) {
      return;
    }

    await this.authService.logout();

    this.router.navigate(['/login']);
  }
}