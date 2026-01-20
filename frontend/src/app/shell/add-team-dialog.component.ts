import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { gql } from '@apollo/client';
import { apolloClient } from '../app.config';

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
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>group_add</mat-icon>
      Add New Team
    </h2>

    <mat-dialog-content>
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
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button
              color="primary"
              (click)="onSubmit()"
              [disabled]="loading || !teamName.trim()">
        <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
        <span *ngIf="!loading">Add Team</span>
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

    .team-form {
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
export class AddTeamDialogComponent {
  teamName = '';
  loading = false;

  constructor(
    private dialogRef: MatDialogRef<AddTeamDialogComponent>,
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
      this.dialogRef.close(true);
    } catch (error: any) {
      console.error('Failed to add team:', error);
      this.snackBar.open(error.message || 'Failed to add team', 'Close', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
}
