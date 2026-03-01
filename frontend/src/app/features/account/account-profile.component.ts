import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../shared/services/notification.service';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../shared/services/auth.service';
import { UiEventService } from '../../shared/services/ui-event.service';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';

const GET_MEMBER_PROFILE = gql`
  query MemberProfile($id: String!) {
    memberProfile(id: $id) {
      id
      phone
      dateOfBirth
      avatarUrl
    }
  }
`;

const UPDATE_PROFILE_EXTENDED = gql`
  mutation UpdateMemberProfileExtended(
    $id: String!, $firstName: String!, $lastName: String!, $particles: String, $email: String,
    $phone: String, $dateOfBirth: String
  ) {
    updateMemberProfile(id: $id, firstName: $firstName, lastName: $lastName, particles: $particles, email: $email, phone: $phone, dateOfBirth: $dateOfBirth) {
      id firstName lastName particles email phone dateOfBirth
    }
  }
`;

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
    MatDividerModule,
    MatSlideToggleModule,
    TranslateModule
  ],
  template: `
    <mat-card class="profile-card">
      <mat-card-header>
        <img *ngIf="avatarUrl" [src]="avatarUrl" mat-card-avatar class="avatar-img" alt="">
        <mat-icon *ngIf="!avatarUrl" mat-card-avatar>account_circle</mat-icon>
        <mat-card-title>{{ 'profile.title' | translate }}</mat-card-title>
        <mat-card-subtitle>{{ 'profile.subtitle' | translate:{ id: authService.currentUser?.id } }}</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>

        <h3 class="section-title">{{ 'profile.role' | translate }}</h3>
        <div class="role-section">
          <div class="role-display">
            <mat-icon>{{ roleIcon }}</mat-icon>
            <span class="role-label">{{ roleLabel | translate }}</span>
          </div>
        </div>

        <mat-divider class="section-divider"></mat-divider>

        <h3 class="section-title">{{ 'profile.details' | translate }}</h3>
        <div class="profile-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'profile.firstName' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.firstName"
                   name="firstName"
                   (blur)="onFieldBlur()">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'profile.particles' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.particles"
                   name="particles"
                   [placeholder]="'profile.particlesPlaceholder' | translate"
                   (blur)="onFieldBlur()">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'profile.lastName' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.lastName"
                   name="lastName"
                   (blur)="onFieldBlur()">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'profile.email' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.email"
                   name="email"
                   type="email"
                   [placeholder]="'profile.emailPlaceholder' | translate"
                   (blur)="onFieldBlur()">
          </mat-form-field>
        </div>

        <mat-divider class="section-divider"></mat-divider>

        <h3 class="section-title">{{ 'profile.contact' | translate }}</h3>
        <div class="profile-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'profile.phone' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="extendedForm.phone"
                   name="phone"
                   type="tel"
                   (blur)="onExtendedFieldBlur()">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'profile.dateOfBirth' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="extendedForm.dateOfBirth"
                   name="dateOfBirth"
                   type="date"
                   (blur)="onExtendedFieldBlur()">
          </mat-form-field>
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

    .avatar-img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .full-width {
      width: 100%;
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
export class AccountProfileComponent implements OnInit {
  @Output() openChangePassword = new EventEmitter<void>();

  profileForm = { firstName: '', lastName: '', particles: '', email: '' };
  private savedProfile = { firstName: '', lastName: '', particles: '', email: '' };
  extendedForm = { phone: '', dateOfBirth: '' };
  private savedExtended = { phone: '', dateOfBirth: '' };
  avatarUrl: string | null = null;
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
    private uiEventService: UiEventService,
    private notificationService: NotificationService,
    private translate: TranslateService
  ) {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        const snapshot = {
          firstName: user.firstName,
          lastName: user.lastName,
          particles: user.particles || '',
          email: user.email || ''
        };
        this.profileForm = { ...snapshot };
        this.savedProfile = { ...snapshot };
      }
    });
  }

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (!user) return;
    apolloClient.query({
      query: GET_MEMBER_PROFILE,
      variables: { id: user.id },
      fetchPolicy: 'network-only'
    }).then((result: any) => {
      const p = result.data?.memberProfile;
      if (p) {
        this.avatarUrl = p.avatarUrl ?? null;
        const snap = { phone: p.phone ?? '', dateOfBirth: p.dateOfBirth ?? '' };
        this.extendedForm = { ...snap };
        this.savedExtended = { ...snap };
      }
    }).catch(() => {});
  }

  onExtendedFieldBlur(): void {
    const f = this.extendedForm;
    const s = this.savedExtended;
    if (f.phone === s.phone && f.dateOfBirth === s.dateOfBirth) return;

    const user = this.authService.currentUser;
    if (!user) return;

    apolloClient.mutate({
      mutation: UPDATE_PROFILE_EXTENDED,
      variables: {
        id: user.id,
        firstName: this.profileForm.firstName || this.savedProfile.firstName,
        lastName: this.profileForm.lastName || this.savedProfile.lastName,
        particles: this.profileForm.particles || null,
        email: this.profileForm.email || null,
        phone: f.phone || null,
        dateOfBirth: f.dateOfBirth || null
      }
    }).then(() => {
      this.savedExtended = { ...f };
    }).catch(() => {
      this.extendedForm = { ...this.savedExtended };
      this.notificationService.error(this.translate.instant('profile.messages.updateFailed'));
    });
  }

  onFieldBlur(): void {
    const f = this.profileForm;
    const s = this.savedProfile;
    const changed = f.firstName !== s.firstName || f.lastName !== s.lastName
                 || f.particles !== s.particles || f.email !== s.email;
    if (!changed) return;

    // Silently reset empty required fields instead of saving
    if (!f.firstName.trim() || !f.lastName.trim()) {
      this.profileForm = { ...this.savedProfile };
      return;
    }

    this.authService.updateProfile(
      f.firstName.trim(),
      f.lastName.trim(),
      f.particles.trim() || null,
      f.email.trim() || null
    ).subscribe({
      next: () => {
        this.savedProfile = { ...this.profileForm };
      },
      error: () => {
        this.profileForm = { ...this.savedProfile };
        this.notificationService.error(this.translate.instant('profile.messages.updateFailed'));
      }
    });
  }

  onScheduleDisabledChange(disabled: boolean): void {
    this.scheduleDisabledLoading = true;
    this.authService.updateScheduleDisabled(disabled).subscribe({
      next: () => {
        this.scheduleDisabledLoading = false;
        this.uiEventService.scheduleReload$.next();
      },
      error: () => {
        this.scheduleDisabledLoading = false;
        this.notificationService.error(this.translate.instant('common.error'));
      }
    });
  }
}
