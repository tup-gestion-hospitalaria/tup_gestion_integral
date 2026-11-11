import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-ui-state',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, TranslateModule],
  template: `
    @if (loading) {
      <div
        class="ui-state ui-state-loading"
        role="status"
        [attr.aria-label]="loadingLabel | translate"
      >
        <mat-spinner [diameter]="spinnerSize"></mat-spinner>
        @if (loadingKey) {
          <p>{{ loadingKey | translate }}</p>
        }
      </div>
    } @else if (errorKey) {
      <p class="ui-state ui-state-error" role="alert">{{ errorKey | translate }}</p>
    } @else if (emptyKey && empty) {
      <p class="ui-state ui-state-empty" role="status">{{ emptyKey | translate }}</p>
    } @else {
      <ng-content></ng-content>
    }
  `,
  styleUrl: './ui-state.css',
})
export class UiState {
  @Input({ required: true }) loading = false;
  @Input() errorKey = '';
  @Input() empty = false;
  @Input() emptyKey = '';
  @Input() loadingKey = 'COMMON.LOADING';
  @Input() loadingLabel = 'COMMON.LOADING';
  @Input() spinnerSize = 40;
}
