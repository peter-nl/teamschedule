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
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { SlideInPanelRef, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';

export interface TeamEditDialogData {
  team: {
    id: string;
    name: string;
    memberIds: string[];
  };
  allMembers: { id: string; firstName: string; lastName: string; particles: string | null }[];
}

const UPDATE_TEAM_MUTATION = gql`
  mutation UpdateTeam($id: ID!, $name: String!) {
    updateTeam(id: $id, name: $name) {
      id name
    }
  }
`;

const ADD_MEMBER_TO_TEAM_MUTATION = gql`
  mutation AddMemberToTeam($teamId: ID!, $memberId: ID!) {
    addMemberToTeam(teamId: $teamId, memberId: $memberId) { id }
  }
`;

const REMOVE_MEMBER_FROM_TEAM_MUTATION = gql`
  mutation RemoveMemberFromTeam($teamId: ID!, $memberId: ID!) {
    removeMemberFromTeam(teamId: $teamId, memberId: $memberId) { id }
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
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon>edit</mat-icon>
          {{ 'editTeam.title' | translate }}
        </h2>
        <button class="panel-close" (click)="panelRef.close()" [disabled]="saving">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">
        <div class="form-content">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editTeam.teamId' | translate }}</mat-label>
            <input matInput [value]="data.team.id" disabled>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editTeam.teamName' | translate }}</mat-label>
            <input matInput [(ngModel)]="editForm.name" name="name">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editTeam.members' | translate }}</mat-label>
            <mat-select [(ngModel)]="editForm.memberIds" name="members" multiple>
              <mat-option *ngFor="let member of data.allMembers" [value]="member.id">
                {{ displayName(member) }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <div class="panel-actions">
        <span class="spacer"></span>
        <button mat-icon-button (click)="panelRef.close()" [disabled]="saving" [matTooltip]="'common.cancel' | translate">
          <mat-icon>close</mat-icon>
        </button>
        <button mat-icon-button color="primary"
                (click)="onSave()"
                [disabled]="saving || !isFormValid"
                [matTooltip]="'common.save' | translate">
          <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
          <mat-icon *ngIf="!saving">check</mat-icon>
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
    memberIds: string[];
  };

  saving = false;

  constructor(
    public panelRef: SlideInPanelRef<TeamEditDialogComponent, boolean>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: TeamEditDialogData,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {
    this.editForm = {
      name: data.team.name,
      memberIds: [...data.team.memberIds]
    };
  }

  displayName(member: { firstName: string; lastName: string; particles: string | null }): string {
    const parts = [member.firstName];
    if (member.particles) parts.push(member.particles);
    parts.push(member.lastName);
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

      // Update member assignments
      const currentMemberIds = this.data.team.memberIds;
      const newMemberIds = this.editForm.memberIds;

      for (const memberId of currentMemberIds) {
        if (!newMemberIds.includes(memberId)) {
          await apolloClient.mutate({
            mutation: REMOVE_MEMBER_FROM_TEAM_MUTATION,
            variables: { teamId: this.data.team.id, memberId }
          });
        }
      }

      for (const memberId of newMemberIds) {
        if (!currentMemberIds.includes(memberId)) {
          await apolloClient.mutate({
            mutation: ADD_MEMBER_TO_TEAM_MUTATION,
            variables: { teamId: this.data.team.id, memberId }
          });
        }
      }

      this.snackBar.open(this.translate.instant('editTeam.messages.updated'), this.translate.instant('common.close'), { duration: 3000 });
      this.panelRef.close(true);
    } catch (error: any) {
      console.error('Failed to update team:', error);
      this.snackBar.open(error.message || this.translate.instant('editTeam.messages.updateFailed'), this.translate.instant('common.close'), { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }
}
