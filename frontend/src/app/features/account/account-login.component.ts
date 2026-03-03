import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NotificationService } from '../../shared/services/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService, OrgOption } from '../../shared/services/auth.service';

const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($username: String!) {
    requestPasswordReset(username: $username) { success message }
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
    MatCheckboxModule,
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

        <!-- Step 1: credentials -->
        <ng-container *ngIf="loginStep === 'credentials'">
          <form (ngSubmit)="onLogin()" class="login-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'login.username' | translate }}</mat-label>
              <input matInput
                     [(ngModel)]="loginForm.memberId"
                     name="memberId"
                     required
                     [placeholder]="'login.usernamePlaceholder' | translate">
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

            <mat-checkbox [(ngModel)]="rememberMe" name="rememberMe" class="remember-me">
              {{ 'login.rememberMe' | translate }}
            </mat-checkbox>

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
                <mat-label>{{ 'login.usernameForReset' | translate }}</mat-label>
                <input matInput [(ngModel)]="forgotUsername" name="forgotUsername">
                <mat-icon matSuffix>badge</mat-icon>
              </mat-form-field>
              <button mat-raised-button color="primary" class="full-width"
                      (click)="onRequestReset()" [disabled]="resetLoading || !forgotUsername">
                <mat-spinner *ngIf="resetLoading" diameter="18"></mat-spinner>
                <span *ngIf="!resetLoading">{{ 'login.sendResetLink' | translate }}</span>
              </button>
              <div *ngIf="resetMessage" class="reset-message">
                <mat-icon>info</mat-icon>
                {{ resetMessage }}
              </div>
            </div>
          </div>
        </ng-container>

        <!-- Step 2: org picker -->
        <ng-container *ngIf="loginStep === 'org-picker'">
          <p class="org-prompt">{{ 'login.selectOrgPrompt' | translate }}</p>
          <div class="org-list">
            <button *ngFor="let org of pendingOrgList"
                    mat-stroked-button
                    class="org-btn"
                    [disabled]="loginLoading"
                    (click)="onSelectOrg(org.id)">
              <mat-icon>corporate_fare</mat-icon>
              {{ org.name }}
            </button>
          </div>
          <div *ngIf="loginError" class="error-message">
            <mat-icon>error</mat-icon>
            {{ loginError }}
          </div>
          <button mat-button (click)="backToCredentials()">
            <mat-icon>arrow_back</mat-icon>
            {{ 'common.back' | translate }}
          </button>
        </ng-container>

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

    .remember-me {
      font-size: 14px;
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

    .org-prompt {
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 16px;
    }

    .org-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .org-btn {
      width: 100%;
      justify-content: flex-start;
      gap: 8px;
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
  rememberMe = false;

  // Multi-org state
  loginStep: 'credentials' | 'org-picker' = 'credentials';
  pendingPersonToken = '';
  pendingOrgList: OrgOption[] = [];

  showForgotForm = false;
  forgotUsername = '';
  resetLoading = false;
  resetMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private translate: TranslateService
  ) {}

  onLogin(): void {
    if (!this.loginForm.memberId || !this.loginForm.password) {
      this.loginError = this.translate.instant('login.messages.fieldsRequired');
      return;
    }

    this.loginLoading = true;
    this.loginError = null;

    this.authService.login(this.loginForm.memberId, this.loginForm.password, this.rememberMe).subscribe({
      next: (result) => {
        this.loginLoading = false;
        if (result.success && result.orgList?.length) {
          // Multi-org: show org picker
          this.pendingPersonToken = result.personToken!;
          this.pendingOrgList = result.orgList;
          this.loginStep = 'org-picker';
        } else if (result.success && result.member) {
          this.notificationService.success(this.translate.instant('login.messages.welcome'));
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

  onSelectOrg(orgId: number): void {
    this.loginLoading = true;
    this.loginError = null;
    this.authService.selectOrg(this.pendingPersonToken, orgId, this.rememberMe).subscribe({
      next: (result) => {
        this.loginLoading = false;
        if (result.success && result.member) {
          this.notificationService.success(this.translate.instant('login.messages.welcome'));
          this.loginForm = { memberId: '', password: '' };
          this.loginSuccess.emit();
        } else {
          this.loginError = result.message || this.translate.instant('login.messages.loginFailed');
        }
      },
      error: () => {
        this.loginLoading = false;
        this.loginError = this.translate.instant('login.messages.error');
      }
    });
  }

  backToCredentials(): void {
    this.loginStep = 'credentials';
    this.pendingPersonToken = '';
    this.pendingOrgList = [];
    this.loginError = null;
  }

  onRequestReset(): void {
    this.resetLoading = true;
    this.resetMessage = null;
    apolloClient.mutate({
      mutation: REQUEST_PASSWORD_RESET,
      variables: { username: this.forgotUsername }
    }).then(result => {
      this.resetLoading = false;
      this.resetMessage = (result.data as any).requestPasswordReset.message;
    }).catch(() => {
      this.resetLoading = false;
      this.resetMessage = this.translate.instant('login.messages.error');
    });
  }
}
