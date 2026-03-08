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
  memberNo: number;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
  username: string;
  role: string;
  avatarUrl: string | null;
}

interface TeamAdmin {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
}

interface Team {
  id: string;
  name: string;
  organisationId: number | null;
  organisationName: string | null;
  members: Member[];
  teamAdmins: TeamAdmin[];
}

interface OrgGroupRow {
  isGroup: true;
  orgId: number | null;
  orgName: string;
  teamCount: number;
}

type TableRow = OrgGroupRow | Team;

const GET_ORGANISATIONS_QUERY = gql`
  query GetOrgsForTeams {
    organisations { id name }
  }
`;

const GET_TEAMS_QUERY = gql`
  query GetTeams($orgId: ID) {
    teams(orgId: $orgId) {
      id
      name
      organisationId
      organisationName
      members {
        id memberNo firstName lastName particles email username role avatarUrl
      }
      teamAdmins {
        id firstName lastName particles
      }
    }
  }
`;

const GET_MEMBERS_QUERY = gql`
  query GetMembers($orgId: ID) {
    members(orgId: $orgId) {
      id firstName lastName particles email
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
    <!-- Sysadmin: org picker first step -->
    <div class="org-picker" *ngIf="isSysadmin && !selectedOrg">
      <div class="org-picker-header">
        <mat-icon>group_work</mat-icon>
        <span>{{ 'teams.selectOrgFirst' | translate }}</span>
      </div>
      <div *ngIf="orgsLoading" class="loading">
        <mat-progress-spinner mode="indeterminate" diameter="32"></mat-progress-spinner>
      </div>
      <div class="org-picker-list" *ngIf="!orgsLoading">
        <button *ngFor="let o of organisations" class="org-pick-btn" (click)="selectOrg(o)">
          <mat-icon>corporate_fare</mat-icon>
          <span>{{ o.name }}</span>
        </button>
      </div>
    </div>

    <div class="teams-view" *ngIf="!isSysadmin || selectedOrg">
      <ng-container *ngIf="!loading; else loadingTpl">
      <div class="view-header">
        <button mat-icon-button *ngIf="isSysadmin" (click)="clearOrg()" [matTooltip]="'common.back' | translate">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <span *ngIf="isSysadmin && selectedOrg" class="selected-org-name">{{ selectedOrg.name }}</span>
        <button mat-icon-button
                (click)="openAddTeam()"
                [matTooltip]="'teams.addTeam' | translate">
          <mat-icon>group_add</mat-icon>
        </button>
        <input class="search-input"
               [(ngModel)]="searchText"
               (ngModelChange)="buildRows()"
               [placeholder]="'teams.searchTeams' | translate">
      </div>

      <div class="table-scroll">
        <mat-table [dataSource]="tableRows" class="teams-table">

          <!-- Org group column (full-width) -->
          <ng-container matColumnDef="group">
            <mat-header-cell *matHeaderCellDef></mat-header-cell>
            <mat-cell *matCellDef="let row">
              <mat-icon class="org-icon">corporate_fare</mat-icon>
              <span class="org-name">{{ row.orgName }}</span>
              <span class="org-count">{{ row.teamCount }}</span>
            </mat-cell>
          </ng-container>

          <!-- Name column -->
          <ng-container matColumnDef="name">
            <mat-header-cell *matHeaderCellDef (click)="toggleSort()" class="sortable-header">
              {{ 'teams.name' | translate }}
              <mat-icon class="sort-icon">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
            </mat-header-cell>
            <mat-cell *matCellDef="let row">
              <mat-icon class="team-icon">group</mat-icon>
              {{ row.name }}
            </mat-cell>
          </ng-container>

          <!-- Admins column -->
          <ng-container matColumnDef="admins">
            <mat-header-cell *matHeaderCellDef>{{ 'teams.teamAdmins' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let row">
              <span *ngIf="row.teamAdmins?.length">{{ formatAdmins(row.teamAdmins) }}</span>
              <span *ngIf="!row.teamAdmins?.length" class="no-value">—</span>
            </mat-cell>
          </ng-container>

          <!-- Organisation column (sysadmin only) -->
          <ng-container matColumnDef="organisation">
            <mat-header-cell *matHeaderCellDef>{{ 'teams.organisation' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let row" class="org-cell">{{ row.organisationName }}</mat-cell>
          </ng-container>

          <!-- Member count column -->
          <ng-container matColumnDef="count">
            <mat-header-cell *matHeaderCellDef>{{ 'teams.members' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let row">{{ row.members?.length }}</mat-cell>
          </ng-container>

          <mat-header-row *matHeaderRowDef="dataColumns; sticky: true"></mat-header-row>

          <!-- Org group rows -->
          <mat-row *matRowDef="let row; columns: ['group']; when: isGroupRow" class="org-group-row"></mat-row>

          <!-- Team data rows -->
          <mat-row *matRowDef="let row; columns: dataColumns; when: isDataRow"
                   (dblclick)="openMembers(asTeam(row))"></mat-row>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" [attr.colspan]="dataColumns.length">
              <div class="empty-state">
                <mat-icon>group_off</mat-icon>
                <span>{{ 'teams.noTeamsFound' | translate }}</span>
              </div>
            </td>
          </tr>
        </mat-table>
      </div>
      </ng-container>
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
    .search-input::placeholder { color: var(--mat-sys-on-surface-variant); }

    .org-filter-select {
      flex-shrink: 0;
      height: 28px;
      font-size: 13px;
      padding: 0 6px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 6px;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
      cursor: pointer;
      max-width: 180px;
    }
    .org-filter-select:focus {
      outline: 2px solid var(--mat-sys-primary);
      border-color: transparent;
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

    /* Org group row */
    .org-group-row {
      background: var(--mat-sys-surface-container-low) !important;
      cursor: default !important;
      min-height: 36px !important;
    }

    .org-group-row:hover .mat-mdc-cell {
      background: var(--mat-sys-surface-container-low) !important;
    }

    .org-group-row .mat-mdc-cell {
      border-top: 1px solid var(--mat-sys-outline-variant);
    }

    /* The group column takes full width */
    .teams-table .mat-column-group {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .org-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      opacity: 0.6;
      color: var(--mat-sys-primary);
      flex-shrink: 0;
    }

    .org-name {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mat-sys-on-surface-variant);
    }

    .org-count {
      font-size: 11px;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container);
      border-radius: 10px;
      padding: 1px 8px;
      margin-left: 4px;
    }

    /* Column widths */
    .teams-table .mat-column-name {
      flex: 2 1 160px;
      min-width: 120px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .teams-table .mat-column-admins {
      flex: 2 1 140px;
      min-width: 100px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13px;
    }

    .teams-table .mat-column-organisation {
      flex: 1 1 130px;
      min-width: 100px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13px;
    }

    .teams-table .mat-column-count {
      flex: 0 0 72px;
      justify-content: flex-end;
      text-align: right;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13px;
    }

    .team-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      opacity: 0.4;
      flex-shrink: 0;
    }

    .no-value {
      color: var(--mat-sys-on-surface-variant);
      opacity: 0.5;
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

    .org-picker {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 24px;
      gap: 16px;
    }

    .org-picker-header {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
    }

    .org-picker-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .org-pick-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: none;
      border-radius: 12px;
      background: transparent;
      color: var(--mat-sys-on-surface);
      font-size: 14px;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s;
      -webkit-tap-highlight-color: transparent;
    }

    .org-pick-btn:hover {
      background: var(--mat-sys-surface-container);
    }

    .org-pick-btn mat-icon {
      color: var(--mat-sys-primary);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .selected-org-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
      flex: 1;
    }
  `]
})
export class ManageTeamsComponent implements OnInit {
  @Input() myTeamsOnly = false;

