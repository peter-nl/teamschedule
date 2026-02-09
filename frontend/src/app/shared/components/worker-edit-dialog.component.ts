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
import { MatDividerModule } from '@angular/material/divider';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService } from '../services/auth.service';
import { SlideInPanelRef, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';

export interface WorkerEditDialogData {
  worker: {
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

const UPDATE_WORKER_MUTATION = gql`
  mutation UpdateWorkerProfile($id: String!, $firstName: String!, $lastName: String!, $particles: String, $email: String) {
    updateWorkerProfile(id: $id, firstName: $firstName, lastName: $lastName, particles: $particles, email: $email) {
      id firstName lastName particles email role
    }
  }
`;

const ADD_WORKER_TO_TEAM_MUTATION = gql`
  mutation AddWorkerToTeam($teamId: ID!, $workerId: ID!) {
    addWorkerToTeam(teamId: $teamId, workerId: $workerId) { id }
  }
`;

const REMOVE_WORKER_FROM_TEAM_MUTATION = gql`
  mutation RemoveWorkerFromTeam($teamId: ID!, $workerId: ID!) {
    removeWorkerFromTeam(teamId: $teamId, workerId: $workerId) { id }
  }
`;

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($workerId: String!, $newPassword: String!) {
    resetPassword(workerId: $workerId, newPassword: $newPassword) {
      success
      message
    }
  }
`;

@Component({
  selector: 'app-worker-edit-dialog',
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
    MatDividerModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon>edit</mat-icon>
          Edit Worker
        </h2>
        <button class="panel-close" (click)="panelRef.close()" [disabled]="saving">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">
        <div class="form-content">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Worker ID</mat-label>
            <input matInput [value]="data.worker.id" disabled>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>First Name</mat-label>
            <input matInput [(ngModel)]="editForm.firstName" name="firstName">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Particles</mat-label>
            <input matInput [(ngModel)]="editForm.particles" name="particles"
                   placeholder="e.g., van, de">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Last Name</mat-label>
            <input matInput [(ngModel)]="editForm.lastName" name="lastName">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput [(ngModel)]="editForm.email" name="email" type="email"
                   placeholder="e.g., john@example.com">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Role</mat-label>
            <mat-select [(ngModel)]="editForm.role" name="role"
                        [disabled]="!canEditRole">
              <mat-option value="user">User</mat-option>
              <mat-option value="manager">Manager</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Teams</mat-label>
            <mat-select [(ngModel)]="editForm.teamIds" name="teams" multiple
                        [disabled]="!canEditTeams">
              <mat-option *ngFor="let team of data.allTeams" [value]="team.id">
                {{ team.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Reset Password Section (managers only, for other workers) -->
          <ng-container *ngIf="canResetPassword">
            <mat-divider style="margin: 16px 0;"></mat-divider>

            <h4 style="margin: 0 0 12px 0; color: var(--mat-sys-primary); display: flex; align-items: center; gap: 8px;">
              <mat-icon>lock_reset</mat-icon>
              Reset Password
            </h4>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>New Password</mat-label>
              <input matInput
                     [(ngModel)]="resetPasswordForm.newPassword"
                     name="newPassword"
                     [type]="hideNewPassword ? 'password' : 'text'">
              <button mat-icon-button matSuffix type="button" (click)="hideNewPassword = !hideNewPassword">
                <mat-icon>{{ hideNewPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm New Password</mat-label>
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
              <span *ngIf="!resettingPassword">Reset Password</span>
            </button>
          </ng-container>
        </div>
      </div>

      <div class="panel-actions">
        <span class="spacer"></span>
        <button mat-button (click)="panelRef.close()" [disabled]="saving">
          Cancel
        </button>
        <button mat-raised-button color="primary"
                (click)="onSave()"
                [disabled]="saving || !isFormValid">
          <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
          <span *ngIf="!saving">Save</span>
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
export class WorkerEditDialogComponent {
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
    public panelRef: SlideInPanelRef<WorkerEditDialogComponent, boolean>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: WorkerEditDialogData,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.editForm = {
      firstName: data.worker.firstName,
      lastName: data.worker.lastName,
      particles: data.worker.particles || '',
      email: data.worker.email || '',
      role: data.worker.role,
      teamIds: data.worker.teams.map(t => t.id)
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
        mutation: UPDATE_WORKER_MUTATION,
        variables: {
          id: this.data.worker.id,
          firstName: this.editForm.firstName,
          lastName: this.editForm.lastName,
          particles: this.editForm.particles || null,
          email: this.editForm.email || null
        }
      });

      // Update role if changed (only for other workers)
      if (this.canEditRole && this.editForm.role !== this.data.worker.role) {
        await new Promise<void>((resolve, reject) => {
          this.authService.updateRole(
            this.data.worker.id,
            this.editForm.role as 'user' | 'manager'
          ).subscribe({ next: () => resolve(), error: (e) => reject(e) });
        });
      }

      // Update team assignments (managers only)
      if (this.canEditTeams) {
        const currentTeamIds = this.data.worker.teams.map(t => t.id);
        const newTeamIds = this.editForm.teamIds;

        for (const teamId of currentTeamIds) {
          if (!newTeamIds.includes(teamId)) {
            await apolloClient.mutate({
              mutation: REMOVE_WORKER_FROM_TEAM_MUTATION,
              variables: { teamId, workerId: this.data.worker.id }
            });
          }
        }

        for (const teamId of newTeamIds) {
          if (!currentTeamIds.includes(teamId)) {
            await apolloClient.mutate({
              mutation: ADD_WORKER_TO_TEAM_MUTATION,
              variables: { teamId, workerId: this.data.worker.id }
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

      this.snackBar.open('Worker updated', 'Close', { duration: 3000 });
      this.panelRef.close(true);
    } catch (error: any) {
      console.error('Failed to update worker:', error);
      this.snackBar.open(error.message || 'Failed to update worker', 'Close', { duration: 5000 });
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
          workerId: this.data.worker.id,
          newPassword: this.resetPasswordForm.newPassword
        }
      });

      if (result.data.resetPassword.success) {
        this.snackBar.open('Password reset successfully', 'Close', { duration: 3000 });
        this.resetPasswordForm = { newPassword: '', confirmPassword: '' };
      } else {
        this.snackBar.open(result.data.resetPassword.message || 'Failed to reset password', 'Close', { duration: 5000 });
      }
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      this.snackBar.open(error.message || 'Failed to reset password', 'Close', { duration: 5000 });
    } finally {
      this.resettingPassword = false;
    }
  }
}
