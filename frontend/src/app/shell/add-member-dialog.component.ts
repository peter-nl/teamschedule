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

const CREATE_MEMBER_MUTATION = gql`
  mutation CreateMember($id: String!, $firstName: String!, $lastName: String!, $particles: String, $email: String, $password: String!) {
    createMember(id: $id, firstName: $firstName, lastName: $lastName, particles: $particles, email: $email, password: $password) {
      id
      firstName
      lastName
      particles
      email
      role
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
  selector: 'app-add-member-dialog',
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
          <mat-icon>person_add</mat-icon>
          {{ 'addMember.title' | translate }}
        </h2>
        <button class="panel-close" (click)="panelRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">
        <form class="member-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'addMember.memberId' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="memberForm.id"
                   name="id"
                   required
                   [placeholder]="'addMember.memberIdPlaceholder' | translate">
            <mat-hint>{{ 'addMember.memberIdHint' | translate }}</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'addMember.firstName' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="memberForm.firstName"
                   name="firstName"
                   required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'addMember.particles' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="memberForm.particles"
                   name="particles"
                   [placeholder]="'addMember.particlesPlaceholder' | translate">
            <mat-hint>{{ 'addMember.particlesHint' | translate }}</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'addMember.lastName' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="memberForm.lastName"
                   name="lastName"
                   required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'addMember.email' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="memberForm.email"
                   name="email"
                   type="email"
                   required
                   [placeholder]="'addMember.emailPlaceholder' | translate">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'addMember.assignTeams' | translate }}</mat-label>
            <mat-select [(ngModel)]="selectedTeamIds" name="teams" multiple>
              <mat-option *ngFor="let team of teams" [value]="team.id">
                {{ team.name }}
              </mat-option>
            </mat-select>
            <mat-hint>{{ 'addMember.assignTeamsHint' | translate }}</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'addMember.password' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="memberForm.password"
                   name="password"
                   [type]="hidePassword ? 'password' : 'text'"
                   required>
            <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
              <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-hint>{{ 'addMember.passwordHint' | translate }}</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'addMember.confirmPassword' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="memberForm.confirmPassword"
                   name="confirmPassword"
                   [type]="hideConfirmPassword ? 'password' : 'text'"
                   required>
            <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword">
              <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
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
                [disabled]="loading || !isValid()">
          <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
          <span *ngIf="!loading">{{ 'addMember.addButton' | translate }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .member-form {
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
export class AddMemberDialogComponent implements OnInit {
  memberForm = {
    id: '',
    firstName: '',
    lastName: '',
    particles: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  teams: Team[] = [];
  selectedTeamIds: string[] = [];
  loading = false;
  hidePassword = true;
  hideConfirmPassword = true;

  constructor(
    public panelRef: SlideInPanelRef<AddMemberDialogComponent>,
    private snackBar: MatSnackBar,
    private translate: TranslateService
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
      this.memberForm.id &&
      this.memberForm.firstName &&
      this.memberForm.lastName &&
      this.memberForm.email &&
      this.memberForm.password &&
      this.memberForm.password === this.memberForm.confirmPassword
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid()) return;

    this.loading = true;

    try {
      // Create the member
      await apolloClient.mutate({
        mutation: CREATE_MEMBER_MUTATION,
        variables: {
          id: this.memberForm.id,
          firstName: this.memberForm.firstName,
          lastName: this.memberForm.lastName,
          particles: this.memberForm.particles || null,
          email: this.memberForm.email || null,
          password: this.memberForm.password
        }
      });

      // Assign member to selected teams
      for (const teamId of this.selectedTeamIds) {
        await apolloClient.mutate({
          mutation: ADD_MEMBER_TO_TEAM_MUTATION,
          variables: {
            teamId: teamId,
            memberId: this.memberForm.id
          }
        });
      }

      // Refetch relevant queries
      await apolloClient.refetchQueries({
        include: ['GetMembers', 'GetTeams']
      });

      this.snackBar.open(this.translate.instant('addMember.messages.success'), this.translate.instant('common.close'), { duration: 3000 });
      this.panelRef.close(true);
    } catch (error: any) {
      console.error('Failed to add member:', error);
      this.snackBar.open(error.message || this.translate.instant('addMember.messages.failed'), this.translate.instant('common.close'), { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
}
