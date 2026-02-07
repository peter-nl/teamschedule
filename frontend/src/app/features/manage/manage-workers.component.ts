import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
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
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { SlideInPanelService } from '../../shared/services/slide-in-panel.service';
import { AuthService } from '../../shared/services/auth.service';

interface Team {
  id: string;
  name: string;
}

interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  role: string;
  teams: Team[];
}

const GET_WORKERS_QUERY = gql`
  query GetWorkers {
    workers {
      id
      firstName
      lastName
      particles
      role
      teams {
        id
        name
      }
    }
  }
`;

const GET_TEAMS_QUERY = gql`
  query GetTeams {
    teams {
      id
      name
    }
  }
`;

const CREATE_WORKER_MUTATION = gql`
  mutation CreateWorker($id: String!, $firstName: String!, $lastName: String!, $particles: String) {
    createWorker(id: $id, firstName: $firstName, lastName: $lastName, particles: $particles) {
      id
      firstName
      lastName
      particles
      role
    }
  }
`;

const UPDATE_WORKER_MUTATION = gql`
  mutation UpdateWorkerProfile($id: String!, $firstName: String!, $lastName: String!, $particles: String) {
    updateWorkerProfile(id: $id, firstName: $firstName, lastName: $lastName, particles: $particles) {
      id
      firstName
      lastName
      particles
      role
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
    addWorkerToTeam(teamId: $teamId, workerId: $workerId) {
      id
    }
  }
`;

const REMOVE_WORKER_FROM_TEAM_MUTATION = gql`
  mutation RemoveWorkerFromTeam($teamId: ID!, $workerId: ID!) {
    removeWorkerFromTeam(teamId: $teamId, workerId: $workerId) {
      id
    }
  }
`;

