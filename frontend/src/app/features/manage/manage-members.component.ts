import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { NotificationService } from '../../shared/services/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { SlideInPanelService } from '../../shared/services/slide-in-panel.service';
import { AuthService } from '../../shared/services/auth.service';
import { UserPreferencesService, TeamFilterMode } from '../../shared/services/user-preferences.service';
import { MemberEditDialogComponent, MemberEditDialogData } from '../../shared/components/member-edit-dialog.component';
import { ScheduleFilterPanelComponent, ScheduleFilterPanelData, ScheduleFilterPanelResult } from '../schedule/schedule-filter/schedule-filter-panel.component';
import { AddMemberDialogComponent } from '../../shell/add-member-dialog.component';

interface Team {
  id: string;
  name: string;
}

interface Member {
  id: string;
  memberNo: number;
  username: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
  role: string;
  organisationName: string | null;
  scheduleDisabled: boolean;
  isOrgAdmin: boolean;
  adminOfTeams: { id: string; name: string }[];
  teams: Team[];
  phone: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
}

const GET_MEMBERS_QUERY = gql`
  query GetMembers($orgId: ID) {
    members(orgId: $orgId) {
      id
      memberNo
      username
      firstName
      lastName
      particles
      email
      role
      organisationName
      scheduleDisabled
      isOrgAdmin
      adminOfTeams { id name }
      teams { id name }
      phone
      dateOfBirth
      avatarUrl
    }
  }
`;

const GET_TEAMS_QUERY = gql`
  query GetTeams($orgId: ID) {
    teams(orgId: $orgId) {
      id
      name
    }
  }
`;

const GET_ORG_LIST = gql`
  query GetOrgListForMembers {
    organisations { id name }
  }
`;

