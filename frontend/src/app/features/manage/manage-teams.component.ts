import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { NotificationService } from '../../shared/services/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { SlideInPanelService } from '../../shared/services/slide-in-panel.service';
import { UserPreferencesService } from '../../shared/services/user-preferences.service';
import { TeamEditDialogComponent, TeamEditDialogData } from '../../shared/components/team-edit-dialog.component';
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

@Component({
  selector: 'app-manage-teams',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatInputModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslateModule
  ],
  template: `
    <div class="teams-layout" *ngIf="!loading; else loadingTpl">

      <!-- LEFT: team list -->
      <div class="list-pane">
        <div class="list-header">
          <button mat-icon-button
                  (click)="openAddTeam()"
                  [matTooltip]="'teams.addTeam' | translate">
            <mat-icon>group_add</mat-icon>
          </button>
          <input class="search-input"
                 [(ngModel)]="searchText"
                 (ngModelChange)="filterTeams()"
                 [placeholder]="'teams.searchTeams' | translate" />
        </div>

        <!-- sort header -->
        <div class="name-cols-header">
          <button class="col-header sort-btn"
                  (click)="toggleTeamSort()">
            <span>{{ 'teams.name' | translate }}</span>
            <mat-icon class="sort-icon">
              {{ teamSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
            </mat-icon>
          </button>
        </div>

        <div class="list-scroll">
          <mat-table [dataSource]="filteredTeams" class="teams-mat-table">

            <ng-container matColumnDef="name">
              <mat-header-cell *matHeaderCellDef (click)="toggleTeamSort()" class="sortable-header">
                {{ 'teams.name' | translate }}
                <mat-icon class="sort-icon">{{ teamSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </mat-header-cell>
              <mat-cell *matCellDef="let team">{{ team.name }}</mat-cell>
            </ng-container>

            <ng-container matColumnDef="count">
              <mat-header-cell *matHeaderCellDef>{{ 'teams.members' | translate }}</mat-header-cell>
              <mat-cell *matCellDef="let team" class="count-cell">{{ team.members.length }}</mat-cell>
            </ng-container>

            <mat-header-row *matHeaderRowDef="teamTableColumns; sticky: true"></mat-header-row>
            <mat-row *matRowDef="let row; columns: teamTableColumns;"
                     [class.selected]="selectedTeam?.id === row.id"
                     (click)="selectTeam(row)">
            </mat-row>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell" colspan="2">
                <div class="list-empty">
                  <mat-icon>group_off</mat-icon>
                  <span>{{ 'teams.noTeamsFound' | translate }}</span>
                </div>
              </td>
            </tr>
          </mat-table>
        </div>
      </div>

      <!-- RIGHT: team detail -->
      <div class="detail-pane">
        <div *ngIf="!selectedTeam" class="detail-empty">
          <mat-icon>groups</mat-icon>
          <p>{{ 'teams.selectPrompt' | translate }}</p>
        </div>

        <div *ngIf="selectedTeam" class="detail-content">

          <!-- detail header -->
          <div class="detail-header">
            <span class="detail-name">{{ selectedTeam.name }}</span>
            <button mat-icon-button
                    (click)="openEdit(selectedTeam)"
                    [matTooltip]="'common.edit' | translate">
              <mat-icon>edit</mat-icon>
            </button>
          </div>

          <mat-divider></mat-divider>

          <!-- team attributes -->
          <div class="attr-section">
            <div class="attr-row">
              <span class="attr-label">{{ 'teams.id' | translate }}</span>
              <span class="attr-value">{{ selectedTeam.id }}</span>
            </div>
            <div class="attr-row">
              <span class="attr-label">{{ 'teams.name' | translate }}</span>
              <span class="attr-value">{{ selectedTeam.name }}</span>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- member list -->
          <div class="members-section">
            <span class="section-label">
              {{ 'teams.members' | translate }} ({{ selectedTeam.members.length }})
            </span>

            <div class="member-scroll">
              <mat-table [dataSource]="sortedMembers()" class="team-members-mat-table" *ngIf="selectedTeam.members.length > 0">

                <ng-container matColumnDef="name">
                  <mat-header-cell *matHeaderCellDef (click)="setMemberSortColumn('lastName')" class="sortable-header">
                    {{ 'members.lastName' | translate }}
                    <mat-icon class="th-icon" *ngIf="memberSortColumn === 'lastName'">
                      {{ memberSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                    </mat-icon>
                  </mat-header-cell>
                  <mat-cell *matCellDef="let m">
                    {{ m.firstName }} {{ m.particles ? m.particles + ' ' : '' }}{{ m.lastName }}
                  </mat-cell>
                </ng-container>

                <mat-header-row *matHeaderRowDef="memberTableColumns; sticky: true"></mat-header-row>
                <mat-row *matRowDef="let row; columns: memberTableColumns;"></mat-row>
              </mat-table>

              <div *ngIf="selectedTeam.members.length === 0" class="member-empty">
                <span>{{ 'teams.noMembersAssigned' | translate }}</span>
              </div>
            </div>
          </div>

        </div>
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
    }

    .teams-layout {
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    /* ── LEFT PANE ── */
    .list-pane {
      flex: 0 0 auto;
      min-width: 150px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container-low);
      overflow: hidden;
    }

    .list-header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 8px 4px 8px;
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      color: var(--mat-sys-on-surface);
      font-size: 14px;
      padding: 4px 4px;
    }

    .search-input::placeholder {
      color: var(--mat-sys-on-surface-variant);
    }

    .name-cols-header {
      display: flex;
      flex-direction: row;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container);
    }

    .col-header {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 6px 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--mat-sys-on-surface-variant);
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
    }

    .col-header.sort-btn {
      cursor: pointer;
    }

    .col-header.sort-active {
      color: var(--mat-sys-primary);
    }

    .col-header span {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .col-particles {
      flex: 0 0 56px !important;
      width: 56px;
    }

    .sort-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      margin-left: 2px;
    }

    .drag-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      margin-left: auto;
      opacity: 0.4;
    }

    .list-scroll {
      flex: 1;
      overflow-y: auto;
    }

    .teams-mat-table {
      width: 100%;
      background: transparent;
    }

    .teams-mat-table .mat-mdc-header-cell {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container);
      padding: 0 8px;
    }

    .teams-mat-table .mat-mdc-cell {
      font-size: 14px;
      padding: 0 8px;
    }

    .teams-mat-table .mat-mdc-row {
      cursor: pointer;
      min-height: 40px;
    }

    .teams-mat-table .mat-mdc-row:hover .mat-mdc-cell {
      background: var(--mat-sys-surface-container);
    }

    .teams-mat-table .mat-mdc-row.selected .mat-mdc-cell {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }

    .count-cell {
      max-width: 56px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      font-size: 12px;
    }

    .list-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 16px;
      color: var(--mat-sys-on-surface-variant);
      gap: 8px;
      font-size: 14px;
    }

    /* ── RIGHT PANE ── */
    .detail-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .detail-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--mat-sys-on-surface-variant);
      gap: 12px;
    }

    .detail-empty mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .detail-header {
      display: flex;
      align-items: center;
      padding: 12px 16px 8px 16px;
      gap: 8px;
    }

    .detail-name {
      flex: 1;
      font-size: 20px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .attr-section {
      padding: 8px 16px;
    }

    .attr-row {
      display: flex;
      align-items: baseline;
      padding: 4px 0;
      font-size: 14px;
    }

    .attr-label {
      width: 80px;
      min-width: 80px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 12px;
    }

    .attr-value {
      color: var(--mat-sys-on-surface);
    }

    .members-section {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
      padding: 8px 0 0 0;
    }

    .section-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--mat-sys-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0 16px 6px 16px;
    }

    .member-scroll {
      flex: 1;
      overflow-y: auto;
      margin: 0 16px 16px 16px;
    }

    .team-members-mat-table {
      width: 100%;
      background: transparent;
    }

    .team-members-mat-table .mat-mdc-header-cell {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container);
      padding: 0 8px;
    }

    .team-members-mat-table .mat-mdc-cell {
      font-size: 14px;
      color: var(--mat-sys-on-surface);
      padding: 0 8px;
    }

    .team-members-mat-table .mat-mdc-row {
      min-height: 38px;
    }

    .sortable-header {
      cursor: pointer;
      user-select: none;
    }

    .th-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
      vertical-align: middle;
      margin-left: 2px;
    }

    .member-empty {
      padding: 16px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 14px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    /* CDK drag */
    .cdk-drag-preview {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      background: var(--mat-sys-surface-container-high);
      border-radius: 6px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      font-size: 12px;
      font-weight: 600;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
    }
  `]
})
export class ManageTeamsComponent implements OnInit {
  teams: Team[] = [];
  filteredTeams: Team[] = [];
  allMembers: Member[] = [];
  loading = true;
  searchText = '';
  selectedTeam: Team | null = null;
  teamSortDirection: 'asc' | 'desc' = 'asc';

