import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { SlideInPanelService } from '../../shared/services/slide-in-panel.service';
import { AuthService } from '../../shared/services/auth.service';
import { UserPreferencesService, TeamFilterMode } from '../../shared/services/user-preferences.service';
import { MemberEditDialogComponent, MemberEditDialogData } from '../../shared/components/member-edit-dialog.component';
import { ScheduleFilterPanelComponent, ScheduleFilterPanelData, ScheduleFilterPanelResult } from '../schedule/schedule-filter/schedule-filter-panel.component';
import { ScheduleSearchPanelComponent, ScheduleSearchPanelData, ScheduleSearchPanelResult } from '../schedule/schedule-filter/schedule-search-panel.component';
import { AddMemberDialogComponent } from '../../shell/add-member-dialog.component';

interface Team {
  id: string;
  name: string;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
  role: string;
  teams: Team[];
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
      teams {
        id
        name
      }
    }
  }
`;

const GET_TEAMS_QUERY = gql`
  query GetTeams {
    teams {
      id
      name
    }
  }
`;

@Component({
  selector: 'app-manage-members',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    TranslateModule
  ],
  template: `
    <div class="manage-container">
      <div class="header">
        <button mat-icon-button
                (click)="openAddMember()"
                [matTooltip]="'members.addMember' | translate">
          <mat-icon>person_add</mat-icon>
        </button>
        <button mat-icon-button
                (click)="openSearchPanel()"
                [matTooltip]="'members.searchMembers' | translate"
                [class.filter-active]="searchText.length > 0"
                [matBadge]="searchText ? '!' : ''"
                [matBadgeHidden]="!searchText"
                matBadgeSize="small"
                matBadgeColor="accent">
          <mat-icon>search</mat-icon>
        </button>
        <button mat-icon-button
                (click)="openFilterPanel()"
                [matTooltip]="'members.filterByTeams' | translate"
                [class.filter-active]="selectedTeamIds.size > 0"
                [matBadge]="selectedTeamIds.size > 0 ? '' + selectedTeamIds.size : ''"
                [matBadgeHidden]="selectedTeamIds.size === 0"
                matBadgeSize="small"
                matBadgeColor="primary">
          <mat-icon>filter_list</mat-icon>
        </button>
      </div>

      <div *ngIf="loading" class="loading">
        <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
      </div>

      <div class="table-container" *ngIf="!loading">
        <table mat-table [dataSource]="filteredMembers" matSort (matSortChange)="onSortChange($event)" class="members-table">

          <ng-container matColumnDef="firstName">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'firstName'">
                <span mat-sort-header>{{ 'members.firstName' | translate }}</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'firstName'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let member">{{ member.firstName }}</td>
          </ng-container>

          <ng-container matColumnDef="particles">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'particles'">
                <span mat-sort-header>{{ 'members.particles' | translate }}</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'particles'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let member" [class.muted]="!member.particles">{{ member.particles || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="lastName">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'lastName'">
                <span mat-sort-header>{{ 'members.lastName' | translate }}</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'lastName'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let member">{{ member.lastName }}</td>
          </ng-container>

          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'id'">
                <span mat-sort-header>{{ 'members.id' | translate }}</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'id'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let member">{{ member.id }}</td>
          </ng-container>

          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'email'">
                <span mat-sort-header>{{ 'members.email' | translate }}</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'email'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let member" [class.muted]="!member.email">{{ member.email || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'role'">
                <span mat-sort-header>{{ 'members.role' | translate }}</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'role'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let member">
              <span class="role-badge" [class.manager]="member.role === 'manager'">
                <mat-icon>{{ member.role === 'manager' ? 'admin_panel_settings' : 'person' }}</mat-icon>
                {{ (member.role === 'manager' ? 'common.manager' : 'common.user') | translate }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="teams">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'teams'">
                <span>{{ 'members.teamsColumn' | translate }}</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'teams'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let member">
              <mat-chip-set *ngIf="member.teams.length > 0">
                <mat-chip *ngFor="let team of member.teams" class="team-chip">{{ team.name }}</mat-chip>
              </mat-chip-set>
              <span *ngIf="member.teams.length === 0" class="muted">—</span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
          <tr mat-row *matRowDef="let member; columns: displayedColumns;"
              (dblclick)="openEdit(member)"
              class="member-row"></tr>
        </table>

        <div *ngIf="filteredMembers.length === 0" class="empty-list">
          <mat-icon>person_off</mat-icon>
          <p>{{ 'members.noMembersFound' | translate }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 12px;
      box-sizing: border-box;
    }

    .header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 8px;
    }

    .filter-active {
      color: var(--mat-sys-primary) !important;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .table-container {
      flex: 1;
      overflow: auto;
      border-radius: 12px;
      background: var(--mat-sys-surface-container);
    }

    .members-table {
      width: 100%;
    }

    .header-cell {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .drag-handle {
      font-size: 16px;
      width: 16px;
      height: 16px;
      cursor: grab;
      color: var(--mat-sys-on-surface-variant);
      opacity: 0.5;
      transition: opacity 150ms;
    }

    .drag-handle:hover {
      opacity: 1;
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    .cdk-drag-preview {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      background: var(--mat-sys-surface-container-high);
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      font-weight: 500;
      font-size: 14px;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
    }

    .member-row {
      cursor: pointer;
    }

    .member-row:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .role-badge mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--mat-sys-on-surface-variant);
    }

    .role-badge.manager mat-icon {
      color: var(--mat-sys-primary);
    }

    .team-chip {
      --mdc-chip-container-height: 24px;
      --mdc-chip-label-text-size: 12px;
    }

    .muted {
      color: var(--mat-sys-on-surface-variant);
    }

    .empty-list {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 24px;
      color: var(--mat-sys-on-surface-variant);
    }

    .empty-list mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }
  `]
})
export class ManageMembersComponent implements OnInit {
  members: Member[] = [];
  filteredMembers: Member[] = [];
  allTeams: Team[] = [];
  loading = true;
  displayedColumns = ['firstName', 'particles', 'lastName', 'id', 'email', 'role', 'teams'];

  searchText = '';
  selectedTeamIds = new Set<string>();
  teamFilterMode: TeamFilterMode = 'and';

  private currentSort: Sort = { active: '', direction: '' };

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private panelService: SlideInPanelService,
    private userPreferencesService: UserPreferencesService,
    private translate: TranslateService
  ) {
    this.teamFilterMode = this.userPreferencesService.preferences.teamFilterMode;
  }

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    try {
      const [membersResult, teamsResult]: any[] = await Promise.all([
        apolloClient.query({ query: GET_MEMBERS_QUERY, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GET_TEAMS_QUERY, fetchPolicy: 'network-only' })
      ]);
      this.members = membersResult.data.members;
      this.allTeams = teamsResult.data.teams;
      this.filterMembers();
    } catch (error) {
      console.error('Failed to load data:', error);
      this.snackBar.open(this.translate.instant('members.messages.loadFailed'), this.translate.instant('common.close'), { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  filterMembers(): void {
    let filtered = this.members;

    // Text search
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

    // Team filter
    if (this.selectedTeamIds.size > 0) {
      filtered = filtered.filter(m => {
        if (this.selectedTeamIds.has('__no_team__') && m.teams.length === 0) {
          return true;
        }
        const memberTeamIds = m.teams.map(t => t.id);
        const selectedIds = Array.from(this.selectedTeamIds).filter(id => id !== '__no_team__');
        if (selectedIds.length === 0) {
          return this.selectedTeamIds.has('__no_team__') && m.teams.length === 0;
        }
        if (this.teamFilterMode === 'and') {
          return selectedIds.every(id => memberTeamIds.includes(id));
        } else {
          return selectedIds.some(id => memberTeamIds.includes(id));
        }
      });
    }

    // Sort
    if (this.currentSort.active && this.currentSort.direction) {
      filtered = this.sortData(filtered);
    }

    this.filteredMembers = filtered;
  }

  onSortChange(sort: Sort): void {
    this.currentSort = sort;
    this.filterMembers();
  }

  private sortData(data: Member[]): Member[] {
    const { active, direction } = this.currentSort;
    const dir = direction === 'asc' ? 1 : -1;

    return [...data].sort((a, b) => {
      let valA: string;
      let valB: string;

      switch (active) {
        case 'firstName':
          valA = a.firstName; valB = b.firstName; break;
        case 'particles':
          valA = a.particles || ''; valB = b.particles || ''; break;
        case 'lastName':
          valA = a.lastName; valB = b.lastName; break;
        case 'id':
          valA = a.id; valB = b.id; break;
        case 'email':
          valA = a.email || ''; valB = b.email || ''; break;
        case 'role':
          valA = a.role; valB = b.role; break;
        default:
          return 0;
      }

      return valA.localeCompare(valB) * dir;
    });
  }

  dropColumn(event: CdkDragDrop<string>): void {
    const draggedCol = event.item.data as string;
    const droppedOnCol = event.container.data as string;

    const fromIndex = this.displayedColumns.indexOf(draggedCol);
    const toIndex = this.displayedColumns.indexOf(droppedOnCol);

    if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
      moveItemInArray(this.displayedColumns, fromIndex, toIndex);
    }
  }

  getMemberCountForTeam(teamId: string): number {
    return this.members.filter(m => m.teams.some(t => t.id === teamId)).length;
  }

  getMemberCountWithoutTeam(): number {
    return this.members.filter(m => m.teams.length === 0).length;
  }

  openSearchPanel(): void {
    const panelRef = this.panelService.open<ScheduleSearchPanelComponent, ScheduleSearchPanelData, ScheduleSearchPanelResult>(
      ScheduleSearchPanelComponent,
      {
        width: '360px',
        data: {
          searchText: this.searchText,
          onSearchChange: (text: string) => {
            this.searchText = text;
            this.filterMembers();
          }
        }
      }
    );
    panelRef.afterClosed().subscribe(result => {
      if (result) {
        this.searchText = result.searchText;
        this.filterMembers();
      }
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

  openEdit(member: Member): void {
    const isNarrow = window.innerWidth < 768;
    const navExpanded = this.userPreferencesService.preferences.navigationExpanded;
    const railWidth = isNarrow ? 0 : (navExpanded ? 220 : 80);
    const leftOffset = railWidth > 0 ? `${railWidth}px` : undefined;

    const editRef = this.panelService.open<MemberEditDialogComponent, MemberEditDialogData, boolean>(
      MemberEditDialogComponent,
      {
        leftOffset,
        data: {
          member: { ...member, teams: [...member.teams] },
          allTeams: this.allTeams,
          isSelf: member.id === this.authService.currentUser?.id,
          isManager: this.authService.isManager
        }
      }
    );

    editRef.afterClosed().subscribe(saved => {
      if (saved) {
        this.loadData();
      }
    });
  }

  openAddMember(): void {
    const isNarrow = window.innerWidth < 768;
    const navExpanded = this.userPreferencesService.preferences.navigationExpanded;
    const railWidth = isNarrow ? 0 : (navExpanded ? 220 : 80);
    const leftOffset = railWidth > 0 ? `${railWidth}px` : undefined;

    const addRef = this.panelService.open<AddMemberDialogComponent, void, boolean>(
      AddMemberDialogComponent,
      { leftOffset }
    );

    addRef.afterClosed().subscribe(saved => {
      if (saved) {
        this.loadData();
      }
    });
  }
}
