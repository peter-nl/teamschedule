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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { SlideInPanelService } from '../../shared/services/slide-in-panel.service';
import { UserPreferencesService } from '../../shared/services/user-preferences.service';
import { TeamEditDialogComponent, TeamEditDialogData } from '../../shared/components/team-edit-dialog.component';
import { ScheduleSearchPanelComponent, ScheduleSearchPanelData, ScheduleSearchPanelResult } from '../schedule/schedule-filter/schedule-search-panel.component';
import { AddTeamDialogComponent } from '../../shell/add-team-dialog.component';

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

const ADD_MEMBER_TO_TEAM_MUTATION = gql`
  mutation AddMemberToTeam($teamId: ID!, $memberId: ID!) {
    addMemberToTeam(teamId: $teamId, memberId: $memberId) {
      id
    }
  }
`;

const REMOVE_MEMBER_FROM_TEAM_MUTATION = gql`
  mutation RemoveMemberFromTeam($teamId: ID!, $memberId: ID!) {
    removeMemberFromTeam(teamId: $teamId, memberId: $memberId) {
      id
    }
  }
`;

@Component({
  selector: 'app-manage-teams',
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
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule
  ],
  template: `
    <div class="manage-container">
      <div class="header">
        <button mat-icon-button
                (click)="openAddTeam()"
                [matTooltip]="'teams.addTeam' | translate">
          <mat-icon>group_add</mat-icon>
        </button>
        <button mat-icon-button
                (click)="openSearchPanel()"
                [matTooltip]="'teams.searchTeams' | translate"
                [class.filter-active]="searchText.length > 0"
                [matBadge]="searchText ? '!' : ''"
                [matBadgeHidden]="!searchText"
                matBadgeSize="small"
                matBadgeColor="accent">
          <mat-icon>search</mat-icon>
        </button>
      </div>

      <div *ngIf="loading" class="loading">
        <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
      </div>

      <div class="table-container" *ngIf="!loading">
        <table mat-table [dataSource]="filteredTeams" matSort (matSortChange)="onSortChange($event)" class="teams-table">

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'name'">
                <span mat-sort-header>{{ 'teams.name' | translate }}</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'name'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let team" (dblclick)="openEdit(team)" class="name-cell">{{ team.name }}</td>
          </ng-container>

          <ng-container matColumnDef="memberCount">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'memberCount'">
                <span mat-sort-header>{{ 'teams.members' | translate }}</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'memberCount'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let team">{{ team.members.length }}</td>
          </ng-container>

          <ng-container matColumnDef="memberAssignment">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'memberAssignment'">
                <span>{{ 'teams.assignMembers' | translate }}</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'memberAssignment'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let team" (click)="$event.stopPropagation()">
              <mat-form-field appearance="outline" class="members-select">
                <mat-select [value]="getMemberIds(team)" multiple
                            (selectionChange)="onMemberAssignmentChange(team, $event.value)">
                  <mat-option *ngFor="let member of allMembers" [value]="member.id">
                    {{ displayName(member) }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
          <tr mat-row *matRowDef="let team; columns: displayedColumns;" class="team-row"></tr>
        </table>

        <div *ngIf="filteredTeams.length === 0" class="empty-list">
          <mat-icon>group_off</mat-icon>
          <p>{{ 'teams.noTeamsFound' | translate }}</p>
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

    .teams-table {
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

    .team-row {
      height: 56px;
    }

    .name-cell {
      cursor: pointer;
    }

    .name-cell:hover {
      color: var(--mat-sys-primary);
    }

    .members-select {
      width: 100%;
      min-width: 200px;
      --mdc-outlined-text-field-container-shape: 8px;
    }

    :host ::ng-deep .members-select .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    :host ::ng-deep .members-select .mat-mdc-text-field-wrapper {
      padding-top: 0;
      padding-bottom: 0;
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
export class ManageTeamsComponent implements OnInit {
  teams: Team[] = [];
  filteredTeams: Team[] = [];
  allMembers: Member[] = [];
  loading = true;
  displayedColumns = ['name', 'memberCount', 'memberAssignment'];
  searchText = '';

  private currentSort: Sort = { active: '', direction: '' };
  private saving = false;

  constructor(
    private snackBar: MatSnackBar,
    private panelService: SlideInPanelService,
    private userPreferencesService: UserPreferencesService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  displayName(member: Member): string {
    const parts = [member.firstName];
    if (member.particles) parts.push(member.particles);
    parts.push(member.lastName);
    return parts.join(' ');
  }

  getMemberIds(team: Team): string[] {
    return team.members.map(m => m.id);
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
    } catch (error) {
      console.error('Failed to load data:', error);
      this.snackBar.open(this.translate.instant('teams.messages.loadFailed'), this.translate.instant('common.close'), { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  filterTeams(): void {
    let filtered = this.teams;

    if (this.searchText) {
      const term = this.searchText.toLowerCase();
      filtered = filtered.filter(t => t.name.toLowerCase().includes(term));
    }

    if (this.currentSort.active && this.currentSort.direction) {
      filtered = this.sortData(filtered);
    }

    this.filteredTeams = filtered;
  }

  onSortChange(sort: Sort): void {
    this.currentSort = sort;
    this.filterTeams();
  }

  private sortData(data: Team[]): Team[] {
    const { active, direction } = this.currentSort;
    const dir = direction === 'asc' ? 1 : -1;

    return [...data].sort((a, b) => {
      switch (active) {
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'memberCount':
          return (a.members.length - b.members.length) * dir;
        default:
          return 0;
      }
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

  openSearchPanel(): void {
    const panelRef = this.panelService.open<ScheduleSearchPanelComponent, ScheduleSearchPanelData, ScheduleSearchPanelResult>(
      ScheduleSearchPanelComponent,
      {
        width: '360px',
        data: {
          searchText: this.searchText,
          onSearchChange: (text: string) => {
            this.searchText = text;
            this.filterTeams();
          }
        }
      }
    );
    panelRef.afterClosed().subscribe(result => {
      if (result) {
        this.searchText = result.searchText;
        this.filterTeams();
      }
    });
  }

  openEdit(team: Team): void {
    const isNarrow = window.innerWidth < 768;
    const navExpanded = this.userPreferencesService.preferences.navigationExpanded;
    const railWidth = isNarrow ? 0 : (navExpanded ? 220 : 80);
    const leftOffset = railWidth > 0 ? `${railWidth}px` : undefined;

    const editRef = this.panelService.open<TeamEditDialogComponent, TeamEditDialogData, boolean>(
      TeamEditDialogComponent,
      {
        leftOffset,
        data: {
          team: {
            id: team.id,
            name: team.name,
            memberIds: team.members.map(m => m.id)
          },
          allMembers: this.allMembers
        }
      }
    );

    editRef.afterClosed().subscribe(saved => {
      if (saved) {
        this.loadData();
      }
    });
  }

  async onMemberAssignmentChange(team: Team, newMemberIds: string[]): Promise<void> {
    if (this.saving) return;
    this.saving = true;

    const currentMemberIds = team.members.map(m => m.id);

    try {
      for (const memberId of currentMemberIds) {
        if (!newMemberIds.includes(memberId)) {
          await apolloClient.mutate({
            mutation: REMOVE_MEMBER_FROM_TEAM_MUTATION,
            variables: { teamId: team.id, memberId }
          });
        }
      }

      for (const memberId of newMemberIds) {
        if (!currentMemberIds.includes(memberId)) {
          await apolloClient.mutate({
            mutation: ADD_MEMBER_TO_TEAM_MUTATION,
            variables: { teamId: team.id, memberId }
          });
        }
      }

      this.snackBar.open(this.translate.instant('teams.messages.updated'), this.translate.instant('common.close'), { duration: 3000 });
      await this.loadData();
    } catch (error: any) {
      console.error('Failed to update team:', error);
      this.snackBar.open(error.message || this.translate.instant('teams.messages.updateFailed'), this.translate.instant('common.close'), { duration: 5000 });
    } finally {
      this.saving = false;
    }
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
