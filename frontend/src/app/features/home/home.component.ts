import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService, OrgOption } from '../../shared/services/auth.service';

const REQUEST_DEMO_CONFIRMATION = gql`
  mutation RequestDemoConfirmation($email: String!, $lang: String) {
    requestDemoConfirmation(email: $email, lang: $lang) {
      success
      message
    }
  }
`;

const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email) { success message }
  }
`;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, MatIconModule],
  template: `
    <div class="home-page">

      <!-- Hero -->
      <div class="home-hero">
        <img src="favicon.svg" alt="TeamSchedule" class="home-logo">
        <h1 class="home-title">{{ 'shell.appTitle' | translate }}</h1>
        <p class="home-tagline">{{ 'home.tagline' | translate }}</p>
      </div>

      <!-- Three cards — always visible -->
      <div class="home-cards">

        <!-- Card 1a: Login (guest) -->
        <div class="home-card" *ngIf="!authService.isLoggedIn">
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

        <!-- Card 1b: Signed-in / Logout (logged in) -->
        <div class="home-card" *ngIf="authService.isLoggedIn">
          <div class="card-header">
            <mat-icon>account_circle</mat-icon>
            <span>{{ displayName }}</span>
          </div>
          <p class="card-desc">{{ welcomeMessage }}</p>
          <button class="card-btn card-btn-outline" (click)="onLogout()">
            <mat-icon>logout</mat-icon>
            {{ 'login.signOut' | translate }}
          </button>
        </div>

        <!-- Card 2: Demo -->
        <div class="home-card">
          <div class="card-header">
            <mat-icon>play_circle</mat-icon>
            <span>{{ 'demo.tryDemo' | translate }}</span>
          </div>
          <p class="card-desc">{{ 'demo.cardDesc' | translate }}</p>

          <ng-container *ngIf="!demoSent">
            <label class="card-label">{{ 'login.email' | translate }}</label>
            <input class="card-input"
                   type="email"
                   [(ngModel)]="demoEmail"
                   [placeholder]="'demo.emailPlaceholder' | translate"
                   (keydown.enter)="submitDemo()"
                   [disabled]="demoLoading">
            <button class="card-btn" (click)="submitDemo()" [disabled]="demoLoading || !demoEmail.trim()">
              <mat-icon *ngIf="demoLoading">hourglass_empty</mat-icon>
              {{ (demoLoading ? 'demo.checking' : 'demo.startButton') | translate }}
            </button>
            <p class="card-error-text" *ngIf="demoError">{{ demoError }}</p>
          </ng-container>

          <div class="card-success" *ngIf="demoSent">
            <mat-icon>mark_email_read</mat-icon>
            <p>{{ 'demo.successText' | translate: { email: demoEmail } }}</p>
          </div>
        </div>

        <!-- Card 3: Documentation -->
        <div class="home-card">
          <div class="card-header">
            <mat-icon>menu_book</mat-icon>
            <span>{{ 'home.docsCard.title' | translate }}</span>
          </div>
          <p class="card-desc">{{ 'home.docsCard.desc' | translate }}</p>
          <a class="card-btn" [routerLink]="['/docs']">
            <mat-icon>open_in_new</mat-icon>
            {{ 'home.docsCard.button' | translate }}
          </a>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .home-page {
      height: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 24px 80px;
      gap: 40px;
    }

    /* Hero */
    .home-hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      text-align: center;
    }

    .home-logo { width: 80px; height: 80px; }

    .home-title {
      font-size: 28px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      margin: 0;
    }

    .home-tagline {
      font-size: 15px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0;
    }

    /* Cards row */
    .home-cards {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      justify-content: center;
      width: 100%;
      max-width: 1200px;
    }

    /* All three cards share the same base style */
    .home-card {
      flex: 1;
      min-width: 300px;
      max-width: 400px;
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
      flex: 1;
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
      color: var(--mat-sys-error);
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      padding: 8px 12px;
      border-radius: 8px;
    }

    .card-error mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }

    .card-error-text {
      font-size: 13px;
      color: var(--mat-sys-error);
      margin: 0;
    }

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
      text-decoration: none;
      transition: opacity 0.15s;
      margin-top: 4px;
    }

    .card-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Forgot password */
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

    /* Org picker */
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

    /* Success state (demo) */
    .card-success {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      color: var(--mat-sys-on-surface);
    }

    .card-success mat-icon {
      color: var(--mat-sys-primary);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .card-success p { font-size: 14px; line-height: 1.5; margin: 0; }

    .card-btn-outline {
      background: transparent;
      color: var(--mat-sys-primary);
      border: 1px solid var(--mat-sys-outline);
    }

    .card-btn-outline:hover { background: var(--mat-sys-surface-container-high); }

    /* Mobile */
    @media (max-width: 600px) {
      .home-page { padding: 32px 16px 60px; }
      .home-card { min-width: 100%; max-width: 100%; }
    }
  `]
})
export class HomeComponent implements OnInit {
  // Login state
  loginForm = { email: '', password: '' };
  loginLoading = false;
  loginError: string | null = null;
  hidePassword = true;
  rememberMe = false;
  loginStep: 'credentials' | 'org-picker' = 'credentials';
  pendingPersonToken = '';
  pendingOrgList: OrgOption[] = [];
  showForgotForm = false;
  forgotEmail = '';
  resetLoading = false;
  resetMessage: string | null = null;

  // Demo state
  demoEmail = '';
  demoLoading = false;
  demoSent = false;
  demoError = '';

  constructor(
    public authService: AuthService,
    private translate: TranslateService,
    private router: Router
  ) {}

  get displayName(): string {
    const u = this.authService.currentUser;
    if (!u) return '';
    if (this.authService.isSysadmin) return this.translate.instant('home.sysadminRole');
    const parts = [u.firstName, u.particles, u.lastName].filter(Boolean);
    return parts.join(' ');
  }

  get welcomeMessage(): string {
    if (this.authService.isSysadmin) return this.translate.instant('home.sysadminWelcome');
    return this.translate.instant('home.loggedInWelcome');
  }

  onLogout(): void {
    this.authService.logout();
  }

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (user && !this.authService.isSysadmin && !user.scheduleDisabled) {
      this.router.navigate(['/schedule']);
    }
  }

  // ── Login ──────────────────────────────────────────

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
          this.pendingPersonToken = result.personToken!;
          this.pendingOrgList = result.orgList;
          this.loginStep = 'org-picker';
        } else if (result.success && result.member) {
          this.loginForm = { email: '', password: '' };
          if (!this.authService.isSysadmin) {
            this.router.navigate(['/schedule']);
          }
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

  onSelectOrg(orgId: number): void {
    this.loginLoading = true;
    this.loginError = null;
    this.authService.selectOrg(this.pendingPersonToken, orgId, this.rememberMe).subscribe({
      next: (result) => {
        this.loginLoading = false;
        if (result.success && result.member) {
          this.loginForm = { email: '', password: '' };
          if (!this.authService.isSysadmin) {
            this.router.navigate(['/schedule']);
          }
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
    }).then((result: any) => {
      this.resetLoading = false;
      this.resetMessage = result.data.requestPasswordReset.message;
    }).catch(() => {
      this.resetLoading = false;
      this.resetMessage = this.translate.instant('login.messages.error');
    });
  }

  // ── Demo ───────────────────────────────────────────

  async submitDemo(): Promise<void> {
    if (!this.demoEmail.trim() || this.demoLoading) return;
    this.demoLoading = true;
    this.demoError = '';
    try {
      const result: any = await apolloClient.mutate({
        mutation: REQUEST_DEMO_CONFIRMATION,
        variables: { email: this.demoEmail.trim(), lang: this.translate.currentLang || 'en' }
      });
      const { success, message } = result.data.requestDemoConfirmation;
      if (success) {
        this.demoSent = true;
      } else {
        this.demoError = message || this.translate.instant('common.error');
      }
    } catch {
      this.demoError = this.translate.instant('common.error');
    } finally {
      this.demoLoading = false;
    }
  }
}
