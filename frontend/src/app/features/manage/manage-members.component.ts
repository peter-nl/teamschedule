import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { NotificationService } from '../../shared/services/notification.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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

const SET_SCHEDULE_DISABLED = gql`
  mutation SetMemberScheduleDisabled($memberId: String!, $disabled: Boolean!) {
    setMemberScheduleDisabled(memberId: $memberId, disabled: $disabled) {
      id
      scheduleDisabled
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
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTableModule,
    TranslateModule,
  ],
  template: `
    <!-- Sysadmin org picker -->
    <div *ngIf="authService.isSysadmin" class="org-picker-bar">
      <mat-icon class="org-picker-icon">admin_panel_settings</mat-icon>
      <select class="org-picker-select" [(ngModel)]="selectedOrgId" (ngModelChange)="onOrgSelected()">
        <option value="">{{ 'sysadmin.selectOrg' | translate }}</option>
        <option *ngFor="let org of orgList" [value]="org.id">{{ org.name }}</option>
      </select>
    </div>

    <!-- No org selected (sysadmin only) -->
    <div *ngIf="authService.isSysadmin && !selectedOrgId" class="no-org-selected">
      <mat-icon>manage_accounts</mat-icon>
      <p>{{ 'sysadmin.selectOrgPrompt' | translate }}</p>
    </div>

    <ng-container *ngIf="!authService.isSysadmin || selectedOrgId">
    <div class="members-layout">

      <!-- List Pane -->
      <div class="list-pane">
        <div class="list-header">
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

        <div class="list-scroll">
          <div *ngIf="loading" class="list-loading">
            <mat-progress-spinner mode="indeterminate" diameter="32"></mat-progress-spinner>
          </div>

          <mat-table *ngIf="!loading" [dataSource]="filteredMembers" class="members-mat-table">

            <!-- Avatar column -->
            <ng-container matColumnDef="avatar">
              <mat-header-cell *matHeaderCellDef></mat-header-cell>
              <mat-cell *matCellDef="let m">
                <img *ngIf="m.avatarUrl" [src]="m.avatarUrl" class="list-avatar" alt="">
                <mat-icon *ngIf="!m.avatarUrl" class="list-avatar-icon">account_circle</mat-icon>
              </mat-cell>
            </ng-container>

            <!-- Name column -->
            <ng-container matColumnDef="name">
              <mat-header-cell *matHeaderCellDef (click)="setSortColumn('lastName')" class="sortable-header">
                {{ 'members.lastName' | translate }}
                <mat-icon class="sort-icon" *ngIf="sortColumn === 'lastName'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </mat-header-cell>
              <mat-cell *matCellDef="let m">{{ displayName(m) }}</mat-cell>
            </ng-container>

            <!-- Username column -->
            <ng-container matColumnDef="username">
              <mat-header-cell *matHeaderCellDef (click)="setSortColumn('username')" class="sortable-header">
                {{ 'members.username' | translate }}
                <mat-icon class="sort-icon" *ngIf="sortColumn === 'username'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </mat-header-cell>
              <mat-cell *matCellDef="let m" class="username-cell">{{ m.username }}</mat-cell>
            </ng-container>

            <!-- Role column -->
            <ng-container matColumnDef="role">
              <mat-header-cell *matHeaderCellDef></mat-header-cell>
              <mat-cell *matCellDef="let m">
                <mat-icon *ngIf="m.isOrgAdmin" class="role-icon role-icon-orgadmin" [matTooltip]="'common.role.orgadmin' | translate">admin_panel_settings</mat-icon>
                <mat-icon *ngIf="!m.isOrgAdmin && m.adminOfTeams.length > 0" class="role-icon role-icon-teamadmin" [matTooltip]="'common.role.teamadmin' | translate">manage_accounts</mat-icon>
              </mat-cell>
            </ng-container>

            <mat-header-row *matHeaderRowDef="memberTableColumns; sticky: true"></mat-header-row>
            <mat-row *matRowDef="let row; columns: memberTableColumns;"
                     [class.selected]="selectedMember?.id === row.id"
                     (click)="selectMember(row)">
            </mat-row>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell" [attr.colspan]="memberTableColumns.length">
                <div class="list-empty">
                  <mat-icon>person_off</mat-icon>
                  <span>{{ 'members.noMembersFound' | translate }}</span>
                </div>
              </td>
            </tr>
          </mat-table>
        </div>
      </div>

      <!-- Detail Pane -->
      <div class="detail-pane">

        <!-- Empty state -->
        <div *ngIf="!selectedMember" class="detail-empty">
          <mat-icon>person</mat-icon>
          <p>{{ 'members.selectPrompt' | translate }}</p>
        </div>

        <!-- Member detail -->
        <div *ngIf="selectedMember" class="detail-content">
          <div class="detail-header">
            <img *ngIf="selectedMember.avatarUrl" [src]="selectedMember.avatarUrl" class="detail-avatar" alt="">
            <div class="detail-name">{{ displayName(selectedMember) }}</div>
            <button mat-icon-button
                    (click)="openEdit(selectedMember)"
                    [matTooltip]="'common.edit' | translate">
              <mat-icon>edit</mat-icon>
            </button>
          </div>

          <mat-divider></mat-divider>

          <!-- Attributes -->
          <div class="attr-section">
            <div class="attr-row">
              <span class="attr-label">{{ 'members.memberNo' | translate }}</span>
              <span class="attr-value attr-mono">#{{ selectedMember.memberNo }}</span>
            </div>
            <div class="attr-row">
              <span class="attr-label">{{ 'members.username' | translate }}</span>
              <span class="attr-value attr-mono">{{ selectedMember.username }}</span>
            </div>
            <div class="attr-row">
              <span class="attr-label">{{ 'members.firstName' | translate }}</span>
              <span class="attr-value">{{ selectedMember.firstName }}</span>
            </div>
            <div class="attr-row">
              <span class="attr-label">{{ 'members.particles' | translate }}</span>
              <span class="attr-value" [class.attr-muted]="!selectedMember.particles">
                {{ selectedMember.particles || '—' }}
              </span>
            </div>
            <div class="attr-row">
              <span class="attr-label">{{ 'members.lastName' | translate }}</span>
              <span class="attr-value">{{ selectedMember.lastName }}</span>
            </div>
            <div class="attr-row">
              <span class="attr-label">{{ 'members.email' | translate }}</span>
              <span class="attr-value" [class.attr-muted]="!selectedMember.email">
                {{ selectedMember.email || '—' }}
              </span>
            </div>
            <div class="attr-row">
              <span class="attr-label">{{ 'members.phone' | translate }}</span>
              <span class="attr-value" [class.attr-muted]="!selectedMember.phone">
                {{ selectedMember.phone || '—' }}
              </span>
            </div>
            <div class="attr-row">
              <span class="attr-label">{{ 'members.dateOfBirth' | translate }}</span>
              <span class="attr-value" [class.attr-muted]="!selectedMember.dateOfBirth">
                {{ selectedMember.dateOfBirth || '—' }}
              </span>
            </div>
            <div class="attr-row">
              <span class="attr-label">{{ 'members.role' | translate }}</span>
              <span class="attr-value role-display">
                <span *ngIf="selectedMember.role === 'sysadmin'" class="role-badge role-sysadmin">
                  <mat-icon>security</mat-icon>{{ 'common.role.sysadmin' | translate }}
                </span>
                <ng-container *ngIf="selectedMember.role !== 'sysadmin'">
                  <span *ngIf="selectedMember.isOrgAdmin" class="role-badge role-orgadmin">
                    <mat-icon>admin_panel_settings</mat-icon>{{ 'common.role.orgadmin' | translate }}
                  </span>
                  <span *ngFor="let t of selectedMember.adminOfTeams" class="role-badge role-teamadmin">
                    <mat-icon>manage_accounts</mat-icon>{{ t.name }}
                  </span>
                  <span *ngIf="!selectedMember.isOrgAdmin && selectedMember.adminOfTeams.length === 0" class="role-badge">
                    <mat-icon>person</mat-icon>{{ 'common.role.user' | translate }}
                  </span>
                </ng-container>
              </span>
            </div>
            <div class="attr-row" *ngIf="canToggleScheduleDisabled(selectedMember)">
              <span class="attr-label">{{ 'members.scheduleDisabled' | translate }}</span>
              <span class="attr-value">
                <mat-slide-toggle
                  [checked]="selectedMember.scheduleDisabled"
                  (change)="toggleScheduleDisabled(selectedMember, $event.checked)">
                </mat-slide-toggle>
              </span>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Teams -->
          <div class="teams-section">
            <div class="section-label">{{ 'members.teamsColumn' | translate }}</div>
            <div *ngIf="selectedMember.teams.length === 0" class="attr-muted teams-empty">—</div>
            <div *ngFor="let team of selectedMember.teams" class="team-item">
              <mat-icon class="team-icon">group_work</mat-icon>
              <span>{{ team.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ng-container>
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

    .no-org-selected {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--mat-sys-on-surface-variant);
      gap: 12px;
    }

    .no-org-selected mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .members-layout {
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    /* ── List Pane ── */
    .list-pane {
      flex: 0 0 auto;
      min-width: 180px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container-low);
    }

    .list-header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 8px 8px 4px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .search-input {
      flex: 1;
      height: 32px;
      padding: 0 8px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 16px;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      min-width: 0;
    }

    .search-input:focus {
      border-color: var(--mat-sys-primary);
    }

    .filter-active {
      color: var(--mat-sys-primary) !important;
    }

    /* ── List table ── */
    .list-scroll {
      flex: 1;
      overflow-y: auto;
    }

    .members-mat-table {
      width: 100%;
      background: transparent;
    }

    .members-mat-table .mat-mdc-header-cell {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container-low);
      padding: 0 8px 0 8px;
    }

    .members-mat-table .mat-mdc-cell {
      font-size: 13px;
      color: var(--mat-sys-on-surface);
      padding: 0 8px 0 8px;
    }

    .members-mat-table .mat-mdc-row {
      cursor: pointer;
      min-height: 40px;
    }

    .members-mat-table .mat-mdc-row:hover .mat-mdc-cell {
      background: var(--mat-sys-surface-container);
    }

    .members-mat-table .mat-mdc-row.selected .mat-mdc-cell {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }

    .sortable-header {
      cursor: pointer;
      user-select: none;
    }

    .sort-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
      vertical-align: middle;
      margin-left: 2px;
    }

    .list-loading {
      display: flex;
      justify-content: center;
      padding: 24px;
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
      opacity: 0.5;
    }

    .username-cell {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .list-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 32px 16px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13px;
    }

    .list-empty mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    /* ── Detail Pane ── */
    .detail-pane {
      flex: 1;
      overflow-y: auto;
      min-width: 0;
    }

    .detail-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .detail-empty mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.4;
    }

    .detail-empty p {
      font-size: 14px;
      margin: 0;
      opacity: 0.7;
    }

    .detail-content {
      display: flex;
      flex-direction: column;
    }

    .detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px 12px 20px;
      gap: 12px;
    }

    .detail-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .detail-name {
      font-size: 18px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
      flex: 1;
    }

    .role-col-header {
      width: 28px;
      padding: 5px 8px 5px 4px;
      cursor: default !important;
    }

    .role-col {
      padding: 4px 8px 4px 4px;
      text-align: center;
    }

    .role-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      display: block;
    }

    .role-icon-orgadmin {
      color: var(--mat-sys-primary);
    }

    .role-icon-teamadmin {
      color: var(--mat-sys-secondary);
    }

    /* ── Attributes ── */
    .attr-section {
      padding: 12px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .attr-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      min-height: 24px;
    }

    .attr-label {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      width: 80px;
      min-width: 80px;
      text-align: right;
    }

    .attr-value {
      font-size: 14px;
      color: var(--mat-sys-on-surface);
      flex: 1;
    }

    .attr-mono {
      font-family: monospace;
      font-size: 13px;
    }

    .attr-muted {
      color: var(--mat-sys-on-surface-variant);
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
    }

    .role-badge mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--mat-sys-on-surface-variant);
    }

    .role-badge.role-orgadmin mat-icon,
    .role-badge.role-sysadmin mat-icon {
      color: var(--mat-sys-primary);
    }

    .role-badge.role-teamadmin mat-icon {
      color: var(--mat-sys-secondary);
    }

    /* ── Teams ── */
    .teams-section {
      padding: 12px 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .section-label {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      margin-bottom: 4px;
    }

    .teams-empty {
      font-size: 14px;
      padding-left: 4px;
    }

    .team-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--mat-sys-on-surface);
      padding: 4px 0;
    }

    .team-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--mat-sys-on-surface-variant);
    }
  `]
})
export class ManageMembersComponent implements OnInit {
  members: Member[] = [];
  filteredMembers: Member[] = [];
  allTeams: Team[] = [];
  loading = true;
  selectedMember: Member | null = null;

  // Sysadmin org picker
  orgList: { id: string; name: string }[] = [];
  selectedOrgId: string = '';

  searchText = '';
  selectedTeamIds = new Set<string>();
  teamFilterMode: TeamFilterMode = 'and';

  nameColumns = ['firstName', 'particles', 'lastName'];
  memberTableColumns = ['avatar', 'name', 'username', 'role'];
  sortColumn = 'lastName';
  sortDirection: 'asc' | 'desc' = 'asc';

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
    } else {
      this.loadData();
    }
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
    if (this.selectedOrgId) {
      this.loadData();
    }
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
      // Re-sync selected member if present
      if (this.selectedMember) {
        this.selectedMember = this.members.find(m => m.id === this.selectedMember!.id) ?? null;
      }
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
        m.id.toLowerCase().includes(term) ||
        m.firstName.toLowerCase().includes(term) ||
        m.lastName.toLowerCase().includes(term) ||
        (m.particles || '').toLowerCase().includes(term) ||
        (m.email || '').toLowerCase().includes(term)
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

    const dir = this.sortDirection === 'asc' ? 1 : -1;
    filtered = [...filtered].sort((a, b) =>
      this.getNamePart(a, this.sortColumn).localeCompare(this.getNamePart(b, this.sortColumn)) * dir
    );

    this.filteredMembers = filtered;
  }

  setSortColumn(col: string): void {
    if (this.sortColumn === col) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = col;
      this.sortDirection = 'asc';
    }
    this.filterMembers();
  }

  dropNameColumn(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.nameColumns, event.previousIndex, event.currentIndex);
  }

  getNamePart(member: Member, col: string): string {
    if (col === 'firstName') return member.firstName;
    if (col === 'particles') return member.particles || '';
    if (col === 'lastName') return member.lastName;
    if (col === 'username') return member.username || '';
    return '';
  }

  columnLabel(col: string): string {
    if (col === 'firstName') return this.translate.instant('schedule.columns.first');
    if (col === 'particles') return this.translate.instant('schedule.columns.particles');
    if (col === 'lastName') return this.translate.instant('schedule.columns.last');
    return col;
  }

  selectMember(member: Member): void {
    this.selectedMember = member;
  }

  displayName(member: Member): string {
    return [member.firstName, member.particles, member.lastName].filter(Boolean).join(' ');
  }

  canToggleScheduleDisabled(member: Member): boolean {
    if (this.authService.isOrgAdmin) return true;
    if (this.authService.teamAdminIds.length > 0) {
      return member.teams.some(t => this.authService.teamAdminIds.includes(Number(t.id)));
    }
    return false;
  }

  async toggleScheduleDisabled(member: Member, disabled: boolean): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: SET_SCHEDULE_DISABLED,
        variables: { memberId: member.id, disabled }
      });
      member.scheduleDisabled = disabled;
      if (this.selectedMember?.id === member.id) {
        this.selectedMember = { ...this.selectedMember, scheduleDisabled: disabled };
      }
    } catch (e) {
      this.notificationService.error(this.translate.instant('common.error'));
    }
  }

  getMemberCountForTeam(teamId: string): number {
    return this.members.filter(m => m.teams.some(t => t.id === teamId)).length;
  }

  getMemberCountWithoutTeam(): number {
    return this.members.filter(m => m.teams.length === 0).length;
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

  openEdit(member: Member): void {
    const editRef = this.panelService.open<MemberEditDialogComponent, MemberEditDialogData, boolean>(
      MemberEditDialogComponent,
      {
        data: {
          member: { ...member, teams: [...member.teams], phone: member.phone, dateOfBirth: member.dateOfBirth, avatarUrl: member.avatarUrl },
          allTeams: this.allTeams,
          isSelf: member.id === this.authService.currentUser?.id,
          isManager: this.authService.isOrgAdmin
        }
      }
    );
    editRef.afterClosed().subscribe(saved => {
      if (saved) this.loadData();
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
