import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
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
import { ConfirmDialogComponent } from './confirm-dialog.component';

interface WorkerFull {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  role: string;
  teams: { id: string; name: string }[];
}

export interface WorkerDetailDialogData {
  workerId: string;
}

export interface WorkerDetailDialogResult {
  action: 'saved' | 'deleted';
}

const GET_WORKERS_QUERY = gql`
  query GetWorkers {
    workers {
      id
      firstName
      lastName
      particles
      role
      teams { id, name }
    }
  }
`;

const GET_TEAMS_QUERY = gql`
  query GetTeams {
    teams { id, name }
  }
`;

const UPDATE_WORKER_MUTATION = gql`
  mutation UpdateWorkerProfile($id: String!, $firstName: String!, $lastName: String!, $particles: String) {
    updateWorkerProfile(id: $id, firstName: $firstName, lastName: $lastName, particles: $particles) {
      id firstName lastName particles role
    }
  }
`;

const DELETE_WORKER_MUTATION = gql`
  mutation DeleteWorker($id: ID!) {
    deleteWorker(id: $id)
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
  mutation ResetPassword($workerId: String!, $newPassword: String!, $requesterId: String!) {
    resetPassword(workerId: $workerId, newPassword: $newPassword, requesterId: $requesterId) {
      success
      message
    }
  }
`;

