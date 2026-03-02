import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { NotificationService } from '../../shared/services/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService } from '../../shared/services/auth.service';
import { SlideInPanelService } from '../../shared/services/slide-in-panel.service';
import { UserPreferencesService } from '../../shared/services/user-preferences.service';
import { AddTeamDialogComponent } from '../../shell/add-team-dialog.component';
import { TeamMembersPanelComponent, TeamMembersPanelData } from '../../shared/components/team-members-panel.component';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
}

interface Team {
  id: string;
  name: string;
  members: Member[];
}

const GET_TEAMS_QUERY = gql`
  query GetTeams {
    teams {
      id
      name
      members {
        id
        firstName
        lastName
        particles
        email
      }
    }
  }
`;

const GET_MEMBERS_QUERY = gql`
  query GetMembers {
    members {
      id
      firstName
      lastName
      particles
      email
    }
  }
`;

@Component({
  selector: 'app-manage-teams',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslateModule
  ],
  template: `
    <div class="teams-view" *ngIf="!loading; else loadingTpl">
      <div class="view-header">
        <button mat-icon-button
                (click)="openAddTeam()"
                [matTooltip]="'teams.addTeam' | translate">
          <mat-icon>group_add</mat-icon>
        </button>
        <input class="search-input"
               [(ngModel)]="searchText"
               (ngModelChange)="filterTeams()"
               [placeholder]="'teams.searchTeams' | translate">
      </div>

      <div class="table-scroll">
        <mat-table [dataSource]="filteredTeams" class="teams-table">

          <ng-container matColumnDef="name">
            <mat-header-cell *matHeaderCellDef
                             (click)="toggleSort()"
                             class="sortable-header">
              {{ 'teams.name' | translate }}
              <mat-icon class="sort-icon">
                {{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
              </mat-icon>
            </mat-header-cell>
            <mat-cell *matCellDef="let team">{{ team.name }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="count">
            <mat-header-cell *matHeaderCellDef>{{ 'teams.members' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let team" class="count-cell">
              {{ team.members.length }}
            </mat-cell>
          </ng-container>

          <mat-header-row *matHeaderRowDef="tableColumns; sticky: true"></mat-header-row>
          <mat-row *matRowDef="let row; columns: tableColumns;" (click)="openMembers(row)"></mat-row>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" colspan="2">
              <div class="empty-state">
                <mat-icon>group_off</mat-icon>
                <span>{{ 'teams.noTeamsFound' | translate }}</span>
              </div>
            </td>
          </tr>
        </mat-table>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="loading">
        <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
      </div>
    </ng-template>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
      height: 100%;
      flex-direction: column;
    }

    .teams-view {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    .view-header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 8px 4px 8px;
      flex-shrink: 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      color: var(--mat-sys-on-surface);
      font-size: 14px;
      padding: 4px;
    }

    .search-input::placeholder {
      color: var(--mat-sys-on-surface-variant);
    }

    .table-scroll {
      flex: 1;
      overflow-y: auto;
    }

    .teams-table {
      width: 100%;
      background: transparent;
    }

    .teams-table .mat-mdc-header-cell {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container);
      padding: 0 16px;
    }

    .teams-table .mat-mdc-cell {
      font-size: 14px;
      padding: 0 16px;
    }

    .teams-table .mat-mdc-row {
      cursor: pointer;
      min-height: 44px;
    }

    .teams-table .mat-mdc-row:hover .mat-mdc-cell {
      background: var(--mat-sys-surface-container);
    }

    .sortable-header {
      cursor: pointer;
      user-select: none;
    }

    .sort-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      margin-left: 4px;
    }

    .count-cell {
      max-width: 100px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 16px;
      color: var(--mat-sys-on-surface-variant);
      gap: 12px;
      font-size: 14px;
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 1;
      padding: 48px;
    }
  `]
})
export class ManageTeamsComponent implements OnInit {
  @Input() myTeamsOnly = false;

  teams: Team[] = [];
  filteredTeams: Team[] = [];
  allMembers: Member[] = [];
  loading = true;
  searchText = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  tableColumns = ['name', 'count'];

  constructor(
    private notificationService: NotificationService,
    private panelService: SlideInPanelService,
    private userPreferencesService: UserPreferencesService,
    private authService: AuthService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    try {
      const [teamsResult, membersResult]: any[] = await Promise.all([
        apolloClient.query({ query: GET_TEAMS_QUERY, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GET_MEMBERS_QUERY, fetchPolicy: 'network-only' })
      ]);
      this.teams = teamsResult.data.teams;
      this.allMembers = membersResult.data.members;
      this.filterTeams();
    } catch {
      this.notificationService.error(this.translate.instant('teams.messages.loadFailed'));
    } finally {
      this.loading = false;
    }
  }

  filterTeams(): void {
    let filtered = this.teams;
    if (this.myTeamsOnly) {
      const adminIds = this.authService.currentUser?.teamAdminIds ?? [];
      filtered = filtered.filter(t => adminIds.includes(Number(t.id)));
    }
    if (this.searchText) {
      const term = this.searchText.toLowerCase();
      filtered = filtered.filter(t => t.name.toLowerCase().includes(term));
    }
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.filteredTeams = [...filtered].sort((a, b) => a.name.localeCompare(b.name) * dir);
  }

  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.filterTeams();
  }

  openMembers(team: Team): void {
    const isNarrow = window.innerWidth < 768;
    const navExpanded = this.userPreferencesService.preferences.navigationExpanded;
    const railWidth = isNarrow ? 0 : (navExpanded ? 220 : 80);
    const leftOffset = railWidth > 0 ? `${railWidth}px` : undefined;

    const panelRef = this.panelService.open<TeamMembersPanelComponent, TeamMembersPanelData, boolean>(
      TeamMembersPanelComponent,
      {
        leftOffset,
        data: {
          teamId: team.id,
          teamName: team.name,
          members: team.members,
          allMembers: this.allMembers
        }
      }
    );

    panelRef.afterClosed().subscribe(reloadNeeded => {
      if (reloadNeeded) {
        this.loadData();
      }
    });
  }

  openAddTeam(): void {
    const isNarrow = window.innerWidth < 768;
    const navExpanded = this.userPreferencesService.preferences.navigationExpanded;
    const railWidth = isNarrow ? 0 : (navExpanded ? 220 : 80);
    const leftOffset = railWidth > 0 ? `${railWidth}px` : undefined;

    const addRef = this.panelService.open<AddTeamDialogComponent, void, boolean>(
      AddTeamDialogComponent,
      { leftOffset }
    );

    addRef.afterClosed().subscribe(saved => {
      if (saved) {
        this.loadData();
      }
    });
  }
}
