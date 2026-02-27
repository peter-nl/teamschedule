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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-account-profile',
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
    MatTooltipModule,
    MatDividerModule,
    MatSlideToggleModule,
    TranslateModule
  ],
  template: `
    <mat-card class="profile-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>account_circle</mat-icon>
        <mat-card-title>{{ 'profile.title' | translate }}</mat-card-title>
        <mat-card-subtitle>{{ 'profile.subtitle' | translate:{ id: authService.currentUser?.id } }}</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <form (ngSubmit)="onUpdateProfile()" class="profile-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'profile.firstName' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.firstName"
                   name="firstName"
                   required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'profile.particles' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.particles"
                   name="particles"
                   [placeholder]="'profile.particlesPlaceholder' | translate">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'profile.lastName' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.lastName"
                   name="lastName"
                   required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'profile.email' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.email"
                   name="email"
                   type="email"
                   [placeholder]="'profile.emailPlaceholder' | translate">
          </mat-form-field>

          <div class="form-actions">
            <button mat-icon-button type="button" (click)="resetProfileForm()" [matTooltip]="'common.cancel' | translate">
              <mat-icon>close</mat-icon>
            </button>
            <button mat-icon-button color="primary" type="submit" [disabled]="profileLoading" [matTooltip]="'profile.saveChanges' | translate">
              <mat-spinner *ngIf="profileLoading" diameter="20"></mat-spinner>
              <mat-icon *ngIf="!profileLoading">check</mat-icon>
            </button>
          </div>
        </form>

        <mat-divider class="section-divider"></mat-divider>

        <h3 class="section-title">{{ 'profile.role' | translate }}</h3>
        <div class="role-section">
          <div class="role-display">
            <mat-icon>{{ roleIcon }}</mat-icon>
            <span class="role-label">{{ roleLabel | translate }}</span>
          </div>
        </div>

        <mat-divider class="section-divider"></mat-divider>

        <ng-container *ngIf="!authService.isSysadmin">
          <h3 class="section-title">{{ 'account.scheduleTitle' | translate }}</h3>
          <div class="schedule-row">
            <div class="schedule-label-group">
              <span class="schedule-label">{{ 'account.scheduleDisabled' | translate }}</span>
              <span class="schedule-hint">{{ 'account.scheduleDisabledHint' | translate }}</span>
            </div>
            <mat-slide-toggle
              [checked]="authService.currentUser?.scheduleDisabled ?? false"
              [disabled]="scheduleDisabledLoading"
              (change)="onScheduleDisabledChange($event.checked)">
            </mat-slide-toggle>
          </div>
          <mat-divider class="section-divider"></mat-divider>
        </ng-container>

        <button mat-stroked-button class="change-password-btn" (click)="openChangePassword.emit()">
          <mat-icon>lock</mat-icon>
          {{ 'shell.account.changePassword' | translate }}
        </button>

      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .profile-card {
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

    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
    }

    .section-divider {
      margin: 32px 0;
    }

    .section-title {
      font-size: 16px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--mat-sys-primary);
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    .role-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .role-display {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--mat-sys-surface-container);
      border-radius: 12px;
    }

    .role-display mat-icon {
      color: var(--mat-sys-primary);
    }

    .role-label {
      font-size: 16px;
      font-weight: 500;
      text-transform: capitalize;
    }

    .change-password-btn {
      width: 100%;
    }

    .schedule-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 16px;
      background: var(--mat-sys-surface-container);
      border-radius: 12px;
    }

    .schedule-label-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .schedule-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .schedule-hint {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

  `]
})
export class AccountProfileComponent {
  @Output() openChangePassword = new EventEmitter<void>();

  profileForm = {
    firstName: '',
    lastName: '',
    particles: '',
    email: ''
  };
  profileLoading = false;
  scheduleDisabledLoading = false;

  get roleIcon(): string {
    if (this.authService.isSysadmin) return 'security';
    if (this.authService.isOrgAdmin) return 'admin_panel_settings';
    if (this.authService.isTeamAdmin) return 'manage_accounts';
    return 'person';
  }

  get roleLabel(): string {
    if (this.authService.isSysadmin) return 'common.role.sysadmin';
    if (this.authService.isOrgAdmin) return 'common.role.orgadmin';
    if (this.authService.isTeamAdmin) return 'common.role.teamadmin';
    return 'common.role.user';
  }

  constructor(
    public authService: AuthService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.profileForm = {
          firstName: user.firstName,
          lastName: user.lastName,
          particles: user.particles || '',
          email: user.email || ''
        };
      }
    });
  }

  resetProfileForm(): void {
    const user = this.authService.currentUser;
    if (user) {
      this.profileForm = {
        firstName: user.firstName,
        lastName: user.lastName,
        particles: user.particles || '',
        email: user.email || ''
      };
    }
  }

  onScheduleDisabledChange(disabled: boolean): void {
    this.scheduleDisabledLoading = true;
    this.authService.updateScheduleDisabled(disabled).subscribe({
      next: () => { this.scheduleDisabledLoading = false; },
      error: () => {
        this.scheduleDisabledLoading = false;
        this.snackBar.open(this.translate.instant('common.error'), this.translate.instant('common.close'), { duration: 3000 });
      }
    });
  }

  onUpdateProfile(): void {
    if (!this.profileForm.firstName || !this.profileForm.lastName) {
      this.snackBar.open(this.translate.instant('profile.messages.nameRequired'), this.translate.instant('common.close'), { duration: 3000 });
      return;
    }

    this.profileLoading = true;

    this.authService.updateProfile(
      this.profileForm.firstName,
      this.profileForm.lastName,
      this.profileForm.particles || null,
      this.profileForm.email || null
    ).subscribe({
      next: () => {
        this.profileLoading = false;
        this.snackBar.open(this.translate.instant('profile.messages.updated'), this.translate.instant('common.close'), { duration: 3000 });
      },
      error: (error) => {
        this.profileLoading = false;
        this.snackBar.open(this.translate.instant('profile.messages.updateFailed'), this.translate.instant('common.close'), { duration: 3000 });
        console.error('Update profile error:', error);
      }
    });
  }

}
