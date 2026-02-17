import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService } from '../services/auth.service';
import { SlideInPanelRef, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';

export interface MemberEditDialogData {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    particles: string | null;
    email: string | null;
    role: string;
    teams: { id: string; name: string }[];
  };
  allTeams: { id: string; name: string }[];
  isSelf: boolean;
  isManager: boolean;
}

const UPDATE_MEMBER_MUTATION = gql`
  mutation UpdateMemberProfile($id: String!, $firstName: String!, $lastName: String!, $particles: String, $email: String) {
    updateMemberProfile(id: $id, firstName: $firstName, lastName: $lastName, particles: $particles, email: $email) {
      id firstName lastName particles email role
    }
  }
`;

const ADD_MEMBER_TO_TEAM_MUTATION = gql`
  mutation AddMemberToTeam($teamId: ID!, $memberId: ID!) {
    addMemberToTeam(teamId: $teamId, memberId: $memberId) { id }
  }
`;

const REMOVE_MEMBER_FROM_TEAM_MUTATION = gql`
  mutation RemoveMemberFromTeam($teamId: ID!, $memberId: ID!) {
    removeMemberFromTeam(teamId: $teamId, memberId: $memberId) { id }
  }
`;

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($memberId: String!, $newPassword: String!) {
    resetPassword(memberId: $memberId, newPassword: $newPassword) {
      success
      message
    }
  }
`;

@Component({
  selector: 'app-member-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    TranslateModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon>edit</mat-icon>
          {{ 'editMember.title' | translate }}
        </h2>
        <button class="panel-close" (click)="panelRef.close()" [disabled]="saving">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">
        <div class="form-content">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.memberId' | translate }}</mat-label>
            <input matInput [value]="data.member.id" disabled>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.firstName' | translate }}</mat-label>
            <input matInput [(ngModel)]="editForm.firstName" name="firstName">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.particles' | translate }}</mat-label>
            <input matInput [(ngModel)]="editForm.particles" name="particles"
                   [placeholder]="'editMember.particlesPlaceholder' | translate">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.lastName' | translate }}</mat-label>
            <input matInput [(ngModel)]="editForm.lastName" name="lastName">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.email' | translate }}</mat-label>
            <input matInput [(ngModel)]="editForm.email" name="email" type="email"
                   [placeholder]="'editMember.emailPlaceholder' | translate">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.role' | translate }}</mat-label>
            <mat-select [(ngModel)]="editForm.role" name="role"
                        [disabled]="!canEditRole">
              <mat-option value="user">{{ 'common.user' | translate }}</mat-option>
              <mat-option value="manager">{{ 'common.manager' | translate }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.teamsLabel' | translate }}</mat-label>
            <mat-select [(ngModel)]="editForm.teamIds" name="teams" multiple
                        [disabled]="!canEditTeams">
              <mat-option *ngFor="let team of data.allTeams" [value]="team.id">
                {{ team.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Reset Password Section (managers only, for other members) -->
          <ng-container *ngIf="canResetPassword">
            <mat-divider style="margin: 16px 0;"></mat-divider>

            <h4 style="margin: 0 0 12px 0; color: var(--mat-sys-primary); display: flex; align-items: center; gap: 8px;">
              <mat-icon>lock_reset</mat-icon>
              {{ 'editMember.resetPassword' | translate }}
            </h4>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'editMember.newPassword' | translate }}</mat-label>
              <input matInput
                     [(ngModel)]="resetPasswordForm.newPassword"
                     name="newPassword"
                     [type]="hideNewPassword ? 'password' : 'text'">
              <button mat-icon-button matSuffix type="button" (click)="hideNewPassword = !hideNewPassword">
                <mat-icon>{{ hideNewPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'editMember.confirmPassword' | translate }}</mat-label>
              <input matInput
                     [(ngModel)]="resetPasswordForm.confirmPassword"
                     name="confirmNewPassword"
                     [type]="hideConfirmPassword ? 'password' : 'text'">
              <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword">
                <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <button mat-stroked-button
                    color="primary"
                    type="button"
                    (click)="onResetPassword()"
                    [disabled]="resettingPassword || !isPasswordFormValid"
                    style="margin-top: 8px;">
              <mat-spinner *ngIf="resettingPassword" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!resettingPassword">lock_reset</mat-icon>
              <span *ngIf="!resettingPassword">{{ 'editMember.resetButton' | translate }}</span>
            </button>
          </ng-container>
        </div>
      </div>

      <div class="panel-actions">
        <span class="spacer"></span>
        <button mat-icon-button (click)="panelRef.close()" [disabled]="saving" [matTooltip]="'common.cancel' | translate">
          <mat-icon>close</mat-icon>
        </button>
        <button mat-icon-button color="primary"
                (click)="onSave()"
                [disabled]="saving || !isFormValid"
                [matTooltip]="'common.save' | translate">
          <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
          <mat-icon *ngIf="!saving">check</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .form-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
    }

    .full-width {
      width: 100%;
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 4px;
    }
  `]
})
export class MemberEditDialogComponent {
  editForm: {
    firstName: string;
    lastName: string;
    particles: string;
    email: string;
    role: string;
    teamIds: string[];
  };

