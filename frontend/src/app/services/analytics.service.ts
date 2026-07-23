import { Injectable } from '@angular/core';

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  sendEvent(eventName: string, params: Record<string, unknown> = {}): void {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...params });
  }

  login(email: string, method: 'google' | 'email_password'): void {
    this.sendEvent('login_event', { email, method });
  }

  featureOpened(featureName: string): void {
    this.sendEvent('feature_opened', { feature_name: featureName });
  }

  featureTimeSpent(featureName: string, durationSeconds: number): void {
    this.sendEvent('feature_time_spent', {
      feature_name: featureName,
      duration_seconds: durationSeconds,
    });
  }
}
