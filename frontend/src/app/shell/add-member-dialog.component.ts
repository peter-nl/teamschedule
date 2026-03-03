import { Component, OnInit, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '../shared/services/notification.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../app.config';
import { SlideInPanelRef, SLIDE_IN_PANEL_DATA } from '../shared/services/slide-in-panel.service';

interface Team {
  id: string;
  name: string;
}

const GET_TEAMS_QUERY = gql`
  query GetTeamsForMemberDialog($orgId: ID) {
    teams(orgId: $orgId) {
      id
      name
    }
  }
`;

const LOOKUP_PERSON_QUERY = gql`
  query LookupPersonByEmail($email: String!) {
    lookupPersonByEmail(email: $email) {
      id firstName lastName username
    }
  }
`;

const CREATE_MEMBER_MUTATION = gql`
  mutation CreateMember($firstName: String!, $lastName: String!, $particles: String, $email: String, $password: String!, $orgId: ID) {
    createMember(firstName: $firstName, lastName: $lastName, particles: $particles, email: $email, password: $password, orgId: $orgId) {
      id firstName lastName particles email role
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

        <!-- Step 1: email check -->
        <ng-container *ngIf="step === 'email'">
          <p class="step-hint">{{ 'addMember.emailStepHint' | translate }}</p>
          <div class="email-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'addMember.email' | translate }}</mat-label>
              <input matInput
                     [(ngModel)]="emailInput"
                     name="emailInput"
                     type="email"
                     (keydown.enter)="checkEmail()"
                     [placeholder]="'addMember.emailPlaceholder' | translate">
            </mat-form-field>
            <button mat-flat-button color="primary"
                    [disabled]="!emailInput || checking"
                    (click)="checkEmail()">
              <mat-spinner *ngIf="checking" diameter="18"></mat-spinner>
              <span *ngIf="!checking">{{ 'addMember.checkEmail' | translate }}</span>
            </button>
          </div>
        </ng-container>

        <!-- Step 2a: existing person found -->
        <ng-container *ngIf="step === 'add-existing'">
          <div class="person-found-banner">
            <mat-icon>check_circle</mat-icon>
            {{ 'addMember.personFound' | translate }}
          </div>
          <div class="existing-info">
            <span class="label">{{ 'addMember.firstName' | translate }}</span>
            <span>{{ existingPerson!.firstName }}</span>
            <span class="label">{{ 'addMember.lastName' | translate }}</span>
            <span>{{ existingPerson!.lastName }}</span>
            <span class="label">{{ 'login.username' | translate }}</span>
            <span>{{ existingPerson!.username }}</span>
          </div>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'addMember.assignTeams' | translate }}</mat-label>
            <mat-select [(ngModel)]="selectedTeamIds" name="teams" multiple>
              <mat-option *ngFor="let team of teams" [value]="team.id">
                {{ team.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </ng-container>

        <!-- Step 2b: new person form -->
        <ng-container *ngIf="step === 'create'">
          <div class="person-not-found-banner">
            <mat-icon>info</mat-icon>
            {{ 'addMember.personNotFound' | translate }}
          </div>
          <form class="member-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'addMember.email' | translate }}</mat-label>
              <input matInput [(ngModel)]="memberForm.email" name="email" type="email" [placeholder]="'addMember.emailPlaceholder' | translate">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'addMember.firstName' | translate }}</mat-label>
              <input matInput [(ngModel)]="memberForm.firstName" name="firstName" maxlength="35" required>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'addMember.particles' | translate }}</mat-label>
              <input matInput [(ngModel)]="memberForm.particles" name="particles" maxlength="35"
                     [placeholder]="'addMember.particlesPlaceholder' | translate">
              <mat-hint>{{ 'addMember.particlesHint' | translate }}</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'addMember.lastName' | translate }}</mat-label>
              <input matInput [(ngModel)]="memberForm.lastName" name="lastName" maxlength="35" required>
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
              <input matInput [(ngModel)]="memberForm.password" name="password"
                     [type]="hidePassword ? 'password' : 'text'" required>
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-hint>{{ 'addMember.passwordHint' | translate }}</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'addMember.confirmPassword' | translate }}</mat-label>
              <input matInput [(ngModel)]="memberForm.confirmPassword" name="confirmPassword"
                     [type]="hideConfirmPassword ? 'password' : 'text'" required>
              <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword">
                <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>
          </form>
        </ng-container>

      </div>

      <div class="panel-actions">
        <button mat-button *ngIf="step !== 'email'" (click)="backToEmail()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <span class="spacer"></span>
        <button mat-icon-button (click)="panelRef.close()" [matTooltip]="'common.cancel' | translate">
          <mat-icon>close</mat-icon>
        </button>
        <button mat-raised-button
                *ngIf="step !== 'email'"
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
    .step-hint {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 12px;
    }

    .email-row {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .email-row .full-width { flex: 1; }
    .email-row button { margin-top: 4px; }

    .person-found-banner, .person-not-found-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .person-found-banner {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .person-not-found-banner {
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface-variant);
    }

    .existing-info {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 12px;
      align-items: baseline;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .existing-info .label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mat-sys-on-surface-variant);
    }

    .member-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }

    .full-width { width: 100%; }

    button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `]
})
export class AddMemberDialogComponent implements OnInit {
  step: 'email' | 'add-existing' | 'create' = 'email';
  emailInput = '';
  checking = false;
  existingPerson: { id: string; firstName: string; lastName: string; username: string } | null = null;

