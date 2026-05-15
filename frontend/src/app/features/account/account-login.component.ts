import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../shared/services/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService, OrgOption } from '../../shared/services/auth.service';

const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email) { success message }
  }
`;

@Component({
  selector: 'app-account-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule],
  template: `
    <div class="home-card">
      <div class="card-header">
        <mat-icon>login</mat-icon>
        <span>{{ 'login.title' | translate }}</span>
      </div>

      <!-- Step 1: credentials -->
      <ng-container *ngIf="loginStep === 'credentials'">
        <p class="card-desc">{{ 'login.subtitle' | translate }}</p>

        <label class="card-label">{{ 'login.email' | translate }}</label>
        <input class="card-input"
               type="text"
               [(ngModel)]="loginForm.email"
               [placeholder]="'login.emailPlaceholder' | translate"
               (keydown.enter)="onLogin()"
               [disabled]="loginLoading">

        <label class="card-label">{{ 'login.password' | translate }}</label>
        <div class="password-row">
          <input class="card-input password-input"
                 [type]="hidePassword ? 'password' : 'text'"
                 [(ngModel)]="loginForm.password"
                 [placeholder]="'login.passwordPlaceholder' | translate"
                 (keydown.enter)="onLogin()"
                 [disabled]="loginLoading">
          <button class="password-toggle" type="button" (click)="hidePassword = !hidePassword">
            <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </div>

        <label class="remember-row">
          <input type="checkbox" [(ngModel)]="rememberMe">
          <span>{{ 'login.rememberMe' | translate }}</span>
        </label>

        <div class="card-error" *ngIf="loginError">
          <mat-icon>error_outline</mat-icon>
          {{ loginError }}
        </div>

        <button class="card-btn" (click)="onLogin()" [disabled]="loginLoading">
          <mat-icon *ngIf="loginLoading">hourglass_empty</mat-icon>
          {{ (loginLoading ? 'common.loading' : 'login.signIn') | translate }}
        </button>

        <div class="forgot-section">
          <button class="forgot-link" type="button" (click)="showForgotForm = !showForgotForm">
            {{ 'login.forgotPassword' | translate }}
          </button>
          <div *ngIf="showForgotForm" class="forgot-form">
            <label class="card-label">{{ 'login.emailForReset' | translate }}</label>
            <input class="card-input"
                   type="text"
                   [(ngModel)]="forgotEmail"
                   [disabled]="resetLoading">
            <button class="card-btn" (click)="onRequestReset()"
                    [disabled]="resetLoading || !forgotEmail">
              {{ 'login.sendResetLink' | translate }}
            </button>
            <p class="reset-message" *ngIf="resetMessage">{{ resetMessage }}</p>
          </div>
        </div>
      </ng-container>

      <!-- Step 2: org picker -->
      <ng-container *ngIf="loginStep === 'org-picker'">
        <p class="card-desc">{{ 'login.selectOrgPrompt' | translate }}</p>
        <div class="org-list">
          <button class="org-btn" *ngFor="let org of pendingOrgList"
                  (click)="onSelectOrg(org.id)" [disabled]="loginLoading">
            <mat-icon>corporate_fare</mat-icon>
            {{ org.name }}
          </button>
        </div>
        <div class="card-error" *ngIf="loginError">
          <mat-icon>error_outline</mat-icon>
          {{ loginError }}
        </div>
        <button class="forgot-link" type="button" (click)="backToCredentials()">
          <mat-icon>arrow_back</mat-icon>
          {{ 'common.back' | translate }}
        </button>
      </ng-container>
    </div>
  `,
  styles: [`
    .home-card {
      width: 360px;
      background: var(--mat-sys-surface-container);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      margin-bottom: 0;
    }

    .card-header mat-icon { color: var(--mat-sys-primary); }

    .card-desc {
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0;
      line-height: 1.5;
    }

    .card-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      margin-top: 4px;
    }

    .card-input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 14px;
      border: 1px solid var(--mat-sys-outline);
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      outline: none;
    }

    .card-input:focus { border-color: var(--mat-sys-primary); }
    .card-input:disabled { opacity: 0.5; }

    .password-row {
      display: flex;
      align-items: center;
      position: relative;
    }

    .password-row .password-input { flex: 1; padding-right: 44px; }

    .password-toggle {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--mat-sys-on-surface-variant);
      padding: 4px;
      display: flex;
      align-items: center;
    }

    .password-toggle mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .remember-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
      cursor: pointer;
    }

    .card-error {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      padding: 8px 12px;
      border-radius: 8px;
    }

    .card-error mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }

    .card-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 10px 16px;
      box-sizing: border-box;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: opacity 0.15s;
      margin-top: 4px;
    }

    .card-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .forgot-section { margin-top: 4px; }

    .forgot-link {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 13px;
      color: var(--mat-sys-primary);
      padding: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      font-family: inherit;
    }

    .forgot-link:hover { text-decoration: underline; }
    .forgot-link mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .forgot-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }

    .reset-message {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0;
      line-height: 1.5;
    }

    .org-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .org-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 10px 14px;
      background: var(--mat-sys-surface);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      cursor: pointer;
      color: var(--mat-sys-on-surface);
      text-align: left;
      transition: background 0.15s;
    }

    .org-btn:hover { background: var(--mat-sys-surface-container-high); }
    .org-btn mat-icon { color: var(--mat-sys-primary); font-size: 18px; width: 18px; height: 18px; }
  `]
})
export class AccountLoginComponent {
  @Output() loginSuccess = new EventEmitter<void>();

  loginForm = {
    email: '',
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
  forgotEmail = '';
  resetLoading = false;
  resetMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private translate: TranslateService
  ) {}

  onLogin(): void {
    if (!this.loginForm.email || !this.loginForm.password) {
      this.loginError = this.translate.instant('login.messages.fieldsRequired');
      return;
    }

    this.loginLoading = true;
    this.loginError = null;

    this.authService.login(this.loginForm.email, this.loginForm.password, this.rememberMe).subscribe({
      next: (result) => {
        this.loginLoading = false;
        if (result.success && result.orgList?.length) {
          // Multi-org: show org picker
          this.pendingPersonToken = result.personToken!;
          this.pendingOrgList = result.orgList;
          this.loginStep = 'org-picker';
        } else if (result.success && result.member) {
          this.notificationService.success(this.translate.instant('login.messages.welcome'));
          this.loginForm = { email: '', password: '' };
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
          this.loginForm = { email: '', password: '' };
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