  teamTableColumns = ['name', 'count'];
  memberTableColumns = ['name'];
  nameColumns = ['firstName', 'particles', 'lastName'];
  memberSortColumn = 'lastName';
  memberSortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private notificationService: NotificationService,
    private panelService: SlideInPanelService,
    private userPreferencesService: UserPreferencesService,
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
      // Refresh selectedTeam reference after reload
      if (this.selectedTeam) {
        this.selectedTeam = this.teams.find(t => t.id === this.selectedTeam!.id) || null;
      }
      this.filterTeams();
    } catch (error) {
      console.error('Failed to load data:', error);
      this.notificationService.error(this.translate.instant('teams.messages.loadFailed'));
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
    const dir = this.teamSortDirection === 'asc' ? 1 : -1;
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name) * dir);
    this.filteredTeams = filtered;
  }

  toggleTeamSort(): void {
    this.teamSortDirection = this.teamSortDirection === 'asc' ? 'desc' : 'asc';
    this.filterTeams();
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
  }

  sortedMembers(): Member[] {
    if (!this.selectedTeam) return [];
    const dir = this.memberSortDirection === 'asc' ? 1 : -1;
    return [...this.selectedTeam.members].sort((a, b) =>
      this.getNamePart(a, this.memberSortColumn).localeCompare(this.getNamePart(b, this.memberSortColumn)) * dir
    );
  }

  setMemberSortColumn(col: string): void {
    if (this.memberSortColumn === col) {
      this.memberSortDirection = this.memberSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.memberSortColumn = col;
      this.memberSortDirection = 'asc';
    }
  }

  dropNameColumn(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.nameColumns, event.previousIndex, event.currentIndex);
  }

  getNamePart(member: Member, col: string): string {
    switch (col) {
      case 'firstName': return member.firstName || '';
      case 'particles': return member.particles || '';
      case 'lastName': return member.lastName || '';
      default: return '';
    }
  }

  columnLabel(col: string): string {
    switch (col) {
      case 'firstName': return 'members.firstName';
      case 'particles': return 'members.particles';
      case 'lastName': return 'members.lastName';
      default: return col;
    }
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
