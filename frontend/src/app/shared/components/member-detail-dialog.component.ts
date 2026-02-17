import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService } from '../services/auth.service';
import { UserPreferencesService } from '../services/user-preferences.service';
import { SlideInPanelRef, SlideInPanelService, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { MemberEditDialogComponent, MemberEditDialogData } from './member-edit-dialog.component';

interface MemberFull {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
  role: string;
  teams: { id: string; name: string }[];
}

export interface MemberDetailDialogData {
  memberId: string;
  leftOffset?: string;
}

export interface MemberDetailDialogResult {
  action: 'saved' | 'deleted';
}

const GET_MEMBERS_QUERY = gql`
  query GetMembers {
    members {
      id
      firstName
      lastName
      particles
      email
      role
      teams { id, name }
    }
  }
`;

const GET_TEAMS_QUERY = gql`
  query GetTeams {
    teams { id, name }
  }
`;

const DELETE_MEMBER_MUTATION = gql`
  mutation DeleteMember($id: ID!) {
    deleteMember(id: $id)
  }
`;

@Component({
  selector: 'app-member-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    TranslateModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon>person</mat-icon>
          {{ 'memberDetail.title' | translate }}
        </h2>
        <button class="panel-close" (click)="panelRef.close(hasChanges ? { action: 'saved' } : undefined)">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">
        <div *ngIf="loadingData" class="loading">
          <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
        </div>

        <div *ngIf="!loadingData && member" class="detail-content">
          <div class="detail-row">
            <span class="detail-label">{{ 'memberDetail.memberId' | translate }}</span>
            <span class="detail-value">{{ member.id }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">{{ 'memberDetail.name' | translate }}</span>
            <span class="detail-value">{{ memberDisplayName }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">{{ 'memberDetail.email' | translate }}</span>
            <span class="detail-value" [class.muted]="!member.email">{{ member.email || ('memberDetail.notSet' | translate) }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">{{ 'memberDetail.role' | translate }}</span>
            <span class="detail-value role-badge" [class.manager]="member.role === 'manager'">
              <mat-icon>{{ member.role === 'manager' ? 'admin_panel_settings' : 'person' }}</mat-icon>
              {{ (member.role === 'manager' ? 'common.manager' : 'common.user') | translate }}
            </span>
          </div>

          <div class="detail-row" *ngIf="member.teams.length > 0">
            <span class="detail-label">{{ 'memberDetail.teams' | translate }}</span>
            <div class="teams-list">
              <mat-chip-set>
                <mat-chip *ngFor="let team of member.teams">{{ team.name }}</mat-chip>
              </mat-chip-set>
            </div>
          </div>

          <div class="detail-row" *ngIf="member.teams.length === 0">
            <span class="detail-label">{{ 'memberDetail.teams' | translate }}</span>
            <span class="detail-value muted">{{ 'memberDetail.noTeams' | translate }}</span>
          </div>
        </div>
      </div>

      <div class="panel-actions" *ngIf="!loadingData && member">
        <button mat-icon-button color="warn"
                *ngIf="canDelete"
                (click)="onDelete()"
                [disabled]="deleting"
                [matTooltip]="'common.delete' | translate">
          <mat-spinner *ngIf="deleting" diameter="18"></mat-spinner>
          <mat-icon *ngIf="!deleting">delete</mat-icon>
        </button>
        <span class="spacer"></span>
        <button mat-icon-button (click)="panelRef.close(hasChanges ? { action: 'saved' } : undefined)" [disabled]="deleting" [matTooltip]="'common.close' | translate">
          <mat-icon>close</mat-icon>
        </button>
        <button *ngIf="canEdit" mat-icon-button color="primary" (click)="openEdit()" [matTooltip]="'common.edit' | translate">
          <mat-icon>edit</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-value {
      font-size: 16px;
      color: var(--mat-sys-on-surface);
    }

    .detail-value.muted {
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .role-badge mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--mat-sys-on-surface-variant);
    }

    .role-badge.manager mat-icon {
      color: var(--mat-sys-primary);
    }

    .teams-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .delete-button {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 4px;
    }
  `]
})
export class MemberDetailDialogComponent implements OnInit {
  member: MemberFull | null = null;
  allTeams: { id: string; name: string }[] = [];
  loadingData = true;
  deleting = false;
  hasChanges = false;
  private managementModeEnabled = false;

  constructor(
    public panelRef: SlideInPanelRef<MemberDetailDialogComponent, MemberDetailDialogResult>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: MemberDetailDialogData,
    private authService: AuthService,
    private userPreferencesService: UserPreferencesService,
    private snackBar: MatSnackBar,
    private panelService: SlideInPanelService,
    private translate: TranslateService
  ) {
    this.managementModeEnabled = this.userPreferencesService.preferences.managementMode;
    this.userPreferencesService.preferences$.subscribe(prefs => {
      this.managementModeEnabled = prefs.managementMode;
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  get memberDisplayName(): string {
    if (!this.member) return '';
    const parts = [this.member.firstName];
    if (this.member.particles) parts.push(this.member.particles);
    parts.push(this.member.lastName);
    return parts.join(' ');
  }

  private get isSelf(): boolean {
    return this.member?.id === this.authService.currentUser?.id;
  }

  private get isManager(): boolean {
    return this.authService.isManager && this.managementModeEnabled;
  }

  get canEdit(): boolean {
    return this.isSelf || this.isManager;
  }

  get canDelete(): boolean {
    return this.isManager && !this.isSelf;
  }

  private async loadData(): Promise<void> {
    this.loadingData = true;
    try {
      const [membersResult, teamsResult]: any[] = await Promise.all([
        apolloClient.query({ query: GET_MEMBERS_QUERY, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GET_TEAMS_QUERY, fetchPolicy: 'network-only' })
      ]);

      this.allTeams = teamsResult.data.teams;
      const members: MemberFull[] = membersResult.data.members;
      this.member = members.find(m => m.id === this.data.memberId) || null;
    } catch (error) {
      console.error('Failed to load member data:', error);
      this.snackBar.open(this.translate.instant('memberDetail.messages.loadFailed'), this.translate.instant('common.close'), { duration: 3000 });
    } finally {
      this.loadingData = false;
    }
  }

  openEdit(): void {
    if (!this.member) return;

    const editRef = this.panelService.open<MemberEditDialogComponent, MemberEditDialogData, boolean>(
      MemberEditDialogComponent,
      {
        leftOffset: this.data.leftOffset,
        data: {
          member: { ...this.member, teams: [...this.member.teams] },
          allTeams: this.allTeams,
          isSelf: this.isSelf,
          isManager: this.isManager
        }
      }
    );

    editRef.afterClosed().subscribe(saved => {
      if (saved) {
        this.hasChanges = true;
        this.loadData();
      }
    });
  }

  onDelete(): void {
    if (!this.member) return;

    const confirmRef = this.panelService.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: this.translate.instant('memberDetail.deleteTitle'),
        message: this.translate.instant('memberDetail.deleteMessage', { name: this.memberDisplayName }),
        confirmText: this.translate.instant('common.delete'),
        confirmColor: 'warn'
      }
    });

    confirmRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteMember();
      }
    });
  }

  private async deleteMember(): Promise<void> {
    if (!this.member) return;

    this.deleting = true;
    try {
      await apolloClient.mutate({
        mutation: DELETE_MEMBER_MUTATION,
        variables: { id: this.member.id }
      });

      this.snackBar.open(this.translate.instant('memberDetail.messages.deleted'), this.translate.instant('common.close'), { duration: 3000 });
      this.panelRef.close({ action: 'deleted' });
    } catch (error: any) {
      console.error('Failed to delete member:', error);
      this.snackBar.open(error.message || this.translate.instant('memberDetail.messages.deleteFailed'), this.translate.instant('common.close'), { duration: 5000 });
    } finally {
      this.deleting = false;
    }
  }
}
