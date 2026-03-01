import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { NotificationService } from '../../shared/services/notification.service';

const GET_EMAIL_CONFIG = gql`
  query GetEmailConfig {
    emailConfig {
      host
      port
      secure
      user
      from
      bcc
      configured
    }
  }
`;

const SAVE_EMAIL_CONFIG = gql`
  mutation SaveEmailConfig($host: String!, $port: Int!, $secure: Boolean!, $user: String!, $password: String!, $from: String!, $bcc: String) {
    saveEmailConfig(host: $host, port: $port, secure: $secure, user: $user, password: $password, from: $from, bcc: $bcc) {
      success
      message
    }
  }
`;

const TEST_EMAIL_CONFIG = gql`
  mutation TestEmailConfig($testAddress: String!) {
    testEmailConfig(testAddress: $testAddress) {
      success
      message
    }
  }
`;

@Component({
  selector: 'app-manage-system-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    TranslateModule,
  ],
  template: `
    <div class="settings-wrap">

      <div *ngIf="loading" class="loading-center">
        <mat-progress-spinner mode="indeterminate" diameter="32"></mat-progress-spinner>
      </div>

      <div *ngIf="!loading" class="settings-body">

        <!-- Email / SMTP -->
        <div class="settings-section">
          <div class="section-header">
            <mat-icon class="section-icon">email</mat-icon>
            <div>
              <h3>{{ 'settings.email.title' | translate }}</h3>
              <p class="section-desc">{{ 'settings.email.description' | translate }}</p>
            </div>
            <span *ngIf="configured" class="configured-badge">
              <mat-icon>check_circle</mat-icon>
              Configured
            </span>
          </div>

          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'settings.email.smtpHost' | translate }}</mat-label>
              <input matInput [(ngModel)]="form.host" name="smtpHost"
                     [placeholder]="'settings.email.smtpHostPlaceholder' | translate">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'settings.email.encryption' | translate }}</mat-label>
              <mat-select [(ngModel)]="form.encryption" name="encryption" (ngModelChange)="onEncryptionChange($event)">
                <mat-option value="starttls">
                  <div class="encryption-option">
                    <span>{{ 'settings.email.starttls' | translate }}</span>
                  </div>
                </mat-option>
                <mat-option value="ssl">
                  <div class="encryption-option">
                    <span>{{ 'settings.email.ssl' | translate }}</span>
                  </div>
                </mat-option>
                <mat-option value="none">
                  <div class="encryption-option">
                    <span>{{ 'settings.email.none' | translate }}</span>
                  </div>
                </mat-option>
              </mat-select>
              <mat-hint>{{ encryptionHint | translate }}</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'settings.email.port' | translate }}</mat-label>
              <input matInput [(ngModel)]="form.port" name="smtpPort" type="number" min="1" max="65535">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'settings.email.username' | translate }}</mat-label>
              <input matInput [(ngModel)]="form.user" name="smtpUser" autocomplete="off">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'settings.email.password' | translate }}</mat-label>
              <input matInput [(ngModel)]="form.password" name="smtpPass" type="password"
                     [placeholder]="'settings.email.passwordPlaceholder' | translate"
                     autocomplete="new-password">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'settings.email.fromAddress' | translate }}</mat-label>
              <input matInput [(ngModel)]="form.from" name="smtpFrom" type="email"
                     [placeholder]="'settings.email.fromPlaceholder' | translate">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-span">
              <mat-label>{{ 'settings.email.bcc' | translate }}</mat-label>
              <input matInput [(ngModel)]="form.bcc" name="smtpBcc" type="email"
                     [placeholder]="'settings.email.bccPlaceholder' | translate">
              <mat-hint>{{ 'settings.email.bccHint' | translate }}</mat-hint>
            </mat-form-field>
          </div>

          <div class="action-row">
            <button mat-flat-button color="primary" (click)="saveConfig()" [disabled]="saving || !isFormValid">
              <mat-spinner *ngIf="saving" diameter="16"></mat-spinner>
              <mat-icon *ngIf="!saving">save</mat-icon>
              {{ 'settings.email.saveConfig' | translate }}
            </button>

            <div class="test-row">
              <mat-form-field appearance="outline" class="test-field">
                <mat-label>{{ 'settings.email.sendTest' | translate }}</mat-label>
                <input matInput [(ngModel)]="testAddress" name="testAddress" type="email"
                       [placeholder]="'settings.email.testPrompt' | translate">
              </mat-form-field>
              <button mat-stroked-button (click)="testEmail()" [disabled]="testing || !testAddress || !configured">
                <mat-spinner *ngIf="testing" diameter="16"></mat-spinner>
                <mat-icon *ngIf="!testing">send</mat-icon>
                {{ 'settings.email.sendTest' | translate }}
              </button>
            </div>
          </div>

          <div *ngIf="statusMessage" class="status-msg" [class.success]="statusSuccess" [class.error]="!statusSuccess">
            <mat-icon>{{ statusSuccess ? 'check_circle' : 'error' }}</mat-icon>
            {{ statusMessage }}
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    .settings-wrap {
      padding: 24px;
      max-width: 720px;
    }

    .loading-center {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .settings-body {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .settings-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .section-icon {
      color: var(--mat-sys-primary);
      margin-top: 2px;
    }

    .section-header h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .section-desc {
      margin: 0;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    .configured-badge {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--mat-sys-primary);
      background: var(--mat-sys-primary-container);
      padding: 4px 10px;
      border-radius: 12px;
      white-space: nowrap;
    }

    .configured-badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 16px;
    }

    .form-grid mat-form-field {
      width: 100%;
    }

    .full-span {
      grid-column: 1 / -1;
    }

    .action-row {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .test-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .test-field {
      flex: 1;
    }

    .status-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
    }

    .status-msg mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-msg.success {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }

    .status-msg.error {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }

    .encryption-option {
      display: flex;
      flex-direction: column;
    }
  `]
})
export class ManageSystemSettingsComponent implements OnInit {
  loading = true;
  saving = false;
  testing = false;
  configured = false;
  testAddress = '';
  statusMessage = '';
  statusSuccess = false;

