import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService, AuthMember } from '../services/auth.service';

const CLAIM_DEMO = gql`
  mutation ClaimDemo($orgName: String!, $newAdminId: String!, $newPassword: String!) {
    claimDemo(orgName: $orgName, newAdminId: $newAdminId, newPassword: $newPassword) {
      success
      message
      member {
        id firstName lastName particles email role organisationId
        scheduleDisabled isOrgAdmin teamAdminIds isDemo
      }
      token
    }
  }
`;

@Component({
  selector: 'app-claim-demo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MatIconModule],
  template: `
    <div class="claim-backdrop" (click)="onBackdrop($event)">
      <div class="claim-dialog">
        <div class="claim-header">
          <span>{{ 'demo.claimTitle' | translate }}</span>
          <button class="claim-close" (click)="close.emit()"><mat-icon>close</mat-icon></button>
        </div>
        <p class="claim-desc">{{ 'demo.claimDesc' | translate }}</p>

        <label class="claim-label">{{ 'demo.orgNameLabel' | translate }}</label>
        <input class="claim-input" type="text" [(ngModel)]="orgName" [placeholder]="'demo.orgNamePlaceholder' | translate" [disabled]="loading">

        <label class="claim-label">{{ 'demo.newIdLabel' | translate }}</label>
        <input class="claim-input" type="text" [(ngModel)]="newAdminId" [placeholder]="'demo.newIdPlaceholder' | translate"
               maxlength="10" [disabled]="loading">
        <p class="claim-hint">{{ 'demo.newIdHint' | translate }}</p>

        <label class="claim-label">{{ 'demo.newPasswordLabel' | translate }}</label>
        <input class="claim-input" type="password" [(ngModel)]="newPassword" [placeholder]="'demo.newPasswordPlaceholder' | translate" [disabled]="loading">

        <p class="claim-error" *ngIf="error">{{ error }}</p>

        <button class="claim-btn" (click)="submit()" [disabled]="loading || !canSubmit">
          <mat-icon *ngIf="loading">hourglass_empty</mat-icon>
          {{ (loading ? 'demo.checking' : 'demo.claimButton') | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .claim-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .claim-dialog {
      background: var(--mat-sys-surface);
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }

    .claim-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 18px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      margin-bottom: 8px;
    }

    .claim-close {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--mat-sys-on-surface-variant);
      display: flex;
      padding: 4px;
      border-radius: 8px;
    }

    .claim-close:hover { background: var(--mat-sys-surface-container-highest); }

    .claim-desc {
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 20px;
      line-height: 1.5;
    }

    .claim-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      margin-bottom: 4px;
    }

    .claim-input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 14px;
      border: 1px solid var(--mat-sys-outline);
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      margin-bottom: 12px;
      outline: none;
    }

    .claim-input:focus { border-color: var(--mat-sys-primary); }

    .claim-hint {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      margin: -8px 0 12px;
    }

    .claim-error {
      font-size: 13px;
      color: var(--mat-sys-error);
      margin: 0 0 12px;
    }

    .claim-btn {
      width: 100%;
      padding: 12px;
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

    .claim-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class ClaimDemoDialogComponent {
  @Output() close = new EventEmitter<void>();
  @Output() claimed = new EventEmitter<{ member: AuthMember; token: string }>();

  orgName = '';
  newAdminId = '';
  newPassword = '';
  loading = false;
  error = '';

  constructor(
    private authService: AuthService,
    private translate: TranslateService
  ) {}

  get canSubmit(): boolean {
    return !!this.orgName.trim() && !!this.newAdminId.trim() && !!this.newPassword;
  }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('claim-backdrop')) {
      this.close.emit();
    }
  }

  async submit(): Promise<void> {
    if (!this.canSubmit || this.loading) return;
    this.loading = true;
    this.error = '';
    try {
      const result: any = await apolloClient.mutate({
        mutation: CLAIM_DEMO,
        variables: { orgName: this.orgName.trim(), newAdminId: this.newAdminId.trim(), newPassword: this.newPassword }
      });
      const { success, message, member, token } = result.data.claimDemo;
      if (success && member && token) {
        this.claimed.emit({ member, token });
      } else {
        this.error = message || this.translate.instant('common.error');
      }
    } catch (err: any) {
      this.error = err?.message || this.translate.instant('common.error');
    } finally {
      this.loading = false;
    }
  }
}
