import { Component } from '@angular/core';
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
            <mat-icon>{{ authService.currentUser?.role === 'manager' ? 'admin_panel_settings' : 'person' }}</mat-icon>
            <span class="role-label">{{ (authService.currentUser?.role === 'manager' ? 'common.manager' : 'common.user') | translate }}</span>
          </div>
        </div>

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

  `]
})
export class AccountProfileComponent {
  profileForm = {
    firstName: '',
    lastName: '',
    particles: '',
    email: ''
  };
  profileLoading = false;

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