@Component({
  selector: 'app-manage-members',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatSortModule,
    TranslateModule,
  ],
  template: `
    <!-- Sysadmin org filter -->
    <div *ngIf="authService.isSysadmin" class="org-picker-bar">
      <mat-icon class="org-picker-icon">admin_panel_settings</mat-icon>
      <select class="org-picker-select" [(ngModel)]="selectedOrgId" (ngModelChange)="onOrgSelected()">
        <option value="">{{ 'sysadmin.allOrgs' | translate }}</option>
        <option *ngFor="let org of orgList" [value]="org.id">{{ org.name }}</option>
      </select>
    </div>

    <ng-container>
      <div class="members-view" *ngIf="!loading; else loadingTpl">

        <div class="view-header">
          <button mat-icon-button
                  (click)="openAddMember()"
                  [matTooltip]="'members.addMember' | translate">
            <mat-icon>person_add</mat-icon>
          </button>
          <input class="search-input"
                 [(ngModel)]="searchText"
                 (ngModelChange)="filterMembers()"
                 [placeholder]="'scheduleSearch.placeholder' | translate">
          <button mat-icon-button
                  (click)="openFilterPanel()"
                  [class.filter-active]="selectedTeamIds.size > 0"
                  [matTooltip]="'members.filterByTeams' | translate">
            <mat-icon>{{ selectedTeamIds.size > 0 ? 'filter_list_off' : 'filter_list' }}</mat-icon>
          </button>
        </div>

        <div class="table-scroll">
          <mat-table [dataSource]="dataSource" matSort class="members-table" [class.sysadmin-table]="authService.isSysadmin">

            <ng-container matColumnDef="avatar">
              <mat-header-cell *matHeaderCellDef class="avatar-col"></mat-header-cell>
              <mat-cell *matCellDef="let m" class="avatar-col">
                <img *ngIf="m.avatarUrl" [src]="m.avatarUrl" class="list-avatar" alt="">
                <mat-icon *ngIf="!m.avatarUrl" class="list-avatar-icon">account_circle</mat-icon>
              </mat-cell>
            </ng-container>

            <ng-container matColumnDef="no">
              <mat-header-cell *matHeaderCellDef mat-sort-header class="no-col">{{ 'members.memberNo' | translate }}</mat-header-cell>
              <mat-cell *matCellDef="let m" class="no-col secondary-cell">#{{ m.memberNo }}</mat-cell>
            </ng-container>

            <ng-container matColumnDef="name">
              <mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'members.name' | translate }}</mat-header-cell>
              <mat-cell *matCellDef="let m">{{ displayName(m) }}</mat-cell>
            </ng-container>

            <ng-container matColumnDef="username">
              <mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'members.username' | translate }}</mat-header-cell>
              <mat-cell *matCellDef="let m" class="secondary-cell">{{ m.username }}</mat-cell>
            </ng-container>

            <ng-container matColumnDef="email">
              <mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'members.email' | translate }}</mat-header-cell>
              <mat-cell *matCellDef="let m" class="secondary-cell">{{ m.email }}</mat-cell>
            </ng-container>

            <ng-container matColumnDef="org">
              <mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'members.organisation' | translate }}</mat-header-cell>
              <mat-cell *matCellDef="let m" class="secondary-cell">{{ m.organisationName }}</mat-cell>
            </ng-container>

            <ng-container matColumnDef="role">
              <mat-header-cell *matHeaderCellDef class="role-col">{{ 'members.role' | translate }}</mat-header-cell>
              <mat-cell *matCellDef="let m" class="role-col">
                <mat-icon *ngIf="m.isOrgAdmin" class="role-icon role-orgadmin" [matTooltip]="'common.role.orgadmin' | translate">shield</mat-icon>
                <mat-icon *ngIf="!m.isOrgAdmin && m.adminOfTeams.length > 0" class="role-icon role-teamadmin" [matTooltip]="'common.role.teamadmin' | translate">manage_accounts</mat-icon>
              </mat-cell>
            </ng-container>

            <mat-header-row *matHeaderRowDef="authService.isSysadmin ? sysadminColumns : tableColumns; sticky: true"></mat-header-row>
            <mat-row *matRowDef="let row; columns: authService.isSysadmin ? sysadminColumns : tableColumns;" (dblclick)="openMemberDetail(row)" class="member-row"></mat-row>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell" [attr.colspan]="(authService.isSysadmin ? sysadminColumns : tableColumns).length">
                <div class="empty-state">
                  <mat-icon>person_off</mat-icon>
                  <span>{{ 'members.noMembersFound' | translate }}</span>
                </div>
              </td>
            </tr>
          </mat-table>
        </div>
      </div>
    </ng-container>

    <ng-template #loadingTpl>
      <div class="loading">
        <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
      </div>
    </ng-template>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
    }

    .org-picker-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--mat-sys-surface-container-low);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      flex-shrink: 0;
    }

    .org-picker-icon {
      color: var(--mat-sys-primary);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .org-picker-select {
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 14px;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      outline: none;
      cursor: pointer;
      flex: 1;
    }

    .members-view {
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

    .filter-active {
      color: var(--mat-sys-primary) !important;
    }

    .table-scroll {
      flex: 1;
      overflow-y: auto;
    }

    .members-table {
      width: 100%;
      background: transparent;
    }

    .members-table .mat-mdc-header-cell {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container);
      padding: 0 8px;
      text-align: left;
      justify-content: flex-start;
    }

    .members-table .mat-mdc-cell {
      font-size: 14px;
      color: var(--mat-sys-on-surface);
      padding: 0 8px;
      text-align: left;
      justify-content: flex-start;
    }

    .members-table .mat-mdc-row {
      min-height: 44px;
    }

    .member-row {
      cursor: pointer;
    }

    .member-row:hover .mat-mdc-cell {
      background: var(--mat-sys-surface-container);
    }

    .avatar-col {
      width: 44px;
      min-width: 44px;
      max-width: 44px;
      padding: 0 4px 0 12px !important;
    }

    .no-col {
      width: 60px;
      min-width: 60px;
      max-width: 60px;
    }

    .role-col {
      width: 56px;
      min-width: 56px;
      max-width: 56px;
      justify-content: flex-start !important;
    }

    .secondary-cell {
      color: var(--mat-sys-on-surface-variant) !important;
      font-size: 13px !important;
    }

    .list-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
    }

    .list-avatar-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--mat-sys-on-surface-variant);
    }

    .role-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .role-orgadmin {
      color: var(--mat-sys-primary);
    }

    .role-teamadmin {
      color: var(--mat-sys-secondary);
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
export class ManageMembersComponent implements OnInit, AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;

  members: Member[] = [];
  allTeams: Team[] = [];
  loading = true;
  dataSource = new MatTableDataSource<Member>([]);
  tableColumns = ['avatar', 'no', 'name', 'username', 'email', 'role'];
  sysadminColumns = ['avatar', 'no', 'name', 'username', 'email', 'org', 'role'];

  orgList: { id: string; name: string }[] = [];
  selectedOrgId = '';
  searchText = '';
  selectedTeamIds = new Set<string>();
  teamFilterMode: TeamFilterMode = 'and';

  constructor(
    public authService: AuthService,
    private notificationService: NotificationService,
    private panelService: SlideInPanelService,
    private userPreferencesService: UserPreferencesService,
    private translate: TranslateService
  ) {
    this.teamFilterMode = this.userPreferencesService.preferences.teamFilterMode;
  }

  async ngOnInit(): Promise<void> {
    if (this.authService.isSysadmin) {
      await this.loadOrgList();
    }
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'name': return item.lastName + ' ' + (item.particles ?? '') + ' ' + item.firstName;
        case 'no':   return item.memberNo;
        default:     return (item as any)[property] ?? '';
      }
    };
  }

  async loadOrgList(): Promise<void> {
    try {
      const result: any = await apolloClient.query({ query: GET_ORG_LIST, fetchPolicy: 'network-only' });
      this.orgList = result.data.organisations;
    } catch (e) {
      console.error('Failed to load org list:', e);
    }
  }

  onOrgSelected(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    const orgId = this.authService.isSysadmin ? this.selectedOrgId || undefined : undefined;
    try {
      const [membersResult, teamsResult]: any[] = await Promise.all([
        apolloClient.query({ query: GET_MEMBERS_QUERY, variables: { orgId }, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GET_TEAMS_QUERY, variables: { orgId }, fetchPolicy: 'network-only' })
      ]);
      this.members = membersResult.data.members;
      this.allTeams = teamsResult.data.teams;
      this.filterMembers();
    } catch (error) {
      this.notificationService.error(this.translate.instant('members.messages.loadFailed'));
    } finally {
      this.loading = false;
    }
  }

  filterMembers(): void {
    let filtered = this.members;

    if (this.searchText) {
      const term = this.searchText.toLowerCase();
      filtered = filtered.filter(m =>
        m.firstName.toLowerCase().includes(term) ||
        m.lastName.toLowerCase().includes(term) ||
        (m.particles || '').toLowerCase().includes(term) ||
        (m.email || '').toLowerCase().includes(term) ||
        (m.username || '').toLowerCase().includes(term)
      );
    }

    if (this.selectedTeamIds.size > 0) {
      filtered = filtered.filter(m => {
        if (this.selectedTeamIds.has('__no_team__') && m.teams.length === 0) return true;
        const memberTeamIds = m.teams.map(t => t.id);
        const selectedIds = Array.from(this.selectedTeamIds).filter(id => id !== '__no_team__');
        if (selectedIds.length === 0) return this.selectedTeamIds.has('__no_team__') && m.teams.length === 0;
        return this.teamFilterMode === 'and'
          ? selectedIds.every(id => memberTeamIds.includes(id))
          : selectedIds.some(id => memberTeamIds.includes(id));
      });
    }

    this.dataSource.data = filtered;
  }

  displayName(member: Member): string {
    return [member.firstName, member.particles, member.lastName].filter(Boolean).join(' ');
  }

  getMemberCountForTeam(teamId: string): number {
    return this.members.filter(m => m.teams.some(t => t.id === teamId)).length;
  }

  getMemberCountWithoutTeam(): number {
    return this.members.filter(m => m.teams.length === 0).length;
  }

  openMemberDetail(member: Member): void {
    const leftOffset = this.userPreferencesService.getManagementPanelLeftOffset();
    const isSelf = this.authService.currentUser?.id === member.id;
    const isManager = this.authService.isAnyAdmin || this.authService.isSysadmin;

    const ref = this.panelService.open<MemberEditDialogComponent, MemberEditDialogData, boolean>(
      MemberEditDialogComponent,
      {
        leftOffset,
        data: {
          leftOffset,
          member: {
            id: member.id,
            username: member.username,
            firstName: member.firstName,
            lastName: member.lastName,
            particles: member.particles,
            email: member.email,
            role: member.role,
            isOrgAdmin: member.isOrgAdmin,
            adminOfTeams: member.adminOfTeams,
            teams: member.teams,
            phone: member.phone,
            dateOfBirth: member.dateOfBirth,
            avatarUrl: member.avatarUrl
          },
          allTeams: this.allTeams,
          isSelf,
          isManager
        }
      }
    );

    ref.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }

  openFilterPanel(): void {
    const panelRef = this.panelService.open<ScheduleFilterPanelComponent, ScheduleFilterPanelData, ScheduleFilterPanelResult>(
      ScheduleFilterPanelComponent,
      {
        width: '360px',
        data: {
          teams: this.allTeams,
          selectedTeamIds: new Set(this.selectedTeamIds),
          teamFilterMode: this.teamFilterMode,
          getMemberCountForTeam: (teamId: string) => this.getMemberCountForTeam(teamId),
          getMemberCountWithoutTeam: () => this.getMemberCountWithoutTeam(),
          onSelectionChange: (ids: string[]) => {
            this.selectedTeamIds = new Set(ids);
            this.filterMembers();
          },
          onFilterModeChange: (mode: TeamFilterMode) => {
            this.teamFilterMode = mode;
            this.userPreferencesService.setTeamFilterMode(mode);
            this.filterMembers();
          }
        }
      }
    );
    panelRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectedTeamIds = new Set(result.selectedTeamIds);
        this.filterMembers();
      }
    });
  }

  openAddMember(): void {
    const orgId = this.authService.isSysadmin ? this.selectedOrgId || undefined : undefined;
    const addRef = this.panelService.open<AddMemberDialogComponent, { orgId?: string } | undefined, boolean>(
      AddMemberDialogComponent, { data: orgId ? { orgId } : undefined }
    );
    addRef.afterClosed().subscribe(saved => {
      if (saved) this.loadData();
    });
  }
}
