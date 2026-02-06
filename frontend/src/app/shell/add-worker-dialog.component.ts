import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { gql } from '@apollo/client';
import { apolloClient } from '../app.config';

interface Team {
  id: string;
  name: string;
}

const GET_TEAMS_QUERY = gql`
  query GetTeams {
    teams {
      id
      name
    }
  }
`;

const CREATE_WORKER_MUTATION = gql`
  mutation CreateWorker($id: String!, $firstName: String!, $lastName: String!, $particles: String, $password: String!) {
    createWorker(id: $id, firstName: $firstName, lastName: $lastName, particles: $particles, password: $password) {
      id
      firstName
      lastName
      particles
      role
    }
  }
`;

const ADD_WORKER_TO_TEAM_MUTATION = gql`
  mutation AddWorkerToTeam($teamId: ID!, $workerId: ID!) {
    addWorkerToTeam(teamId: $teamId, workerId: $workerId) {
      id
    }
  }
`;

@Component({
  selector: 'app-add-worker-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>person_add</mat-icon>
      Add New Worker
    </h2>

    <mat-dialog-content>
      <form class="worker-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Worker ID</mat-label>
          <input matInput
                 [(ngModel)]="workerForm.id"
                 name="id"
                 required
                 placeholder="e.g., jdoe001">
          <mat-hint>Unique identifier for the worker</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>First Name</mat-label>
          <input matInput
                 [(ngModel)]="workerForm.firstName"
                 name="firstName"
                 required>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Particles (prefix)</mat-label>
          <input matInput
                 [(ngModel)]="workerForm.particles"
                 name="particles"
                 placeholder="e.g., van, de, von">
          <mat-hint>Optional name prefix</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Last Name</mat-label>
          <input matInput
                 [(ngModel)]="workerForm.lastName"
                 name="lastName"
                 required>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Assign to Teams</mat-label>
          <mat-select [(ngModel)]="selectedTeamIds" name="teams" multiple>
            <mat-option *ngFor="let team of teams" [value]="team.id">
              {{ team.name }}
            </mat-option>
          </mat-select>
          <mat-hint>Optional - select one or more teams</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Password</mat-label>
          <input matInput
                 [(ngModel)]="workerForm.password"
                 name="password"
                 [type]="hidePassword ? 'password' : 'text'"
                 required>
          <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
            <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <mat-hint>Initial password for the worker</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Confirm Password</mat-label>
          <input matInput
                 [(ngModel)]="workerForm.confirmPassword"
                 name="confirmPassword"
                 [type]="hideConfirmPassword ? 'password' : 'text'"
                 required>
          <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword">
            <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button
              color="primary"
              (click)="onSubmit()"
              [disabled]="loading || !isValid()">
        <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
        <span *ngIf="!loading">Add Worker</span>
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
      padding: 0 24px;
    }

    .worker-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 300px;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `]
})
export class AddWorkerDialogComponent implements OnInit {
  workerForm = {
    id: '',
    firstName: '',
    lastName: '',
    particles: '',
    password: '',
    confirmPassword: ''
  };

  teams: Team[] = [];
  selectedTeamIds: string[] = [];
  loading = false;
  hidePassword = true;
  hideConfirmPassword = true;

  constructor(
    private dialogRef: MatDialogRef<AddWorkerDialogComponent>,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadTeams();
  }

  async loadTeams(): Promise<void> {
    try {
      const result: any = await apolloClient.query({
        query: GET_TEAMS_QUERY,
        fetchPolicy: 'network-only'
      });
      this.teams = result.data.teams;
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  }

  isValid(): boolean {
    return !!(
      this.workerForm.id &&
      this.workerForm.firstName &&
      this.workerForm.lastName &&
      this.workerForm.password &&
      this.workerForm.password === this.workerForm.confirmPassword
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid()) return;

    this.loading = true;

    try {
      // Create the worker
      await apolloClient.mutate({
        mutation: CREATE_WORKER_MUTATION,
        variables: {
          id: this.workerForm.id,
          firstName: this.workerForm.firstName,
          lastName: this.workerForm.lastName,
          particles: this.workerForm.particles || null,
          password: this.workerForm.password
        }
      });

      // Assign worker to selected teams
      for (const teamId of this.selectedTeamIds) {
        await apolloClient.mutate({
          mutation: ADD_WORKER_TO_TEAM_MUTATION,
          variables: {
            teamId: teamId,
            workerId: this.workerForm.id
          }
        });
      }

      // Refetch relevant queries
      await apolloClient.refetchQueries({
        include: ['GetWorkers', 'GetTeams']
      });

      this.snackBar.open('Worker added successfully', 'Close', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error: any) {
      console.error('Failed to add worker:', error);
      this.snackBar.open(error.message || 'Failed to add worker', 'Close', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
}
