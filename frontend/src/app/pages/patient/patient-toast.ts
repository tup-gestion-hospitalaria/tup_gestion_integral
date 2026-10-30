import { Component } from '@angular/core';

@Component({
  selector: 'app-patient-toast',
  standalone: true,
  template: `
    <div
      class="ficha-toast"
      [class.on]="visible"
      [attr.data-type]="type"
      role="status"
      aria-live="polite"
    >
      {{ message }}
    </div>
  `,
  styleUrl: './patient-ficha.css',
})
export class PatientToast {
  visible = false;
  message = '';
  type: 'ok' | 'err' = 'ok';

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  show(text: string, toastType: 'ok' | 'err' = 'ok', durationMs = 3200): void {
    this.message = text;
    this.type = toastType;
    this.visible = true;

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }

    this.hideTimer = setTimeout(() => {
      this.visible = false;
    }, durationMs);
  }
}