  form = {
    host: '',
    port: 587,
    encryption: 'starttls',
    user: '',
    password: '',
    from: '',
    bcc: ''
  };

  get encryptionHint(): string {
    if (this.form.encryption === 'ssl') return 'settings.email.sslHint';
    if (this.form.encryption === 'none') return 'settings.email.noneHint';
    return 'settings.email.starttlsHint';
  }

  get isFormValid(): boolean {
    return !!(this.form.host && this.form.user && this.form.from);
  }

  constructor(
    private notificationService: NotificationService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    apolloClient.query({ query: GET_EMAIL_CONFIG, fetchPolicy: 'network-only' })
      .then((result: any) => {
        const cfg = result.data?.emailConfig;
        if (cfg) {
          this.form.host = cfg.host || '';
          this.form.port = cfg.port || 587;
          this.form.user = cfg.user || '';
          this.form.from = cfg.from || '';
          this.form.bcc = cfg.bcc || '';
          this.configured = cfg.configured;
          // Determine encryption mode from port+secure
          if (cfg.secure) {
            this.form.encryption = 'ssl';
          } else if (cfg.port === 25) {
            this.form.encryption = 'none';
          } else {
            this.form.encryption = 'starttls';
          }
        }
      })
      .catch(() => {})
      .finally(() => { this.loading = false; });
  }

  onEncryptionChange(mode: string): void {
    if (mode === 'ssl') this.form.port = 465;
    else if (mode === 'starttls') this.form.port = 587;
    else this.form.port = 25;
  }

  async saveConfig(): Promise<void> {
    this.saving = true;
    this.statusMessage = '';
    try {
      const result: any = await apolloClient.mutate({
        mutation: SAVE_EMAIL_CONFIG,
        variables: {
          host: this.form.host,
          port: Number(this.form.port),
          secure: this.form.encryption === 'ssl',
          user: this.form.user,
          password: this.form.password,
          from: this.form.from,
          bcc: this.form.bcc || null
        }
      });
      const r = result.data.saveEmailConfig;
      this.statusSuccess = r.success;
      this.statusMessage = r.message;
      if (r.success) {
        this.configured = !!(this.form.host && this.form.user && this.form.password);
        this.form.password = '';
        this.notificationService.success(this.translate.instant('common.saved'));
      }
    } catch (e: any) {
      this.statusSuccess = false;
      this.statusMessage = e.message || this.translate.instant('common.error');
    } finally {
      this.saving = false;
    }
  }

  async testEmail(): Promise<void> {
    if (!this.testAddress) return;
    this.testing = true;
    this.statusMessage = '';
    try {
      const result: any = await apolloClient.mutate({
        mutation: TEST_EMAIL_CONFIG,
        variables: { testAddress: this.testAddress }
      });
      const r = result.data.testEmailConfig;
      this.statusSuccess = r.success;
      this.statusMessage = r.message;
    } catch (e: any) {
      this.statusSuccess = false;
      this.statusMessage = e.message || this.translate.instant('common.error');
    } finally {
      this.testing = false;
    }
  }
}
