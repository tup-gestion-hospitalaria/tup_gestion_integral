import { Component, computed, inject } from '@angular/core';

import { AppToastService } from './app-toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    @if (visible()) {
      <div
        class="app-toast"
        [class.on]="true"
        [attr.data-type]="toastType()"
        [attr.role]="toastType() === 'err' ? 'alert' : 'status'"
        [attr.aria-live]="toastType() === 'err' ? 'assertive' : 'polite'"
      >
        {{ message() }}
      </div>
    }
  `,
  styleUrl: './app-toast.css',
})
export class AppToast {
  private readonly toastService = inject(AppToastService);

  readonly visible = computed(() => this.toastService.state() !== null);
  readonly message = computed(() => this.toastService.state()?.message ?? '');
  readonly toastType = computed(() => this.toastService.state()?.type ?? 'ok');
}