  memberForm = {
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
    private notificationService: NotificationService,
    private translate: TranslateService,
    @Optional() @Inject(SLIDE_IN_PANEL_DATA) private data?: { orgId?: string }
  ) {}

  ngOnInit(): void {
    this.loadTeams();
  }

  async loadTeams(): Promise<void> {
    try {
      const result: any = await apolloClient.query({
        query: GET_TEAMS_QUERY,
        variables: { orgId: this.data?.orgId },
        fetchPolicy: 'network-only'
      });
      this.teams = result.data.teams;
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  }

  async checkEmail(): Promise<void> {
    if (!this.emailInput) return;
    this.checking = true;
    try {
      const result: any = await apolloClient.query({
        query: LOOKUP_PERSON_QUERY,
        variables: { email: this.emailInput },
        fetchPolicy: 'network-only'
      });
      const person = result.data.lookupPersonByEmail;
      if (person) {
        this.existingPerson = person;
        this.step = 'add-existing';
      } else {
        this.existingPerson = null;
        this.memberForm.email = this.emailInput;
        this.step = 'create';
      }
    } catch (error) {
      console.error('Failed to look up person:', error);
      this.memberForm.email = this.emailInput;
      this.step = 'create';
    } finally {
      this.checking = false;
    }
  }

  backToEmail(): void {
    this.step = 'email';
    this.existingPerson = null;
    this.selectedTeamIds = [];
  }

  isValid(): boolean {
    if (this.step === 'add-existing') return true;
    if (this.step === 'create') {
      return !!(
        this.memberForm.firstName &&
        this.memberForm.lastName &&
        this.memberForm.password &&
        this.memberForm.password === this.memberForm.confirmPassword
      );
    }
    return false;
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid()) return;
    this.loading = true;
    try {
      let createdMemberId: string;

      if (this.step === 'add-existing') {
        // Existing person — create membership via createMember (email triggers existing-person path)
        const result: any = await apolloClient.mutate({
          mutation: CREATE_MEMBER_MUTATION,
          variables: {
            firstName: this.existingPerson!.firstName,
            lastName: this.existingPerson!.lastName,
            particles: null,
            email: this.emailInput,
            password: crypto.randomUUID(), // dummy — backend ignores when person exists
            orgId: this.data?.orgId
          }
        });
        createdMemberId = result.data.createMember.id;
      } else {
        // New person
        const result: any = await apolloClient.mutate({
          mutation: CREATE_MEMBER_MUTATION,
          variables: {
            firstName: this.memberForm.firstName,
            lastName: this.memberForm.lastName,
            particles: this.memberForm.particles || null,
            email: this.memberForm.email || null,
            password: this.memberForm.password,
            orgId: this.data?.orgId
          }
        });
        createdMemberId = result.data.createMember.id;
      }

      // Assign to selected teams
      for (const teamId of this.selectedTeamIds) {
        await apolloClient.mutate({
          mutation: ADD_MEMBER_TO_TEAM_MUTATION,
          variables: { teamId, memberId: createdMemberId }
        });
      }

      await apolloClient.refetchQueries({ include: ['GetMembers', 'GetTeams'] });
      this.notificationService.success(this.translate.instant('addMember.messages.success'));
      this.panelRef.close(true);
    } catch (error: any) {
      console.error('Failed to add member:', error);
      this.notificationService.error(error.message || this.translate.instant('addMember.messages.failed'));
    } finally {
      this.loading = false;
    }
  }
}
