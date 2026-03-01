import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService } from '../../shared/services/auth.service';
import { UiEventService } from '../../shared/services/ui-event.service';

const REQUEST_DEMO = gql`
  mutation RequestDemo($email: String!, $lang: String) {
    requestDemo(email: $email, lang: $lang) {
      success
      message
    }
  }
`;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MatIconModule],
  template: `
    <div class="home-container">
      <img src="favicon.svg" alt="TeamSchedule" class="home-logo">
      <h1 class="home-title">{{ 'shell.appTitle' | translate }}</h1>
      <p class="home-text" *ngIf="!authService.isLoggedIn">
        {{ 'home.guestIntro' | translate }}<br>
        <a class="home-login-link" (click)="onLoginClick()">{{ 'home.loginWord' | translate }}</a>{{ 'home.guestCta' | translate }}
      </p>
      <p class="home-text" *ngIf="authService.isLoggedIn">{{ 'home.loggedIn' | translate }}</p>

      <!-- Try Demo card (guests only) -->
      <div class="demo-card" *ngIf="!authService.isLoggedIn">
        <div class="demo-card-header">
          <mat-icon>play_circle</mat-icon>
          <span>{{ 'demo.tryDemo' | translate }}</span>
        </div>
        <p class="demo-card-desc">{{ 'demo.cardDesc' | translate }}</p>

        <div *ngIf="!demoSent">
          <input
            class="demo-email-input"
            type="email"
            [(ngModel)]="demoEmail"
            [placeholder]="'demo.emailPlaceholder' | translate"
            (keydown.enter)="submitDemo()"
            [disabled]="demoLoading">
          <button class="demo-submit-btn" (click)="submitDemo()" [disabled]="demoLoading || !demoEmail.trim()">
            <mat-icon *ngIf="demoLoading">hourglass_empty</mat-icon>
            {{ (demoLoading ? 'demo.checking' : 'demo.startButton') | translate }}
          </button>
          <p class="demo-error" *ngIf="demoError">{{ demoError }}</p>
        </div>

        <div class="demo-success" *ngIf="demoSent">
          <mat-icon>mark_email_read</mat-icon>
          <p>{{ 'demo.successText' | translate: { email: demoEmail } }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 24px;
      padding: 48px 24px;
      text-align: center;
    }

    .home-logo {
      width: 120px;
      height: 120px;
    }

    .home-title {
      font-size: 32px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      margin: 0;
    }

    .home-text {
      font-size: 16px;
      color: var(--mat-sys-on-surface-variant);
      max-width: 420px;
      line-height: 1.6;
      margin: 0;
    }

    .home-login-link {
      color: var(--mat-sys-primary);
      cursor: pointer;
      text-decoration: underline;
    }

    .home-login-link:hover {
      color: var(--mat-sys-primary-container);
    }

    .demo-card {
      background: var(--mat-sys-surface-container);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 100%;
      text-align: left;
    }

    .demo-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      margin-bottom: 8px;
    }

    .demo-card-header mat-icon {
      color: var(--mat-sys-primary);
    }

    .demo-card-desc {
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 16px;
      line-height: 1.5;
    }

    .demo-email-input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 14px;
      border: 1px solid var(--mat-sys-outline);
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      margin-bottom: 10px;
      outline: none;
    }

    .demo-email-input:focus {
      border-color: var(--mat-sys-primary);
    }

    .demo-submit-btn {
      width: 100%;
      padding: 10px 16px;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: opacity 0.15s;
    }

    .demo-submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .demo-error {
      font-size: 13px;
      color: var(--mat-sys-error);
      margin: 8px 0 0;
    }

    .demo-success {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      color: var(--mat-sys-on-surface);
    }

    .demo-success mat-icon {
      color: var(--mat-sys-primary);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .demo-success p {
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
    }
  `]
})
export class HomeComponent implements OnInit {
  demoEmail = '';
  demoLoading = false;
  demoSent = false;
  demoError = '';

  constructor(
    public authService: AuthService,
    private uiEventService: UiEventService,
    private translate: TranslateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (user && !this.authService.isSysadmin && !user.scheduleDisabled) {
      this.router.navigate(['/schedule']);
    }
  }

  onLoginClick(): void {
    this.uiEventService.openLogin$.next();
  }

  async submitDemo(): Promise<void> {
    if (!this.demoEmail.trim() || this.demoLoading) return;
    this.demoLoading = true;
    this.demoError = '';
    try {
      const result: any = await apolloClient.mutate({
        mutation: REQUEST_DEMO,
        variables: { email: this.demoEmail.trim(), lang: this.translate.currentLang || 'en' }
      });
      const { success, message } = result.data.requestDemo;
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