@Component({
  selector: 'app-manage-workers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatListModule,
    MatCardModule,
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
    <div class="manage-container">
      <!-- List Panel -->
      <div class="list-panel">
        <div class="list-header">
          <h2>Workers</h2>
          <button mat-mini-fab color="primary" (click)="startAddWorker()" matTooltip="Add Worker">
            <mat-icon>add</mat-icon>
          </button>
        </div>

        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search</mat-label>
          <input matInput [(ngModel)]="searchTerm" (input)="filterWorkers()" placeholder="Search workers...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <div *ngIf="loading" class="loading">
          <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
        </div>

        <mat-selection-list *ngIf="!loading" [multiple]="false" class="worker-list">
          <mat-list-option
            *ngFor="let worker of filteredWorkers"
            [selected]="selectedWorker?.id === worker.id"
            (click)="selectWorker(worker)"
            class="worker-item">
            <div class="worker-item-content">
              <span class="worker-name">
                {{ worker.firstName }}{{ worker.particles ? ' ' + worker.particles + ' ' : ' ' }}{{ worker.lastName }}
              </span>
              <span class="worker-id">{{ worker.id }}</span>
            </div>
          </mat-list-option>
        </mat-selection-list>

        <div *ngIf="!loading && filteredWorkers.length === 0" class="empty-list">
          <mat-icon>person_off</mat-icon>
          <p>No workers found</p>
        </div>
      </div>

      <!-- Detail Panel -->
      <div class="detail-panel">
        <!-- Add New Worker Form -->
        <mat-card *ngIf="isAddingNew" class="detail-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>person_add</mat-icon>
            <mat-card-title>Add New Worker</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form class="detail-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Worker ID</mat-label>
                <input matInput [(ngModel)]="newWorker.id" name="id" required placeholder="e.g., jdoe001">
                <mat-hint>Unique identifier</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>First Name</mat-label>
                <input matInput [(ngModel)]="newWorker.firstName" name="firstName" required>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Particles</mat-label>
                <input matInput [(ngModel)]="newWorker.particles" name="particles" placeholder="e.g., van, de">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Last Name</mat-label>
                <input matInput [(ngModel)]="newWorker.lastName" name="lastName" required>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Assign to Teams</mat-label>
                <mat-select [(ngModel)]="newWorker.teamIds" name="teams" multiple>
                  <mat-option *ngFor="let team of allTeams" [value]="team.id">
                    {{ team.name }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </form>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-button (click)="cancelAdd()">Cancel</button>
            <button mat-raised-button color="primary" (click)="saveNewWorker()" [disabled]="saving || !isNewWorkerValid()">
              <mat-spinner *ngIf="saving" diameter="20"></mat-spinner>
              <span *ngIf="!saving">Save</span>
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Selected Worker Details -->
        <mat-card *ngIf="selectedWorker && !isAddingNew" class="detail-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>person</mat-icon>
            <mat-card-title>{{ selectedWorker.firstName }}{{ selectedWorker.particles ? ' ' + selectedWorker.particles + ' ' : ' ' }}{{ selectedWorker.lastName }}</mat-card-title>
            <mat-card-subtitle>{{ selectedWorker.id }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form class="detail-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Worker ID</mat-label>
                <input matInput [value]="selectedWorker.id" disabled>
                <mat-hint>Cannot be changed</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>First Name</mat-label>
                <input matInput [(ngModel)]="editForm.firstName" name="firstName" [disabled]="!isEditing">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Particles</mat-label>
                <input matInput [(ngModel)]="editForm.particles" name="particles" [disabled]="!isEditing">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Last Name</mat-label>
                <input matInput [(ngModel)]="editForm.lastName" name="lastName" [disabled]="!isEditing">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Role</mat-label>
                <mat-select [(ngModel)]="editForm.role" name="role"
                            [disabled]="!isEditing || isSelectedWorkerSelf">
                  <mat-option value="user">User</mat-option>
                  <mat-option value="manager">Manager</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Teams</mat-label>
                <mat-select [(ngModel)]="editForm.teamIds" name="teams" multiple [disabled]="!isEditing">
                  <mat-option *ngFor="let team of allTeams" [value]="team.id">
                    {{ team.name }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </form>
          </mat-card-content>
          <mat-card-actions align="end">
            <button *ngIf="!isEditing" mat-button color="warn" (click)="confirmDelete()">
              <mat-icon>delete</mat-icon> Delete
            </button>
            <button *ngIf="!isEditing" mat-raised-button color="primary" (click)="startEdit()">
              <mat-icon>edit</mat-icon> Edit
            </button>
            <button *ngIf="isEditing" mat-button (click)="cancelEdit()">Cancel</button>
            <button *ngIf="isEditing" mat-raised-button color="primary" (click)="saveEdit()" [disabled]="saving">
              <mat-spinner *ngIf="saving" diameter="20"></mat-spinner>
              <span *ngIf="!saving">Save</span>
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- No Selection -->
        <div *ngIf="!selectedWorker && !isAddingNew" class="no-selection">
          <mat-icon>person_search</mat-icon>
          <p>Select a worker to view details</p>
          <p>or</p>
          <button mat-raised-button color="primary" (click)="startAddWorker()">
            <mat-icon>add</mat-icon> Add New Worker
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-container {
      display: flex;
      height: 100%;
      gap: 24px;
      padding: 12px;
      box-sizing: border-box;
    }

    .list-panel {
      width: 350px;
      min-width: 300px;
      display: flex;
      flex-direction: column;
      background: var(--mat-sys-surface-container);
      border-radius: 16px;
      padding: 16px;
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .list-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .search-field {
      width: 100%;
      margin-bottom: 8px;
    }

    .worker-list {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    .worker-item {
      border-radius: 12px;
      margin-bottom: 4px;
    }

    .worker-item-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .worker-name {
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .worker-id {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .empty-list {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 24px;
      color: var(--mat-sys-on-surface-variant);
    }

    .empty-list mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .detail-panel {
      flex: 1;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    .detail-card {
      width: 100%;
      max-width: 500px;
      border-radius: 16px;
    }

    mat-card-header {
      margin-bottom: 16px;
    }

    mat-card-header mat-icon[mat-card-avatar] {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--mat-sys-primary);
    }

    .detail-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .full-width {
      width: 100%;
    }

    .no-selection {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
    }

    .no-selection mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .no-selection p {
      margin: 8px 0;
    }

    mat-card-actions button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    @media (max-width: 768px) {
      .manage-container {
        flex-direction: column;
        height: auto;
      }

      .list-panel {
        width: 100%;
        min-width: unset;
        max-height: 50vh;
      }

      .detail-card {
        max-width: 100%;
      }
    }
  `]
})
export class ManageWorkersComponent implements OnInit {
  workers: Worker[] = [];
  filteredWorkers: Worker[] = [];
  allTeams: Team[] = [];
  selectedWorker: Worker | null = null;
  searchTerm = '';
  loading = true;
  saving = false;
  isEditing = false;
  isAddingNew = false;

  editForm = {
    firstName: '',
    lastName: '',
    particles: '',
    role: 'user' as string,
    teamIds: [] as string[]
  };

  newWorker = {
    id: '',
    firstName: '',
    lastName: '',
    particles: '',
    teamIds: [] as string[]
  };

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private panelService: SlideInPanelService
  ) {}

  get isSelectedWorkerSelf(): boolean {
    return this.selectedWorker?.id === this.authService.currentUser?.id;
  }

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    try {
      const [workersResult, teamsResult]: any[] = await Promise.all([
        apolloClient.query({ query: GET_WORKERS_QUERY, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GET_TEAMS_QUERY, fetchPolicy: 'network-only' })
      ]);
      this.workers = workersResult.data.workers;
      this.allTeams = teamsResult.data.teams;
      this.filterWorkers();
    } catch (error) {
      console.error('Failed to load data:', error);
      this.snackBar.open('Failed to load workers', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  filterWorkers(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredWorkers = this.workers.filter(w =>
      w.id.toLowerCase().includes(term) ||
      w.firstName.toLowerCase().includes(term) ||
      w.lastName.toLowerCase().includes(term) ||
      (w.particles || '').toLowerCase().includes(term)
    );
  }

  selectWorker(worker: Worker): void {
    this.selectedWorker = worker;
    this.isAddingNew = false;
    this.isEditing = false;
    this.resetEditForm();
  }

  resetEditForm(): void {
    if (this.selectedWorker) {
      this.editForm = {
        firstName: this.selectedWorker.firstName,
        lastName: this.selectedWorker.lastName,
        particles: this.selectedWorker.particles || '',
        role: this.selectedWorker.role,
        teamIds: this.selectedWorker.teams.map(t => t.id)
      };
    }
  }

  startEdit(): void {
    this.isEditing = true;
    this.resetEditForm();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.resetEditForm();
  }

  async saveEdit(): Promise<void> {
    if (!this.selectedWorker) return;

    this.saving = true;
    try {
      // Update worker profile
      await apolloClient.mutate({
        mutation: UPDATE_WORKER_MUTATION,
        variables: {
          id: this.selectedWorker.id,
          firstName: this.editForm.firstName,
          lastName: this.editForm.lastName,
          particles: this.editForm.particles || null
        }
      });

      // Update role if changed (only for other workers)
      if (!this.isSelectedWorkerSelf && this.editForm.role !== this.selectedWorker.role) {
        await new Promise<void>((resolve, reject) => {
          this.authService.updateRole(
            this.selectedWorker!.id,
            this.editForm.role as 'user' | 'manager'
          ).subscribe({ next: () => resolve(), error: (e) => reject(e) });
        });
      }

      // Update team assignments
      const currentTeamIds = this.selectedWorker.teams.map(t => t.id);
      const newTeamIds = this.editForm.teamIds;

      // Remove from teams no longer assigned
      for (const teamId of currentTeamIds) {
        if (!newTeamIds.includes(teamId)) {
          await apolloClient.mutate({
            mutation: REMOVE_WORKER_FROM_TEAM_MUTATION,
            variables: { teamId, workerId: this.selectedWorker.id }
          });
        }
      }

      // Add to new teams
      for (const teamId of newTeamIds) {
        if (!currentTeamIds.includes(teamId)) {
          await apolloClient.mutate({
            mutation: ADD_WORKER_TO_TEAM_MUTATION,
            variables: { teamId, workerId: this.selectedWorker.id }
          });
        }
      }

      this.snackBar.open('Worker updated successfully', 'Close', { duration: 3000 });
      this.isEditing = false;
      await this.loadData();

      // Re-select the worker to refresh details
      const updated = this.workers.find(w => w.id === this.selectedWorker?.id);
      if (updated) {
        this.selectedWorker = updated;
        this.resetEditForm();
      }
    } catch (error: any) {
      console.error('Failed to update worker:', error);
      this.snackBar.open(error.message || 'Failed to update worker', 'Close', { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }

  startAddWorker(): void {
    this.isAddingNew = true;
    this.selectedWorker = null;
    this.isEditing = false;
    this.newWorker = {
      id: '',
      firstName: '',
      lastName: '',
      particles: '',
      teamIds: []
    };
  }

  cancelAdd(): void {
    this.isAddingNew = false;
  }

  isNewWorkerValid(): boolean {
    return !!(this.newWorker.id && this.newWorker.firstName && this.newWorker.lastName);
  }

  async saveNewWorker(): Promise<void> {
    if (!this.isNewWorkerValid()) return;

    this.saving = true;
    try {
      // Create worker
      await apolloClient.mutate({
        mutation: CREATE_WORKER_MUTATION,
        variables: {
          id: this.newWorker.id,
          firstName: this.newWorker.firstName,
          lastName: this.newWorker.lastName,
          particles: this.newWorker.particles || null
        }
      });

      // Assign to teams
      for (const teamId of this.newWorker.teamIds) {
        await apolloClient.mutate({
          mutation: ADD_WORKER_TO_TEAM_MUTATION,
          variables: { teamId, workerId: this.newWorker.id }
        });
      }

      this.snackBar.open('Worker created successfully', 'Close', { duration: 3000 });
      this.isAddingNew = false;
      await this.loadData();

      // Select the new worker
      const created = this.workers.find(w => w.id === this.newWorker.id);
      if (created) {
        this.selectWorker(created);
      }
    } catch (error: any) {
      console.error('Failed to create worker:', error);
      this.snackBar.open(error.message || 'Failed to create worker', 'Close', { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }

  confirmDelete(): void {
    if (!this.selectedWorker) return;

    const panelRef = this.panelService.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Worker',
        message: `Are you sure you want to delete "${this.selectedWorker.firstName} ${this.selectedWorker.lastName}"?`,
        confirmText: 'Delete',
        confirmColor: 'warn'
      }
    });

    panelRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteWorker();
      }
    });
  }

  async deleteWorker(): Promise<void> {
    if (!this.selectedWorker) return;

    this.saving = true;
    try {
      await apolloClient.mutate({
        mutation: DELETE_WORKER_MUTATION,
        variables: { id: this.selectedWorker.id }
      });

      this.snackBar.open('Worker deleted successfully', 'Close', { duration: 3000 });
      this.selectedWorker = null;
      await this.loadData();
    } catch (error: any) {
      console.error('Failed to delete worker:', error);
      this.snackBar.open(error.message || 'Failed to delete worker', 'Close', { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }
}
