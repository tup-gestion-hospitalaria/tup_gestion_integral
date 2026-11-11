import { Injectable, signal } from '@angular/core';

export type AppToastType = 'ok' | 'err';

export interface AppToastState {
  message: string;
  type: AppToastType;
}

@Injectable({ providedIn: 'root' })
export class AppToastService {
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  readonly state = signal<AppToastState | null>(null);

  show(message: string, type: AppToastType = 'ok', durationMs = 3200): void {
    this.state.set({ message, type });

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }

    this.hideTimer = setTimeout(() => {
      this.state.set(null);
    }, durationMs);
  }

  dismiss(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.state.set(null);
  }
}
