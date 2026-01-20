import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

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
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>warning</mat-icon>
      {{ data.title }}
    </h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ data.cancelText || 'Cancel' }}</button>
      <button mat-raised-button [color]="data.confirmColor || 'primary'" (click)="confirm()">
        {{ data.confirmText || 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      padding: 16px 24px;
    }

    h2[mat-dialog-title] mat-icon {
      color: var(--mat-sys-error);
    }

    mat-dialog-content {
      padding: 0 24px 16px;
    }

    mat-dialog-content p {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  confirm(): void {
    this.dialogRef.close(true);
  }
}