  teams: Team[] = [];
  tableRows: TableRow[] = [];
  allMembers: Member[] = [];
  organisations: { id: string; name: string }[] = [];
  selectedOrg: { id: string; name: string } | null = null;
  loading = true;
  orgsLoading = false;
  searchText = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  dataColumns: string[] = ['name', 'admins', 'count'];
  isSysadmin = false;

  isGroupRow = (_: number, row: TableRow): boolean => (row as OrgGroupRow).isGroup === true;
  isDataRow  = (_: number, row: TableRow): boolean => (row as OrgGroupRow).isGroup !== true;
  asTeam = (row: TableRow): Team => row as Team;

  constructor(
    private notificationService: NotificationService,
    private panelService: SlideInPanelService,
    private userPreferencesService: UserPreferencesService,
    private authService: AuthService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.isSysadmin = this.authService.isSysadmin;
    if (this.isSysadmin) {
      this.loadOrganisations();
    } else {
      this.loadData();
    }
  }

  async loadOrganisations(): Promise<void> {
    this.orgsLoading = true;
    try {
      const result: any = await apolloClient.query({ query: GET_ORGANISATIONS_QUERY, fetchPolicy: 'network-only' });
      this.organisations = result.data.organisations.slice().sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch {
      this.notificationService.error(this.translate.instant('teams.messages.loadFailed'));
    } finally {
      this.orgsLoading = false;
    }
  }

  selectOrg(org: { id: string; name: string }): void {
    this.selectedOrg = org;
    this.loadData();
  }

  clearOrg(): void {
    this.selectedOrg = null;
    this.teams = [];
    this.tableRows = [];
    this.searchText = '';
  }

  async loadData(): Promise<void> {
    this.loading = true;
    const orgId = this.selectedOrg?.id ?? undefined;
    try {
      const [teamsResult, membersResult]: any[] = await Promise.all([
        apolloClient.query({ query: GET_TEAMS_QUERY, variables: { orgId }, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GET_MEMBERS_QUERY, variables: { orgId }, fetchPolicy: 'network-only' })
      ]);
      this.teams = teamsResult.data.teams;
      this.allMembers = membersResult.data.members;
      this.buildRows();
    } catch {
      this.notificationService.error(this.translate.instant('teams.messages.loadFailed'));
    } finally {
      this.loading = false;
    }
  }

  buildRows(): void {
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
    this.tableRows = [...filtered].sort((a, b) => a.name.localeCompare(b.name) * dir);
  }

  formatAdmins(admins: TeamAdmin[]): string {
    if (!admins?.length) return '';
    return admins.map(a =>
      `${a.firstName}${a.particles ? ' ' + a.particles : ''} ${a.lastName}`
    ).join(', ');
  }

  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.buildRows();
  }

  openMembers(team: Team): void {
    const leftOffset = this.userPreferencesService.getManagementPanelLeftOffset();

    const panelRef = this.panelService.open<TeamMembersPanelComponent, TeamMembersPanelData, boolean>(
      TeamMembersPanelComponent,
      {
        leftOffset,
        data: {
          teamId: team.id,
          teamName: team.name,
          members: team.members,
          allMembers: this.allMembers,
          allTeams: this.teams.map(t => ({ id: t.id, name: t.name }))
        }
      }
    );

    panelRef.afterClosed().subscribe(reloadNeeded => {
      if (reloadNeeded) this.loadData();
    });
  }

  openAddTeam(): void {
    const leftOffset = this.userPreferencesService.getManagementPanelLeftOffset();

    const addRef = this.panelService.open<AddTeamDialogComponent, { orgId?: string }, boolean>(
      AddTeamDialogComponent,
      { leftOffset, data: { orgId: this.selectedOrg?.id } }
    );

    addRef.afterClosed().subscribe(saved => {
      if (saved) this.loadData();
    });
  }
}
