import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { gql } from '@apollo/client';
import { apolloClient } from '../app.config';
import { SlideInPanelRef } from '../shared/services/slide-in-panel.service';

interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
}

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

const ADD_WORKER_TO_TEAM_MUTATION = gql`
  mutation AddWorkerToTeam($teamId: ID!, $workerId: ID!) {
    addWorkerToTeam(teamId: $teamId, workerId: $workerId) {
      id
    }
  }
`;

@Component({
  selector: 'app-add-team-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon>group_add</mat-icon>
          Add New Team
        </h2>
        <button class="panel-close" (click)="panelRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">
        <form class="team-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Team Name</mat-label>
            <input matInput
                   [(ngModel)]="teamName"
                   name="name"
                   required
                   placeholder="e.g., Development Team">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Assign Workers</mat-label>
            <mat-select [(ngModel)]="selectedWorkerIds" name="workers" multiple>
              <mat-option *ngFor="let worker of workers" [value]="worker.id">
                {{ displayName(worker) }}
              </mat-option>
            </mat-select>
            <mat-hint>Optional - select one or more workers</mat-hint>
          </mat-form-field>
        </form>
      </div>

      <div class="panel-actions">
        <span class="spacer"></span>
        <button mat-button (click)="panelRef.close()">Cancel</button>
        <button mat-raised-button
                color="primary"
                (click)="onSubmit()"
                [disabled]="loading || !teamName.trim()">
          <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
          <span *ngIf="!loading">Add Team</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .team-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
    }

    .full-width {
      width: 100%;
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `]
})
export class AddTeamDialogComponent implements OnInit {
  teamName = '';
  workers: Worker[] = [];
  selectedWorkerIds: string[] = [];
  loading = false;

  constructor(
    public panelRef: SlideInPanelRef<AddTeamDialogComponent>,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadWorkers();
  }

  async loadWorkers(): Promise<void> {
    try {
      const result: any = await apolloClient.query({
        query: GET_WORKERS_QUERY,
        fetchPolicy: 'network-only'
      });
      this.workers = result.data.workers;
    } catch (error) {
      console.error('Failed to load workers:', error);
    }
  }

  displayName(worker: Worker): string {
    const parts = [worker.firstName];
    if (worker.particles) parts.push(worker.particles);
    parts.push(worker.lastName);
    return parts.join(' ');
  }

  async onSubmit(): Promise<void> {
    if (!this.teamName.trim()) return;

    this.loading = true;

    try {
      const result: any = await apolloClient.mutate({
        mutation: CREATE_TEAM_MUTATION,
        variables: {
          name: this.teamName.trim()
        }
      });

      const teamId = result.data.createTeam.id;

      for (const workerId of this.selectedWorkerIds) {
        await apolloClient.mutate({
          mutation: ADD_WORKER_TO_TEAM_MUTATION,
          variables: { teamId, workerId }
        });
      }

      await apolloClient.refetchQueries({
        include: ['GetTeams', 'GetWorkers']
      });

      this.snackBar.open('Team added successfully', 'Close', { duration: 3000 });
      this.panelRef.close(true);
    } catch (error: any) {
      console.error('Failed to add team:', error);
      this.snackBar.open(error.message || 'Failed to add team', 'Close', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
}
