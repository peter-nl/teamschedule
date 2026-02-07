import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SlideInPanelRef, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon class="warning-icon">warning</mat-icon>
          {{ data.title }}
        </h2>
        <button class="panel-close" (click)="panelRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">
        <p class="message">{{ data.message }}</p>
      </div>

      <div class="panel-actions">
        <span class="spacer"></span>
        <button mat-button (click)="panelRef.close()">{{ data.cancelText || 'Cancel' }}</button>
        <button mat-raised-button [color]="data.confirmColor || 'primary'" (click)="confirm()">
          {{ data.confirmText || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .warning-icon {
      color: var(--mat-sys-error) !important;
    }

    .message {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      font-size: 14px;
      line-height: 1.5;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public panelRef: SlideInPanelRef<ConfirmDialogComponent>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: ConfirmDialogData
  ) {}

  confirm(): void {
    this.panelRef.close(true);
  }
}
