import { Component, Inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export interface SnackNotificationData {
  message: string;
  icon: string;
}

@Component({
  selector: 'app-snack-notification',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="snack-content">
      <mat-icon class="snack-icon">{{ data.icon }}</mat-icon>
      <span class="snack-message">{{ data.message }}</span>
      <button mat-icon-button class="snack-dismiss" (click)="dismiss()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .snack-content {
      display: flex;
      align-items: center;
      gap: 8px;
      color: inherit;
    }
    .snack-icon {
      flex-shrink: 0;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .snack-message {
      flex: 1;
      font-size: 14px;
      line-height: 1.4;
    }
    .snack-dismiss {
      color: inherit;
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      line-height: 32px;
    }
    .snack-dismiss mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `]
})
export class SnackNotificationComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: SnackNotificationData,
    private ref: MatSnackBarRef<SnackNotificationComponent>
  ) {}

  dismiss(): void {
    this.ref.dismiss();
  }
}