  resetPasswordForm = {
    newPassword: '',
    confirmPassword: ''
  };
  hideNewPassword = true;
  hideConfirmPassword = true;
  resettingPassword = false;
  saving = false;

  constructor(
    public panelRef: SlideInPanelRef<MemberEditDialogComponent, boolean>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: MemberEditDialogData,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {
    this.editForm = {
      firstName: data.member.firstName,
      lastName: data.member.lastName,
      particles: data.member.particles || '',
      email: data.member.email || '',
      role: data.member.role,
      teamIds: data.member.teams.map(t => t.id)
    };
  }

  get canEditRole(): boolean {
    return this.data.isManager && !this.data.isSelf;
  }

  get canEditTeams(): boolean {
    return this.data.isManager;
  }

  get canResetPassword(): boolean {
    return this.data.isManager && !this.data.isSelf;
  }

  get isFormValid(): boolean {
    return !!(this.editForm.firstName && this.editForm.lastName);
  }

  get isPasswordFormValid(): boolean {
    return !!(
      this.resetPasswordForm.newPassword &&
      this.resetPasswordForm.newPassword === this.resetPasswordForm.confirmPassword
    );
  }

  async onSave(): Promise<void> {
    this.saving = true;
    try {
      // Update profile
      await apolloClient.mutate({
        mutation: UPDATE_MEMBER_MUTATION,
        variables: {
          id: this.data.member.id,
          firstName: this.editForm.firstName,
          lastName: this.editForm.lastName,
          particles: this.editForm.particles || null,
          email: this.editForm.email || null
        }
      });

      // Update role if changed (only for other members)
      if (this.canEditRole && this.editForm.role !== this.data.member.role) {
        await new Promise<void>((resolve, reject) => {
          this.authService.updateRole(
            this.data.member.id,
            this.editForm.role as 'user' | 'manager'
          ).subscribe({ next: () => resolve(), error: (e) => reject(e) });
        });
      }

      // Update team assignments (managers only)
      if (this.canEditTeams) {
        const currentTeamIds = this.data.member.teams.map(t => t.id);
        const newTeamIds = this.editForm.teamIds;

        for (const teamId of currentTeamIds) {
          if (!newTeamIds.includes(teamId)) {
            await apolloClient.mutate({
              mutation: REMOVE_MEMBER_FROM_TEAM_MUTATION,
              variables: { teamId, memberId: this.data.member.id }
            });
          }
        }

        for (const teamId of newTeamIds) {
          if (!currentTeamIds.includes(teamId)) {
            await apolloClient.mutate({
              mutation: ADD_MEMBER_TO_TEAM_MUTATION,
              variables: { teamId, memberId: this.data.member.id }
            });
          }
        }
      }

      // If user edited their own profile, update the stored auth user
      if (this.data.isSelf) {
        this.authService.updateProfile(
          this.editForm.firstName,
          this.editForm.lastName,
          this.editForm.particles || null,
          this.editForm.email || null
        ).subscribe();
      }

      this.snackBar.open(this.translate.instant('editMember.messages.updated'), this.translate.instant('common.close'), { duration: 3000 });
      this.panelRef.close(true);
    } catch (error: any) {
      console.error('Failed to update member:', error);
      this.snackBar.open(error.message || this.translate.instant('editMember.messages.updateFailed'), this.translate.instant('common.close'), { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }

  async onResetPassword(): Promise<void> {
    if (!this.isPasswordFormValid) return;

    this.resettingPassword = true;
    try {
      const result: any = await apolloClient.mutate({
        mutation: RESET_PASSWORD_MUTATION,
        variables: {
          memberId: this.data.member.id,
          newPassword: this.resetPasswordForm.newPassword
        }
      });

      if (result.data.resetPassword.success) {
        this.snackBar.open(this.translate.instant('editMember.messages.passwordReset'), this.translate.instant('common.close'), { duration: 3000 });
        this.resetPasswordForm = { newPassword: '', confirmPassword: '' };
      } else {
        this.snackBar.open(result.data.resetPassword.message || this.translate.instant('editMember.messages.passwordResetFailed'), this.translate.instant('common.close'), { duration: 5000 });
      }
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      this.snackBar.open(error.message || this.translate.instant('editMember.messages.passwordResetFailed'), this.translate.instant('common.close'), { duration: 5000 });
    } finally {
      this.resettingPassword = false;
    }
  }
}
