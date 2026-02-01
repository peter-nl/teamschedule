import { Component, EventEmitter, Output } from '@angular/core';
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
  selector: 'app-account-login',
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
    <mat-card class="login-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>login</mat-icon>
        <mat-card-title>Login</mat-card-title>
        <mat-card-subtitle>Sign in with your worker ID</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <form (ngSubmit)="onLogin()" class="login-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Worker ID</mat-label>
            <input matInput
                   [(ngModel)]="loginForm.workerId"
                   name="workerId"
                   required
                   placeholder="Enter your worker ID">
            <mat-icon matSuffix>badge</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Password</mat-label>
            <input matInput
                   [(ngModel)]="loginForm.password"
                   name="password"
                   [type]="hidePassword ? 'password' : 'text'"
                   required
                   placeholder="Enter your password">
            <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
              <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <div *ngIf="loginError" class="error-message">
            <mat-icon>error</mat-icon>
            {{ loginError }}
          </div>

          <button mat-raised-button
                  color="primary"
                  type="submit"
                  class="full-width"
                  [disabled]="loginLoading">
            <mat-spinner *ngIf="loginLoading" diameter="20"></mat-spinner>
            <span *ngIf="!loginLoading">Sign In</span>
          </button>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .login-card {
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

    .login-form {
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

    button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    button[type="submit"] {
      height: 48px;
    }
  `]
})
export class AccountLoginComponent {
  @Output() loginSuccess = new EventEmitter<void>();

  loginForm = {
    workerId: '',
    password: ''
  };
  loginLoading = false;
  loginError: string | null = null;
  hidePassword = true;

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  onLogin(): void {
    if (!this.loginForm.workerId || !this.loginForm.password) {
      this.loginError = 'Please enter both Worker ID and Password';
      return;
    }

    this.loginLoading = true;
    this.loginError = null;

    this.authService.login(this.loginForm.workerId, this.loginForm.password).subscribe({
      next: (result) => {
        this.loginLoading = false;
        if (result.success) {
          this.snackBar.open('Welcome back!', 'Close', { duration: 3000 });
          this.loginForm = { workerId: '', password: '' };
          this.loginSuccess.emit();
        } else {
          this.loginError = result.message || 'Login failed';
        }
      },
      error: (error) => {
        this.loginLoading = false;
        this.loginError = 'An error occurred. Please try again.';
        console.error('Login error:', error);
      }
    });
  }
}
