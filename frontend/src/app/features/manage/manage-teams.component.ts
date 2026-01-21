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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';

interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
}

interface Team {
  id: string;
  name: string;
  workers: Worker[];
}

const GET_TEAMS_QUERY = gql`
  query GetTeams {
    teams {
      id
      name
      workers {
        id
        firstName
        lastName
        particles
      }
    }
  }
`;

const GET_WORKERS_QUERY = gql`
  query GetWorkers {
    workers {
      id
      firstName
      lastName
      particles
    }
  }
`;

const CREATE_TEAM_MUTATION = gql`
  mutation CreateTeam($name: String!) {
    createTeam(name: $name) {
      id
      name
    }
  }
`;

const DELETE_TEAM_MUTATION = gql`
  mutation DeleteTeam($id: ID!) {
    deleteTeam(id: $id)
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
  selector: 'app-manage-teams',
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
    MatDialogModule,
    MatDividerModule
  ],
  template: `
    <div class="manage-container">
      <!-- List Panel -->
      <div class="list-panel">
        <div class="list-header">
          <h2>Teams</h2>
          <button mat-mini-fab color="primary" (click)="startAddTeam()" matTooltip="Add Team">
            <mat-icon>add</mat-icon>
          </button>
        </div>

        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search</mat-label>
          <input matInput [(ngModel)]="searchTerm" (input)="filterTeams()" placeholder="Search teams...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <div *ngIf="loading" class="loading">
          <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
        </div>

        <mat-selection-list *ngIf="!loading" [multiple]="false" class="team-list">
          <mat-list-option
            *ngFor="let team of filteredTeams"
            [selected]="selectedTeam?.id === team.id"
            (click)="selectTeam(team)"
            class="team-item">
            <div class="team-item-content">
              <span class="team-name">{{ team.name }}</span>
              <span class="team-count">{{ team.workers.length }} worker{{ team.workers.length !== 1 ? 's' : '' }}</span>
            </div>
          </mat-list-option>
        </mat-selection-list>

        <div *ngIf="!loading && filteredTeams.length === 0" class="empty-list">
          <mat-icon>group_off</mat-icon>
          <p>No teams found</p>
        </div>
      </div>

      <!-- Detail Panel -->
      <div class="detail-panel">
        <!-- Add New Team Form -->
        <mat-card *ngIf="isAddingNew" class="detail-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>group_add</mat-icon>
            <mat-card-title>Add New Team</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form class="detail-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Team Name</mat-label>
                <input matInput [(ngModel)]="newTeam.name" name="name" required placeholder="e.g., Development Team">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Assign Workers</mat-label>
                <mat-select [(ngModel)]="newTeam.workerIds" name="workers" multiple>
                  <mat-option *ngFor="let worker of allWorkers" [value]="worker.id">
                    {{ worker.firstName }}{{ worker.particles ? ' ' + worker.particles + ' ' : ' ' }}{{ worker.lastName }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </form>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-button (click)="cancelAdd()">Cancel</button>
            <button mat-raised-button color="primary" (click)="saveNewTeam()" [disabled]="saving || !newTeam.name.trim()">
              <mat-spinner *ngIf="saving" diameter="20"></mat-spinner>
              <span *ngIf="!saving">Save</span>
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Selected Team Details -->
        <mat-card *ngIf="selectedTeam && !isAddingNew" class="detail-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>groups</mat-icon>
            <mat-card-title>{{ selectedTeam.name }}</mat-card-title>
            <mat-card-subtitle>{{ selectedTeam.workers.length }} member{{ selectedTeam.workers.length !== 1 ? 's' : '' }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form class="detail-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Team ID</mat-label>
                <input matInput [value]="selectedTeam.id" disabled>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Team Name</mat-label>
                <input matInput [(ngModel)]="editForm.name" name="name" [disabled]="!isEditing">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Team Members</mat-label>
                <mat-select [(ngModel)]="editForm.workerIds" name="workers" multiple [disabled]="!isEditing">
                  <mat-option *ngFor="let worker of allWorkers" [value]="worker.id">
                    {{ worker.firstName }}{{ worker.particles ? ' ' + worker.particles + ' ' : ' ' }}{{ worker.lastName }}
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
        <div *ngIf="!selectedTeam && !isAddingNew" class="no-selection">
          <mat-icon>group_work</mat-icon>
          <p>Select a team to view details</p>
          <p>or</p>
          <button mat-raised-button color="primary" (click)="startAddTeam()">
            <mat-icon>add</mat-icon> Add New Team
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-container {
      display: flex;
      height: calc(100vh - 24px);
      gap: 24px;
      padding: 12px;
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

    .team-list {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    .team-item {
      border-radius: 12px;
      margin-bottom: 4px;
    }

    .team-item-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .team-name {
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .team-count {
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
export class ManageTeamsComponent implements OnInit {
  teams: Team[] = [];
  filteredTeams: Team[] = [];
  allWorkers: Worker[] = [];
  selectedTeam: Team | null = null;
  searchTerm = '';
  loading = true;
  saving = false;
  isEditing = false;
  isAddingNew = false;

  editForm = {
    name: '',
    workerIds: [] as string[]
  };

  newTeam = {
    name: '',
    workerIds: [] as string[]
  };

  constructor(
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    try {
      const [teamsResult, workersResult]: any[] = await Promise.all([
        apolloClient.query({ query: GET_TEAMS_QUERY, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GET_WORKERS_QUERY, fetchPolicy: 'network-only' })
      ]);
      this.teams = teamsResult.data.teams;
      this.allWorkers = workersResult.data.workers;
      this.filterTeams();
    } catch (error) {
      console.error('Failed to load data:', error);
      this.snackBar.open('Failed to load teams', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  filterTeams(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredTeams = this.teams.filter(t =>
      t.name.toLowerCase().includes(term)
    );
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
    this.isAddingNew = false;
    this.isEditing = false;
    this.resetEditForm();
  }

  resetEditForm(): void {
    if (this.selectedTeam) {
      this.editForm = {
        name: this.selectedTeam.name,
        workerIds: this.selectedTeam.workers.map(w => w.id)
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
    if (!this.selectedTeam) return;

    this.saving = true;
    try {
      // Note: There's no updateTeam mutation, so we can only update workers
      // For team name changes, you'd need to add a mutation to the backend

      // Update worker assignments
      const currentWorkerIds = this.selectedTeam.workers.map(w => w.id);
      const newWorkerIds = this.editForm.workerIds;

      // Remove workers no longer assigned
      for (const workerId of currentWorkerIds) {
        if (!newWorkerIds.includes(workerId)) {
          await apolloClient.mutate({
            mutation: REMOVE_WORKER_FROM_TEAM_MUTATION,
            variables: { teamId: this.selectedTeam.id, workerId }
          });
        }
      }

      // Add new workers
      for (const workerId of newWorkerIds) {
        if (!currentWorkerIds.includes(workerId)) {
          await apolloClient.mutate({
            mutation: ADD_WORKER_TO_TEAM_MUTATION,
            variables: { teamId: this.selectedTeam.id, workerId }
          });
        }
      }

      this.snackBar.open('Team updated successfully', 'Close', { duration: 3000 });
      this.isEditing = false;
      await this.loadData();

      // Re-select the team to refresh details
      const updated = this.teams.find(t => t.id === this.selectedTeam?.id);
      if (updated) {
        this.selectedTeam = updated;
        this.resetEditForm();
      }
    } catch (error: any) {
      console.error('Failed to update team:', error);
      this.snackBar.open(error.message || 'Failed to update team', 'Close', { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }

  startAddTeam(): void {
    this.isAddingNew = true;
    this.selectedTeam = null;
    this.isEditing = false;
    this.newTeam = {
      name: '',
      workerIds: []
    };
  }

  cancelAdd(): void {
    this.isAddingNew = false;
  }

  async saveNewTeam(): Promise<void> {
    if (!this.newTeam.name.trim()) return;

    this.saving = true;
    try {
      // Create team
      const result: any = await apolloClient.mutate({
        mutation: CREATE_TEAM_MUTATION,
        variables: { name: this.newTeam.name.trim() }
      });

      const newTeamId = result.data.createTeam.id;

      // Assign workers
      for (const workerId of this.newTeam.workerIds) {
        await apolloClient.mutate({
          mutation: ADD_WORKER_TO_TEAM_MUTATION,
          variables: { teamId: newTeamId, workerId }
        });
      }

      this.snackBar.open('Team created successfully', 'Close', { duration: 3000 });
      this.isAddingNew = false;
      await this.loadData();

      // Select the new team
      const created = this.teams.find(t => t.id === newTeamId);
      if (created) {
        this.selectTeam(created);
      }
    } catch (error: any) {
      console.error('Failed to create team:', error);
      this.snackBar.open(error.message || 'Failed to create team', 'Close', { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }

  confirmDelete(): void {
    if (!this.selectedTeam) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Team',
        message: `Are you sure you want to delete "${this.selectedTeam.name}"?`,
        confirmText: 'Delete',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteTeam();
      }
    });
  }

  async deleteTeam(): Promise<void> {
    if (!this.selectedTeam) return;

    this.saving = true;
    try {
      await apolloClient.mutate({
        mutation: DELETE_TEAM_MUTATION,
        variables: { id: this.selectedTeam.id }
      });

      this.snackBar.open('Team deleted successfully', 'Close', { duration: 3000 });
      this.selectedTeam = null;
      await this.loadData();
    } catch (error: any) {
      console.error('Failed to delete team:', error);
      this.snackBar.open(error.message || 'Failed to delete team', 'Close', { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }
}
