import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  loading = false;

  constructor(private router: Router) {}

  login() {
  this.loading = true;

    setTimeout(() => {
    sessionStorage.setItem('isLoggedIn', 'true');
    this.loading = false;
    this.router.navigate(['/items']);
      }, 2000);
  }
}