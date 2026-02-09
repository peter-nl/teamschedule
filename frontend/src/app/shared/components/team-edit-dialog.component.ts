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
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { SlideInPanelRef, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';

export interface TeamEditDialogData {
  team: {
    id: string;
    name: string;
    workerIds: string[];
  };
  allWorkers: { id: string; firstName: string; lastName: string; particles: string | null }[];
}

const UPDATE_TEAM_MUTATION = gql`
  mutation UpdateTeam($id: ID!, $name: String!) {
    updateTeam(id: $id, name: $name) {
      id name
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

@Component({
  selector: 'app-team-edit-dialog',
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
    MatSnackBarModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon>edit</mat-icon>
          Edit Team
        </h2>
        <button class="panel-close" (click)="panelRef.close()" [disabled]="saving">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">
        <div class="form-content">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Team ID</mat-label>
            <input matInput [value]="data.team.id" disabled>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Team Name</mat-label>
            <input matInput [(ngModel)]="editForm.name" name="name">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Workers</mat-label>
            <mat-select [(ngModel)]="editForm.workerIds" name="workers" multiple>
              <mat-option *ngFor="let worker of data.allWorkers" [value]="worker.id">
                {{ displayName(worker) }}
              </mat-option>
            </mat-select>
          </mat-form-field>
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
export class TeamEditDialogComponent {
  editForm: {
    name: string;
    workerIds: string[];
  };

  saving = false;

  constructor(
    public panelRef: SlideInPanelRef<TeamEditDialogComponent, boolean>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: TeamEditDialogData,
    private snackBar: MatSnackBar
  ) {
    this.editForm = {
      name: data.team.name,
      workerIds: [...data.team.workerIds]
    };
  }

  displayName(worker: { firstName: string; lastName: string; particles: string | null }): string {
    const parts = [worker.firstName];
    if (worker.particles) parts.push(worker.particles);
    parts.push(worker.lastName);
    return parts.join(' ');
  }

  get isFormValid(): boolean {
    return !!this.editForm.name.trim();
  }

  async onSave(): Promise<void> {
    this.saving = true;
    try {
      // Update team name if changed
      if (this.editForm.name.trim() !== this.data.team.name) {
        await apolloClient.mutate({
          mutation: UPDATE_TEAM_MUTATION,
          variables: { id: this.data.team.id, name: this.editForm.name.trim() }
        });
      }

      // Update worker assignments
      const currentWorkerIds = this.data.team.workerIds;
      const newWorkerIds = this.editForm.workerIds;

      for (const workerId of currentWorkerIds) {
        if (!newWorkerIds.includes(workerId)) {
          await apolloClient.mutate({
            mutation: REMOVE_WORKER_FROM_TEAM_MUTATION,
            variables: { teamId: this.data.team.id, workerId }
          });
        }
      }

      for (const workerId of newWorkerIds) {
        if (!currentWorkerIds.includes(workerId)) {
          await apolloClient.mutate({
            mutation: ADD_WORKER_TO_TEAM_MUTATION,
            variables: { teamId: this.data.team.id, workerId }
          });
        }
      }

      this.snackBar.open('Team updated', 'Close', { duration: 3000 });
      this.panelRef.close(true);
    } catch (error: any) {
      console.error('Failed to update team:', error);
      this.snackBar.open(error.message || 'Failed to update team', 'Close', { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }
}
