import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { SlideInPanelRef } from '../services/slide-in-panel.service';

@Component({
  selector: 'app-change-password-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    TranslateModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon>lock</mat-icon>
          {{ 'password.title' | translate }}
        </h2>
        <button class="panel-close" (click)="panelRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-divider></mat-divider>

      <div class="panel-content">
        <form (ngSubmit)="onChangePassword()" class="password-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'password.currentPassword' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="form.currentPassword"
                   name="currentPassword"
                   [type]="hideCurrentPassword ? 'password' : 'text'"
                   required>
            <button mat-icon-button matSuffix type="button" (click)="hideCurrentPassword = !hideCurrentPassword">
              <mat-icon>{{ hideCurrentPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'password.newPassword' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="form.newPassword"
                   name="newPassword"
                   [type]="hideNewPassword ? 'password' : 'text'"
                   required>
            <button mat-icon-button matSuffix type="button" (click)="hideNewPassword = !hideNewPassword">
              <mat-icon>{{ hideNewPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'password.confirmPassword' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="form.confirmPassword"
                   name="confirmPassword"
                   [type]="hideConfirmPassword ? 'password' : 'text'"
                   required>
            <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword">
              <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <button mat-raised-button type="submit" [disabled]="loading" class="submit-btn">
            <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
            <span *ngIf="!loading">{{ 'password.changeButton' | translate }}</span>
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .panel-header {
      display: flex;
      align-items: center;
      padding: 12px 8px 12px 20px;
      flex-shrink: 0;
    }

    .panel-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      flex: 1;
      color: var(--mat-sys-on-surface);
    }

    .panel-header h2 mat-icon {
      color: var(--mat-sys-primary);
    }

    .panel-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      color: var(--mat-sys-on-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .panel-close:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px 20px;
    }

    .password-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 400px;
    }

    .full-width {
      width: 100%;
    }

    .submit-btn {
      height: 48px;
      margin-top: 8px;
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 4px;
    }
  `]
})
export class ChangePasswordPanelComponent {
  form = { currentPassword: '', newPassword: '', confirmPassword: '' };
  loading = false;
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  constructor(
    public panelRef: SlideInPanelRef<ChangePasswordPanelComponent>,
    private authService: AuthService,
    private notificationService: NotificationService,
    private translate: TranslateService
  ) {}

  onChangePassword(): void {
    if (!this.form.currentPassword || !this.form.newPassword || !this.form.confirmPassword) {
      this.notificationService.error(this.translate.instant('password.messages.fieldsRequired'));
      return;
    }
    if (this.form.newPassword !== this.form.confirmPassword) {
      this.notificationService.error(this.translate.instant('password.messages.mismatch'));
      return;
    }

    this.loading = true;
    this.authService.changePassword(this.form.currentPassword, this.form.newPassword).subscribe({
      next: (result) => {
        this.loading = false;
        if (result.success) {
          this.notificationService.success(this.translate.instant('password.messages.changed'));
          this.form = { currentPassword: '', newPassword: '', confirmPassword: '' };
          this.panelRef.close();
        } else {
          this.notificationService.error(result.message || this.translate.instant('password.messages.changeFailed'));
        }
      },
      error: () => {
        this.loading = false;
        this.notificationService.error(this.translate.instant('password.messages.changeFailed'));
      }
    });
  }
}
