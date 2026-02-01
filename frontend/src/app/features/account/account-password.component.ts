import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-account-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <mat-card class="password-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>lock</mat-icon>
        <mat-card-title>Change Password</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <form (ngSubmit)="onChangePassword()" class="password-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Current Password</mat-label>
            <input matInput
                   [(ngModel)]="passwordForm.currentPassword"
                   name="currentPassword"
                   [type]="hideCurrentPassword ? 'password' : 'text'"
                   required>
            <button mat-icon-button matSuffix type="button" (click)="hideCurrentPassword = !hideCurrentPassword">
              <mat-icon>{{ hideCurrentPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>New Password</mat-label>
            <input matInput
                   [(ngModel)]="passwordForm.newPassword"
                   name="newPassword"
                   [type]="hideNewPassword ? 'password' : 'text'"
                   required>
            <button mat-icon-button matSuffix type="button" (click)="hideNewPassword = !hideNewPassword">
              <mat-icon>{{ hideNewPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Confirm New Password</mat-label>
            <input matInput
                   [(ngModel)]="passwordForm.confirmPassword"
                   name="confirmPassword"
                   [type]="hideConfirmPassword ? 'password' : 'text'"
                   required>
            <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword">
              <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <button mat-raised-button
                  type="submit"
                  [disabled]="passwordLoading">
            <mat-spinner *ngIf="passwordLoading" diameter="20"></mat-spinner>
            <span *ngIf="!passwordLoading">Change Password</span>
          </button>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .password-card {
      border-radius: 16px;
    }

    mat-card-header {
      margin-bottom: 24px;
    }

    mat-card-header mat-icon[mat-card-avatar] {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--mat-sys-primary);
    }

    .password-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .full-width {
      width: 100%;
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    button[type="submit"] {
      height: 48px;
    }
  `]
})
export class AccountPasswordComponent {
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  passwordLoading = false;
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  onChangePassword(): void {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
      this.snackBar.open('Please fill in all password fields', 'Close', { duration: 3000 });
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.snackBar.open('New passwords do not match', 'Close', { duration: 3000 });
      return;
    }

    this.passwordLoading = true;

    this.authService.changePassword(
      this.passwordForm.currentPassword,
      this.passwordForm.newPassword
    ).subscribe({
      next: (result) => {
        this.passwordLoading = false;
        if (result.success) {
          this.snackBar.open('Password changed successfully', 'Close', { duration: 3000 });
          this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
        } else {
          this.snackBar.open(result.message || 'Failed to change password', 'Close', { duration: 3000 });
        }
      },
      error: (error) => {
        this.passwordLoading = false;
        this.snackBar.open('Failed to change password', 'Close', { duration: 3000 });
        console.error('Change password error:', error);
      }
    });
  }
}
