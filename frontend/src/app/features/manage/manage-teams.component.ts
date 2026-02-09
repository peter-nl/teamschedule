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
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { SlideInPanelService } from '../../shared/services/slide-in-panel.service';
import { UserPreferencesService } from '../../shared/services/user-preferences.service';
import { TeamEditDialogComponent, TeamEditDialogData } from '../../shared/components/team-edit-dialog.component';
import { ScheduleSearchPanelComponent, ScheduleSearchPanelData, ScheduleSearchPanelResult } from '../schedule/schedule-filter/schedule-search-panel.component';
import { AddTeamDialogComponent } from '../../shell/add-team-dialog.component';

interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
}

interface Team {
  id: string;
  name: string;
  workers: Worker[];
}

const GET_TEAMS_QUERY = gql`
  query GetTeams {
    teams {
      id
      name
      workers {
        id
        firstName
        lastName
        particles
        email
      }
    }
  }
`;

const GET_WORKERS_QUERY = gql`
  query GetWorkers {
    workers {
      id
      firstName
      lastName
      particles
      email
    }
  }
`;

const ADD_WORKER_TO_TEAM_MUTATION = gql`
  mutation AddWorkerToTeam($teamId: ID!, $workerId: ID!) {
    addWorkerToTeam(teamId: $teamId, workerId: $workerId) {
      id
    }
  }
`;

const REMOVE_WORKER_FROM_TEAM_MUTATION = gql`
  mutation RemoveWorkerFromTeam($teamId: ID!, $workerId: ID!) {
    removeWorkerFromTeam(teamId: $teamId, workerId: $workerId) {
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
    MatSnackBarModule
  ],
  template: `
    <div class="manage-container">
      <div class="header">
        <button mat-icon-button
                (click)="openAddTeam()"
                matTooltip="Add team">
          <mat-icon>group_add</mat-icon>
        </button>
        <button mat-icon-button
                (click)="openSearchPanel()"
                matTooltip="Search teams"
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
                <span mat-sort-header>Name</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'name'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let team" (dblclick)="openEdit(team)" class="name-cell">{{ team.name }}</td>
          </ng-container>

          <ng-container matColumnDef="workerCount">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'workerCount'">
                <span mat-sort-header>Workers</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'workerCount'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let team">{{ team.workers.length }}</td>
          </ng-container>

          <ng-container matColumnDef="workerAssignment">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'workerAssignment'">
                <span>Assign Workers</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'workerAssignment'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let team" (click)="$event.stopPropagation()">
              <mat-form-field appearance="outline" class="workers-select">
                <mat-select [value]="getWorkerIds(team)" multiple
                            (selectionChange)="onWorkerAssignmentChange(team, $event.value)">
                  <mat-option *ngFor="let worker of allWorkers" [value]="worker.id">
                    {{ displayName(worker) }}
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
          <p>No teams found</p>
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

    .workers-select {
      width: 100%;
      min-width: 200px;
      --mdc-outlined-text-field-container-shape: 8px;
    }

    :host ::ng-deep .workers-select .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    :host ::ng-deep .workers-select .mat-mdc-text-field-wrapper {
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
  allWorkers: Worker[] = [];
  loading = true;
  displayedColumns = ['name', 'workerCount', 'workerAssignment'];
  searchText = '';

  private currentSort: Sort = { active: '', direction: '' };
  private saving = false;

  constructor(
    private snackBar: MatSnackBar,
    private panelService: SlideInPanelService,
    private userPreferencesService: UserPreferencesService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  displayName(worker: Worker): string {
    const parts = [worker.firstName];
    if (worker.particles) parts.push(worker.particles);
    parts.push(worker.lastName);
    return parts.join(' ');
  }

  getWorkerIds(team: Team): string[] {
    return team.workers.map(w => w.id);
  }

  async loadData(): Promise<void> {
    this.loading = true;
    try {
      const [teamsResult, workersResult]: any[] = await Promise.all([
        apolloClient.query({ query: GET_TEAMS_QUERY, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GET_WORKERS_QUERY, fetchPolicy: 'network-only' })
      ]);
      this.teams = teamsResult.data.teams;
      this.allWorkers = workersResult.data.workers;
      this.filterTeams();
    } catch (error) {
      console.error('Failed to load data:', error);
      this.snackBar.open('Failed to load teams', 'Close', { duration: 3000 });
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
        case 'workerCount':
          return (a.workers.length - b.workers.length) * dir;
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
            workerIds: team.workers.map(w => w.id)
          },
          allWorkers: this.allWorkers
        }
      }
    );

    editRef.afterClosed().subscribe(saved => {
      if (saved) {
        this.loadData();
      }
    });
  }

  async onWorkerAssignmentChange(team: Team, newWorkerIds: string[]): Promise<void> {
    if (this.saving) return;
    this.saving = true;

    const currentWorkerIds = team.workers.map(w => w.id);

    try {
      for (const workerId of currentWorkerIds) {
        if (!newWorkerIds.includes(workerId)) {
          await apolloClient.mutate({
            mutation: REMOVE_WORKER_FROM_TEAM_MUTATION,
            variables: { teamId: team.id, workerId }
          });
        }
      }

      for (const workerId of newWorkerIds) {
        if (!currentWorkerIds.includes(workerId)) {
          await apolloClient.mutate({
            mutation: ADD_WORKER_TO_TEAM_MUTATION,
            variables: { teamId: team.id, workerId }
          });
        }
      }

      this.snackBar.open('Team updated', 'Close', { duration: 3000 });
      await this.loadData();
    } catch (error: any) {
      console.error('Failed to update team:', error);
      this.snackBar.open(error.message || 'Failed to update team', 'Close', { duration: 5000 });
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
