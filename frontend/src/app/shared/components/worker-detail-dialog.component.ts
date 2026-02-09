import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService } from '../services/auth.service';
import { UserPreferencesService } from '../services/user-preferences.service';
import { SlideInPanelRef, SlideInPanelService, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { WorkerEditDialogComponent, WorkerEditDialogData } from './worker-edit-dialog.component';

interface WorkerFull {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
  role: string;
  teams: { id: string; name: string }[];
}

export interface WorkerDetailDialogData {
  workerId: string;
  leftOffset?: string;
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
      email
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

const DELETE_WORKER_MUTATION = gql`
  mutation DeleteWorker($id: ID!) {
    deleteWorker(id: $id)
  }
`;

@Component({
  selector: 'app-worker-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon>person</mat-icon>
          Worker Details
        </h2>
        <button class="panel-close" (click)="panelRef.close(hasChanges ? { action: 'saved' } : undefined)">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">
        <div *ngIf="loadingData" class="loading">
          <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
        </div>

        <div *ngIf="!loadingData && worker" class="detail-content">
          <div class="detail-row">
            <span class="detail-label">Worker ID</span>
            <span class="detail-value">{{ worker.id }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Name</span>
            <span class="detail-value">{{ workerDisplayName }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Email</span>
            <span class="detail-value" [class.muted]="!worker.email">{{ worker.email || 'Not set' }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Role</span>
            <span class="detail-value role-badge" [class.manager]="worker.role === 'manager'">
              <mat-icon>{{ worker.role === 'manager' ? 'admin_panel_settings' : 'person' }}</mat-icon>
              {{ worker.role === 'manager' ? 'Manager' : 'User' }}
            </span>
          </div>

          <div class="detail-row" *ngIf="worker.teams.length > 0">
            <span class="detail-label">Teams</span>
            <div class="teams-list">
              <mat-chip-set>
                <mat-chip *ngFor="let team of worker.teams">{{ team.name }}</mat-chip>
              </mat-chip-set>
            </div>
          </div>

          <div class="detail-row" *ngIf="worker.teams.length === 0">
            <span class="detail-label">Teams</span>
            <span class="detail-value muted">No teams assigned</span>
          </div>
        </div>
      </div>

      <div class="panel-actions" *ngIf="!loadingData && worker">
        <button mat-button color="warn"
                *ngIf="canDelete"
                (click)="onDelete()"
                [disabled]="deleting"
                class="delete-button">
          <mat-spinner *ngIf="deleting" diameter="18"></mat-spinner>
          <mat-icon *ngIf="!deleting">delete</mat-icon>
          <span *ngIf="!deleting">Delete</span>
        </button>
        <span class="spacer"></span>
        <button mat-button (click)="panelRef.close(hasChanges ? { action: 'saved' } : undefined)" [disabled]="deleting">
          Close
        </button>
        <button *ngIf="canEdit" mat-raised-button color="primary" (click)="openEdit()">
          <mat-icon>edit</mat-icon> Edit
        </button>
      </div>
    </div>
  `,
  styles: [`
    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-value {
      font-size: 16px;
      color: var(--mat-sys-on-surface);
    }

    .detail-value.muted {
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .role-badge mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--mat-sys-on-surface-variant);
    }

    .role-badge.manager mat-icon {
      color: var(--mat-sys-primary);
    }

    .teams-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .delete-button {
      display: flex;
      align-items: center;
      gap: 4px;
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
  deleting = false;
  hasChanges = false;
  private managementModeEnabled = false;

  constructor(
    public panelRef: SlideInPanelRef<WorkerDetailDialogComponent, WorkerDetailDialogResult>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: WorkerDetailDialogData,
    private authService: AuthService,
    private userPreferencesService: UserPreferencesService,
    private snackBar: MatSnackBar,
    private panelService: SlideInPanelService
  ) {
    this.managementModeEnabled = this.userPreferencesService.preferences.managementMode;
    this.userPreferencesService.preferences$.subscribe(prefs => {
      this.managementModeEnabled = prefs.managementMode;
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  get workerDisplayName(): string {
    if (!this.worker) return '';
    const parts = [this.worker.firstName];
    if (this.worker.particles) parts.push(this.worker.particles);
    parts.push(this.worker.lastName);
    return parts.join(' ');
  }

  private get isSelf(): boolean {
    return this.worker?.id === this.authService.currentUser?.id;
  }

  private get isManager(): boolean {
    return this.authService.isManager && this.managementModeEnabled;
  }

  get canEdit(): boolean {
    return this.isSelf || this.isManager;
  }

  get canDelete(): boolean {
    return this.isManager && !this.isSelf;
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
    } catch (error) {
      console.error('Failed to load worker data:', error);
      this.snackBar.open('Failed to load worker data', 'Close', { duration: 3000 });
    } finally {
      this.loadingData = false;
    }
  }

  openEdit(): void {
    if (!this.worker) return;

    const editRef = this.panelService.open<WorkerEditDialogComponent, WorkerEditDialogData, boolean>(
      WorkerEditDialogComponent,
      {
        leftOffset: this.data.leftOffset,
        data: {
          worker: { ...this.worker, teams: [...this.worker.teams] },
          allTeams: this.allTeams,
          isSelf: this.isSelf,
          isManager: this.isManager
        }
      }
    );

    editRef.afterClosed().subscribe(saved => {
      if (saved) {
        this.hasChanges = true;
        this.loadData();
      }
    });
  }

  onDelete(): void {
    if (!this.worker) return;

    const confirmRef = this.panelService.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Worker',
        message: `Are you sure you want to delete "${this.workerDisplayName}"?`,
        confirmText: 'Delete',
        confirmColor: 'warn'
      }
    });

    confirmRef.afterClosed().subscribe(confirmed => {
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
      this.panelRef.close({ action: 'deleted' });
    } catch (error: any) {
      console.error('Failed to delete worker:', error);
      this.snackBar.open(error.message || 'Failed to delete worker', 'Close', { duration: 5000 });
    } finally {
      this.deleting = false;
    }
  }
}