@Component({
  selector: 'app-worker-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
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
    <h2 mat-dialog-title>
      <mat-icon>person</mat-icon>
      Worker Details
    </h2>

    <mat-dialog-content>
      <div *ngIf="loadingData" class="loading">
        <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
      </div>

      <div *ngIf="!loadingData && worker" class="form-content">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Worker ID</mat-label>
          <input matInput [value]="worker.id" disabled>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>First Name</mat-label>
          <input matInput [(ngModel)]="editForm.firstName" name="firstName" [disabled]="!isEditing">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Particles</mat-label>
          <input matInput [(ngModel)]="editForm.particles" name="particles" [disabled]="!isEditing"
                 placeholder="e.g., van, de">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Last Name</mat-label>
          <input matInput [(ngModel)]="editForm.lastName" name="lastName" [disabled]="!isEditing">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Role</mat-label>
          <mat-select [(ngModel)]="editForm.role" name="role"
                      [disabled]="!isEditing || !canEditRole">
            <mat-option value="user">User</mat-option>
            <mat-option value="manager">Manager</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Teams</mat-label>
          <mat-select [(ngModel)]="editForm.teamIds" name="teams" multiple
                      [disabled]="!isEditing || !canEditTeams">
            <mat-option *ngFor="let team of allTeams" [value]="team.id">
              {{ team.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Reset Password Section (managers only, for other workers) -->
        <ng-container *ngIf="isEditing && canResetPassword">
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
    </mat-dialog-content>

    <mat-dialog-actions *ngIf="!loadingData && worker">
      <button mat-button color="warn"
              *ngIf="canDelete && !isEditing"
              (click)="onDelete()"
              [disabled]="saving || deleting"
              class="delete-button">
        <mat-spinner *ngIf="deleting" diameter="18"></mat-spinner>
        <mat-icon *ngIf="!deleting">delete</mat-icon>
        <span *ngIf="!deleting">Delete</span>
      </button>
      <span class="spacer"></span>
      <button mat-button mat-dialog-close [disabled]="saving || deleting">
        {{ isEditing ? 'Cancel' : 'Close' }}
      </button>
      <button *ngIf="!isEditing && canEdit" mat-raised-button color="primary" (click)="startEdit()">
        <mat-icon>edit</mat-icon> Edit
      </button>
      <button *ngIf="isEditing" mat-raised-button color="primary"
              (click)="onSave()"
              [disabled]="saving || deleting || !isFormValid">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">Save</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      padding: 16px 24px;
    }

    h2[mat-dialog-title] mat-icon {
      color: var(--mat-sys-primary);
    }

    mat-dialog-content {
      padding: 0 24px 16px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .form-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 360px;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-actions {
      padding: 16px 24px;
      display: flex;
      align-items: center;
    }

    .delete-button {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .spacer {
      flex: 1;
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 4px;
    }
  `]
})
export class WorkerDetailDialogComponent implements OnInit {
  worker: WorkerFull | null = null;
  allTeams: { id: string; name: string }[] = [];
  loadingData = true;
  saving = false;
  deleting = false;
  isEditing = false;

  editForm = {
    firstName: '',
    lastName: '',
    particles: '',
    role: 'user' as string,
    teamIds: [] as string[]
  };

  resetPasswordForm = {
    newPassword: '',
    confirmPassword: ''
  };
  hideNewPassword = true;
  hideConfirmPassword = true;
  resettingPassword = false;

  constructor(
    public dialogRef: MatDialogRef<WorkerDetailDialogComponent, WorkerDetailDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: WorkerDetailDialogData,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private get isSelf(): boolean {
    return this.worker?.id === this.authService.currentUser?.id;
  }

  private get isManager(): boolean {
    return this.authService.isManager;
  }

  get canEdit(): boolean {
    return this.isSelf || this.isManager;
  }

  get canEditRole(): boolean {
    return this.isManager && !this.isSelf;
  }

  get canEditTeams(): boolean {
    return this.isManager;
  }

  get canDelete(): boolean {
    return this.isManager && !this.isSelf;
  }

  get canResetPassword(): boolean {
    return this.isManager && !this.isSelf;
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

  private async loadData(): Promise<void> {
    this.loadingData = true;
    try {
      const [workersResult, teamsResult]: any[] = await Promise.all([
        apolloClient.query({ query: GET_WORKERS_QUERY, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GET_TEAMS_QUERY, fetchPolicy: 'network-only' })
      ]);

      this.allTeams = teamsResult.data.teams;
      const workers: WorkerFull[] = workersResult.data.workers;
      this.worker = workers.find(w => w.id === this.data.workerId) || null;

      if (this.worker) {
        this.resetForm();
      }
    } catch (error) {
      console.error('Failed to load worker data:', error);
      this.snackBar.open('Failed to load worker data', 'Close', { duration: 3000 });
    } finally {
      this.loadingData = false;
    }
  }

  private resetForm(): void {
    if (!this.worker) return;
    this.editForm = {
      firstName: this.worker.firstName,
      lastName: this.worker.lastName,
      particles: this.worker.particles || '',
      role: this.worker.role,
      teamIds: this.worker.teams.map(t => t.id)
    };
  }

  startEdit(): void {
    this.isEditing = true;
    this.resetForm();
  }

  async onSave(): Promise<void> {
    if (!this.worker) return;

    this.saving = true;
    try {
      // Update profile
      await apolloClient.mutate({
        mutation: UPDATE_WORKER_MUTATION,
        variables: {
          id: this.worker.id,
          firstName: this.editForm.firstName,
          lastName: this.editForm.lastName,
          particles: this.editForm.particles || null
        }
      });

      // Update role if changed (only for other workers)
      if (this.canEditRole && this.editForm.role !== this.worker.role) {
        await new Promise<void>((resolve, reject) => {
          this.authService.updateRole(
            this.worker!.id,
            this.editForm.role as 'user' | 'manager'
          ).subscribe({ next: () => resolve(), error: (e) => reject(e) });
        });
      }

      // Update team assignments (managers only)
      if (this.canEditTeams) {
        const currentTeamIds = this.worker.teams.map(t => t.id);
        const newTeamIds = this.editForm.teamIds;

        for (const teamId of currentTeamIds) {
          if (!newTeamIds.includes(teamId)) {
            await apolloClient.mutate({
              mutation: REMOVE_WORKER_FROM_TEAM_MUTATION,
              variables: { teamId, workerId: this.worker.id }
            });
          }
        }

        for (const teamId of newTeamIds) {
          if (!currentTeamIds.includes(teamId)) {
            await apolloClient.mutate({
              mutation: ADD_WORKER_TO_TEAM_MUTATION,
              variables: { teamId, workerId: this.worker.id }
            });
          }
        }
      }

      // If user edited their own profile, update the stored auth user
      if (this.isSelf) {
        this.authService.updateProfile(
          this.editForm.firstName,
          this.editForm.lastName,
          this.editForm.particles || null
        ).subscribe();
      }

      this.snackBar.open('Worker updated', 'Close', { duration: 3000 });
      this.dialogRef.close({ action: 'saved' });
    } catch (error: any) {
      console.error('Failed to update worker:', error);
      this.snackBar.open(error.message || 'Failed to update worker', 'Close', { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }

  onDelete(): void {
    if (!this.worker) return;

    const name = this.worker.particles
      ? `${this.worker.firstName} ${this.worker.particles} ${this.worker.lastName}`
      : `${this.worker.firstName} ${this.worker.lastName}`;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Worker',
        message: `Are you sure you want to delete "${name}"?`,
        confirmText: 'Delete',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteWorker();
      }
    });
  }

  private async deleteWorker(): Promise<void> {
    if (!this.worker) return;

    this.deleting = true;
    try {
      await apolloClient.mutate({
        mutation: DELETE_WORKER_MUTATION,
        variables: { id: this.worker.id }
      });

      this.snackBar.open('Worker deleted', 'Close', { duration: 3000 });
      this.dialogRef.close({ action: 'deleted' });
    } catch (error: any) {
      console.error('Failed to delete worker:', error);
      this.snackBar.open(error.message || 'Failed to delete worker', 'Close', { duration: 5000 });
    } finally {
      this.deleting = false;
    }
  }

  async onResetPassword(): Promise<void> {
    if (!this.worker || !this.isPasswordFormValid) return;

    this.resettingPassword = true;
    try {
      const result: any = await apolloClient.mutate({
        mutation: RESET_PASSWORD_MUTATION,
        variables: {
          workerId: this.worker.id,
          newPassword: this.resetPasswordForm.newPassword,
          requesterId: this.authService.currentUser!.id
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
