import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService } from '../../shared/services/auth.service';

const SETUP_DEMO = gql`
  mutation SetupDemo($token: String!, $orgName: String!, $password: String!) {
    setupDemo(token: $token, orgName: $orgName, password: $password) {
      success message token
      member { id memberNo firstName lastName particles email role organisationId isOrgAdmin teamAdminIds scheduleDisabled isDemo }
    }
  }
`;

@Component({
  selector: 'app-demo-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule],
  template: `
    <div class="setup-container">
      <img src="favicon.svg" alt="TeamSchedule" class="setup-logo">
      <h1 class="setup-title">{{ 'demo.setupTitle' | translate }}</h1>

      <div *ngIf="tokenInvalid" class="setup-error-card">
        <mat-icon>error_outline</mat-icon>
        <p>{{ 'demo.invalidToken' | translate }}</p>
      </div>

      <div *ngIf="!tokenInvalid && !completed" class="setup-card">
        <p class="setup-desc">{{ 'demo.setupDesc' | translate }}</p>

        <label class="setup-label">{{ 'demo.orgNameLabel' | translate }}</label>
        <input
          class="setup-input"
          type="text"
          [(ngModel)]="orgName"
          [placeholder]="'demo.orgNamePlaceholder' | translate"
          [disabled]="loading">


        <label class="setup-label">{{ 'demo.passwordLabel' | translate }}</label>
        <input
          class="setup-input"
          type="password"
          [(ngModel)]="password"
          [placeholder]="'demo.passwordPlaceholder' | translate"
          [disabled]="loading"
          (keydown.enter)="onSetup()">

        <p class="setup-error" *ngIf="error">{{ error }}</p>

        <button
          class="setup-btn"
          (click)="onSetup()"
          [disabled]="loading || !orgName.trim() || !password">
          <mat-icon *ngIf="loading">hourglass_empty</mat-icon>
          {{ (loading ? 'demo.settingUp' : 'demo.setupButton') | translate }}
        </button>
      </div>

      <div *ngIf="completed" class="setup-success">
        <mat-icon>check_circle</mat-icon>
        <p>{{ 'demo.claimSuccess' | translate }}</p>
      </div>
    </div>
  `,
  styles: [`
    .setup-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      gap: 24px;
      padding: 48px 24px;
      text-align: center;
    }

    .setup-logo {
      width: 80px;
      height: 80px;
    }

    .setup-title {
      font-size: 28px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      margin: 0;
    }

    .setup-card {
      background: var(--mat-sys-surface-container);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 16px;
      padding: 28px;
      max-width: 400px;
      width: 100%;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .setup-desc {
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 8px;
      line-height: 1.5;
    }

    .setup-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      margin-top: 8px;
    }

    .setup-input {
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

    .setup-input:focus {
      border-color: var(--mat-sys-primary);
    }

    .setup-btn {
      margin-top: 16px;
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

    .setup-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .setup-error {
      font-size: 13px;
      color: var(--mat-sys-error);
      margin: 4px 0 0;
    }

    .setup-error-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      border-radius: 12px;
      padding: 20px 24px;
      max-width: 400px;
      width: 100%;
    }

    .setup-error-card mat-icon {
      flex-shrink: 0;
    }

    .setup-success {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: var(--mat-sys-on-surface);
    }

    .setup-success mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--mat-sys-primary);
    }

    .setup-success p {
      font-size: 16px;
      margin: 0;
    }
  `]
})
export class DemoSetupComponent implements OnInit {
  token = '';
  orgName = '';
  password = '';
  loading = false;
  completed = false;
  error = '';
  tokenInvalid = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.tokenInvalid = true;
    }
  }

  async onSetup(): Promise<void> {
    if (this.loading || !this.orgName.trim() || !this.password) return;
    this.loading = true;
    this.error = '';
    try {
      const result: any = await apolloClient.mutate({
        mutation: SETUP_DEMO,
        variables: {
          token: this.token,
          orgName: this.orgName.trim(),
          password: this.password
        }
      });
      const { success, message, member, token } = result.data.setupDemo;
      if (success && token) {
        this.authService.setAuth(member, token);
        this.completed = true;
        setTimeout(() => this.router.navigate(['/schedule']), 1500);
      } else {
        this.error = message || this.translate.instant('common.error');
      }
    } catch (e: any) {
      const msg = e?.graphQLErrors?.[0]?.message || e?.message || this.translate.instant('common.error');
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')) {
        this.tokenInvalid = true;
      } else {
        this.error = msg;
      }
    } finally {
      this.loading = false;
    }
  }
}
