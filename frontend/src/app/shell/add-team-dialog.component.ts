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
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../app.config';
import { SlideInPanelRef } from '../shared/services/slide-in-panel.service';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
}

const GET_MEMBERS_QUERY = gql`
  query GetMembers {
    members {
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

const ADD_MEMBER_TO_TEAM_MUTATION = gql`
  mutation AddMemberToTeam($teamId: ID!, $memberId: ID!) {
    addMemberToTeam(teamId: $teamId, memberId: $memberId) {
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
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon>group_add</mat-icon>
          {{ 'addTeam.title' | translate }}
        </h2>
        <button class="panel-close" (click)="panelRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">
        <form class="team-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'addTeam.teamName' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="teamName"
                   name="name"
                   required
                   [placeholder]="'addTeam.teamNamePlaceholder' | translate">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'addTeam.assignMembers' | translate }}</mat-label>
            <mat-select [(ngModel)]="selectedMemberIds" name="members" multiple>
              <mat-option *ngFor="let member of members" [value]="member.id">
                {{ displayName(member) }}
              </mat-option>
            </mat-select>
            <mat-hint>{{ 'addTeam.assignMembersHint' | translate }}</mat-hint>
          </mat-form-field>
        </form>
      </div>

      <div class="panel-actions">
        <span class="spacer"></span>
        <button mat-icon-button (click)="panelRef.close()" [matTooltip]="'common.cancel' | translate">
          <mat-icon>close</mat-icon>
        </button>
        <button mat-raised-button
                color="primary"
                (click)="onSubmit()"
                [disabled]="loading || !teamName.trim()">
          <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
          <span *ngIf="!loading">{{ 'addTeam.addButton' | translate }}</span>
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
  members: Member[] = [];
  selectedMemberIds: string[] = [];
  loading = false;

  constructor(
    public panelRef: SlideInPanelRef<AddTeamDialogComponent>,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadMembers();
  }

  async loadMembers(): Promise<void> {
    try {
      const result: any = await apolloClient.query({
        query: GET_MEMBERS_QUERY,
        fetchPolicy: 'network-only'
      });
      this.members = result.data.members;
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  }

  displayName(member: Member): string {
    const parts = [member.firstName];
    if (member.particles) parts.push(member.particles);
    parts.push(member.lastName);
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

      for (const memberId of this.selectedMemberIds) {
        await apolloClient.mutate({
          mutation: ADD_MEMBER_TO_TEAM_MUTATION,
          variables: { teamId, memberId }
        });
      }

      await apolloClient.refetchQueries({
        include: ['GetTeams', 'GetMembers']
      });

      this.snackBar.open(this.translate.instant('addTeam.messages.success'), this.translate.instant('common.close'), { duration: 3000 });
      this.panelRef.close(true);
    } catch (error: any) {
      console.error('Failed to add team:', error);
      this.snackBar.open(error.message || this.translate.instant('addTeam.messages.failed'), this.translate.instant('common.close'), { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
}
