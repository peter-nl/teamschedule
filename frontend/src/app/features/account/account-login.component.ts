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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService } from '../../shared/services/auth.service';

const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email) { success message }
  }
`;

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
    MatSnackBarModule,
    TranslateModule
  ],
  template: `
    <mat-card class="login-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>login</mat-icon>
        <mat-card-title>{{ 'login.title' | translate }}</mat-card-title>
        <mat-card-subtitle>{{ 'login.subtitle' | translate }}</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <form (ngSubmit)="onLogin()" class="login-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'login.memberId' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="loginForm.memberId"
                   name="memberId"
                   required
                   [placeholder]="'login.memberIdPlaceholder' | translate">
            <mat-icon matSuffix>badge</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'login.password' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="loginForm.password"
                   name="password"
                   [type]="hidePassword ? 'password' : 'text'"
                   required
                   [placeholder]="'login.passwordPlaceholder' | translate">
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
            <span *ngIf="!loginLoading">{{ 'login.signIn' | translate }}</span>
          </button>
        </form>

        <div class="forgot-password-section">
          <button mat-button type="button" class="forgot-link" (click)="showForgotForm = !showForgotForm">
            {{ 'login.forgotPassword' | translate }}
          </button>

          <div *ngIf="showForgotForm" class="forgot-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'login.emailAddress' | translate }}</mat-label>
              <input matInput [(ngModel)]="forgotEmail" name="forgotEmail" type="email">
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>
            <button mat-raised-button color="primary" class="full-width"
                    (click)="onRequestReset()" [disabled]="resetLoading || !forgotEmail">
              <mat-spinner *ngIf="resetLoading" diameter="18"></mat-spinner>
              <span *ngIf="!resetLoading">{{ 'login.sendResetLink' | translate }}</span>
            </button>
            <div *ngIf="resetMessage" class="reset-message">
              <mat-icon>info</mat-icon>
              {{ resetMessage }}
            </div>
          </div>
        </div>
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

    .forgot-password-section {
      margin-top: 8px;
      text-align: center;
    }

    .forgot-link {
      color: var(--mat-sys-primary);
      font-size: 14px;
    }

    .forgot-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
    }

    .reset-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 8px;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
      font-size: 14px;
    }
  `]
})
export class AccountLoginComponent {
  @Output() loginSuccess = new EventEmitter<void>();

  loginForm = {
    memberId: '',
    password: ''
  };
  loginLoading = false;
  loginError: string | null = null;
  hidePassword = true;

  showForgotForm = false;
  forgotEmail = '';
  resetLoading = false;
  resetMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  onLogin(): void {
    if (!this.loginForm.memberId || !this.loginForm.password) {
      this.loginError = this.translate.instant('login.messages.fieldsRequired');
      return;
    }

    this.loginLoading = true;
    this.loginError = null;

    this.authService.login(this.loginForm.memberId, this.loginForm.password).subscribe({
      next: (result) => {
        this.loginLoading = false;
        if (result.success) {
          this.snackBar.open(this.translate.instant('login.messages.welcome'), this.translate.instant('common.close'), { duration: 3000 });
          this.loginForm = { memberId: '', password: '' };
          this.loginSuccess.emit();
        } else {
          this.loginError = result.message || this.translate.instant('login.messages.loginFailed');
        }
      },
      error: (error) => {
        this.loginLoading = false;
        this.loginError = this.translate.instant('login.messages.error');
        console.error('Login error:', error);
      }
    });
  }

  onRequestReset(): void {
    this.resetLoading = true;
    this.resetMessage = null;
    apolloClient.mutate({
      mutation: REQUEST_PASSWORD_RESET,
      variables: { email: this.forgotEmail }
    }).then(result => {
      this.resetLoading = false;
      this.resetMessage = (result.data as any).requestPasswordReset.message;
    }).catch(() => {
      this.resetLoading = false;
      this.resetMessage = this.translate.instant('login.messages.error');
    });
  }
}
