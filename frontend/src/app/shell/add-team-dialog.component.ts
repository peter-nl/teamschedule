import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { gql } from '@apollo/client';
import { apolloClient } from '../app.config';
import { SlideInPanelRef } from '../shared/services/slide-in-panel.service';

const CREATE_TEAM_MUTATION = gql`
  mutation CreateTeam($name: String!) {
    createTeam(name: $name) {
      id
      name
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
      min-width: 300px;
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
export class AddTeamDialogComponent {
  teamName = '';
  loading = false;

  constructor(
    public panelRef: SlideInPanelRef<AddTeamDialogComponent>,
    private snackBar: MatSnackBar
  ) {}

  async onSubmit(): Promise<void> {
    if (!this.teamName.trim()) return;

    this.loading = true;

    try {
      await apolloClient.mutate({
        mutation: CREATE_TEAM_MUTATION,
        variables: {
          name: this.teamName.trim()
        },
        refetchQueries: ['GetTeams']
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
