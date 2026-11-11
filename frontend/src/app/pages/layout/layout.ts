import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs';

import { AuthService } from '../../services/auth.service';

const MOBILE_LAYOUT_QUERY = '(max-width: 47.99rem)';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    TranslateModule,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  private static initialSmallScreen(): boolean {
    return typeof globalThis.matchMedia === 'function'
      ? globalThis.matchMedia(MOBILE_LAYOUT_QUERY).matches
      : false;
  }

  isSmallScreen = Layout.initialSmallScreen();
  sidenavOpen = !Layout.initialSmallScreen();

  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor(private breakpointObserver: BreakpointObserver) {
    this.breakpointObserver
      .observe([MOBILE_LAYOUT_QUERY])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.isSmallScreen = result.matches;
        this.sidenavOpen = !result.matches;
      });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.isSmallScreen) {
          this.sidenavOpen = false;
        }
        queueMicrotask(() => {
          document.getElementById('contenido')?.focus({ preventScroll: false });
        });
      });
  }

  get isApproved(): boolean {
    return this.authService.isApproved();
  }

  isRouteActive(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(`${path}/`);
  }

  openMobileNav(): void {
    this.sidenavOpen = true;
  }
}
