import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService } from '../../shared/services/auth.service';

const RESET_PASSWORD_WITH_TOKEN = gql`
  mutation ResetPasswordWithToken($token: String!, $newPassword: String!) {
    resetPasswordWithToken(token: $token, newPassword: $newPassword) {
      success message worker { id firstName lastName particles email role } token
    }
  }
`;

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="reset-container">
      <mat-card class="reset-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>lock_reset</mat-icon>
          <mat-card-title>Reset Password</mat-card-title>
          <mat-card-subtitle>Enter your new password</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form *ngIf="!completed" (ngSubmit)="onReset()" class="reset-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>New Password</mat-label>
              <input matInput [(ngModel)]="newPassword" name="newPassword"
                     [type]="hidePassword ? 'password' : 'text'" required>
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm Password</mat-label>
              <input matInput [(ngModel)]="confirmPassword" name="confirmPassword"
                     [type]="hidePassword ? 'password' : 'text'" required>
            </mat-form-field>

            <div *ngIf="errorMessage" class="error-message">
              <mat-icon>error</mat-icon>
              {{ errorMessage }}
            </div>

            <button mat-raised-button color="primary" type="submit" class="full-width"
                    [disabled]="loading || !newPassword || !confirmPassword">
              <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
              <span *ngIf="!loading">Reset Password</span>
            </button>
          </form>

          <div *ngIf="completed" class="success-message">
            <mat-icon>check_circle</mat-icon>
            <p>Your password has been reset successfully. You are now logged in.</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .reset-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100%;
      padding: 24px;
    }

    .reset-card {
      max-width: 420px;
      width: 100%;
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

    .reset-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .full-width {
      width: 100%;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 8px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      margin-bottom: 16px;
    }

    .error-message mat-icon {
      flex-shrink: 0;
    }

    .success-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }

    .success-message mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
    }

    .success-message p {
      margin: 0;
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
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  hidePassword = true;
  loading = false;
  completed = false;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'No reset token provided. Please use the link from your email.';
    }
  }

  onReset(): void {
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }
    if (this.newPassword.length < 4) {
      this.errorMessage = 'Password must be at least 4 characters';
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    apolloClient.mutate({
      mutation: RESET_PASSWORD_WITH_TOKEN,
      variables: { token: this.token, newPassword: this.newPassword }
    }).then(result => {
      this.loading = false;
      const res = (result.data as any).resetPasswordWithToken;
      if (res.success && res.worker && res.token) {
        this.completed = true;
        this.authService.setAuth(res.worker, res.token);
        setTimeout(() => this.router.navigate(['/schedule']), 2000);
      } else {
        this.errorMessage = res.message || 'Invalid or expired reset link';
      }
    }).catch(err => {
      this.loading = false;
      this.errorMessage = 'An error occurred. Please try again.';
    });
  }
}
