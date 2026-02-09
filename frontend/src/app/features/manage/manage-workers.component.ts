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
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { SlideInPanelService } from '../../shared/services/slide-in-panel.service';
import { AuthService } from '../../shared/services/auth.service';
import { UserPreferencesService, TeamFilterMode } from '../../shared/services/user-preferences.service';
import { WorkerEditDialogComponent, WorkerEditDialogData } from '../../shared/components/worker-edit-dialog.component';
import { ScheduleFilterPanelComponent, ScheduleFilterPanelData, ScheduleFilterPanelResult } from '../schedule/schedule-filter/schedule-filter-panel.component';
import { ScheduleSearchPanelComponent, ScheduleSearchPanelData, ScheduleSearchPanelResult } from '../schedule/schedule-filter/schedule-search-panel.component';
import { AddWorkerDialogComponent } from '../../shell/add-worker-dialog.component';

interface Team {
  id: string;
  name: string;
}

interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
  role: string;
  teams: Team[];
}

const GET_WORKERS_QUERY = gql`
  query GetWorkers {
    workers {
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
  selector: 'app-manage-workers',
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
    MatChipsModule
  ],
  template: `
    <div class="manage-container">
      <div class="header">
        <button mat-icon-button
                (click)="openAddWorker()"
                matTooltip="Add worker">
          <mat-icon>person_add</mat-icon>
        </button>
        <button mat-icon-button
                (click)="openSearchPanel()"
                matTooltip="Search workers"
                [class.filter-active]="searchText.length > 0"
                [matBadge]="searchText ? '!' : ''"
                [matBadgeHidden]="!searchText"
                matBadgeSize="small"
                matBadgeColor="accent">
          <mat-icon>search</mat-icon>
        </button>
        <button mat-icon-button
                (click)="openFilterPanel()"
                matTooltip="Filter by teams"
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
        <table mat-table [dataSource]="filteredWorkers" matSort (matSortChange)="onSortChange($event)" class="workers-table">

          <ng-container matColumnDef="firstName">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'firstName'">
                <span mat-sort-header>First Name</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'firstName'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let worker">{{ worker.firstName }}</td>
          </ng-container>

          <ng-container matColumnDef="particles">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'particles'">
                <span mat-sort-header>Particles</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'particles'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let worker" [class.muted]="!worker.particles">{{ worker.particles || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="lastName">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'lastName'">
                <span mat-sort-header>Last Name</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'lastName'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let worker">{{ worker.lastName }}</td>
          </ng-container>

          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'id'">
                <span mat-sort-header>ID</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'id'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let worker">{{ worker.id }}</td>
          </ng-container>

          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'email'">
                <span mat-sort-header>Email</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'email'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let worker" [class.muted]="!worker.email">{{ worker.email || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'role'">
                <span mat-sort-header>Role</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'role'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let worker">
              <span class="role-badge" [class.manager]="worker.role === 'manager'">
                <mat-icon>{{ worker.role === 'manager' ? 'admin_panel_settings' : 'person' }}</mat-icon>
                {{ worker.role === 'manager' ? 'Manager' : 'User' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="teams">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell" cdkDropList cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="dropColumn($event)" [cdkDropListData]="'teams'">
                <span>Teams</span>
                <mat-icon class="drag-handle" cdkDrag [cdkDragData]="'teams'">drag_indicator</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let worker">
              <mat-chip-set *ngIf="worker.teams.length > 0">
                <mat-chip *ngFor="let team of worker.teams" class="team-chip">{{ team.name }}</mat-chip>
              </mat-chip-set>
              <span *ngIf="worker.teams.length === 0" class="muted">—</span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
          <tr mat-row *matRowDef="let worker; columns: displayedColumns;"
              (dblclick)="openEdit(worker)"
              class="worker-row"></tr>
        </table>

        <div *ngIf="filteredWorkers.length === 0" class="empty-list">
          <mat-icon>person_off</mat-icon>
          <p>No workers found</p>
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

    .workers-table {
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

    .worker-row {
      cursor: pointer;
    }

    .worker-row:hover {
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
export class ManageWorkersComponent implements OnInit {
  workers: Worker[] = [];
  filteredWorkers: Worker[] = [];
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
    private userPreferencesService: UserPreferencesService
  ) {
    this.teamFilterMode = this.userPreferencesService.preferences.teamFilterMode;
  }

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    try {
      const [workersResult, teamsResult]: any[] = await Promise.all([
        apolloClient.query({ query: GET_WORKERS_QUERY, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GET_TEAMS_QUERY, fetchPolicy: 'network-only' })
      ]);
      this.workers = workersResult.data.workers;
      this.allTeams = teamsResult.data.teams;
      this.filterWorkers();
    } catch (error) {
      console.error('Failed to load data:', error);
      this.snackBar.open('Failed to load workers', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  filterWorkers(): void {
    let filtered = this.workers;

    // Text search
    if (this.searchText) {
      const term = this.searchText.toLowerCase();
      filtered = filtered.filter(w =>
        w.id.toLowerCase().includes(term) ||
        w.firstName.toLowerCase().includes(term) ||
        w.lastName.toLowerCase().includes(term) ||
        (w.particles || '').toLowerCase().includes(term) ||
        (w.email || '').toLowerCase().includes(term)
      );
    }

    // Team filter
    if (this.selectedTeamIds.size > 0) {
      filtered = filtered.filter(w => {
        if (this.selectedTeamIds.has('__no_team__') && w.teams.length === 0) {
          return true;
        }
        const workerTeamIds = w.teams.map(t => t.id);
        const selectedIds = Array.from(this.selectedTeamIds).filter(id => id !== '__no_team__');
        if (selectedIds.length === 0) {
          return this.selectedTeamIds.has('__no_team__') && w.teams.length === 0;
        }
        if (this.teamFilterMode === 'and') {
          return selectedIds.every(id => workerTeamIds.includes(id));
        } else {
          return selectedIds.some(id => workerTeamIds.includes(id));
        }
      });
    }

    // Sort
    if (this.currentSort.active && this.currentSort.direction) {
      filtered = this.sortData(filtered);
    }

    this.filteredWorkers = filtered;
  }

  onSortChange(sort: Sort): void {
    this.currentSort = sort;
    this.filterWorkers();
  }

  private sortData(data: Worker[]): Worker[] {
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

  getWorkerCountForTeam(teamId: string): number {
    return this.workers.filter(w => w.teams.some(t => t.id === teamId)).length;
  }

  getWorkerCountWithoutTeam(): number {
    return this.workers.filter(w => w.teams.length === 0).length;
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
            this.filterWorkers();
          }
        }
      }
    );
    panelRef.afterClosed().subscribe(result => {
      if (result) {
        this.searchText = result.searchText;
        this.filterWorkers();
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
          getWorkerCountForTeam: (teamId: string) => this.getWorkerCountForTeam(teamId),
          getWorkerCountWithoutTeam: () => this.getWorkerCountWithoutTeam(),
          onSelectionChange: (ids: string[]) => {
            this.selectedTeamIds = new Set(ids);
            this.filterWorkers();
          },
          onFilterModeChange: (mode: TeamFilterMode) => {
            this.teamFilterMode = mode;
            this.userPreferencesService.setTeamFilterMode(mode);
            this.filterWorkers();
          }
        }
      }
    );
    panelRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectedTeamIds = new Set(result.selectedTeamIds);
        this.filterWorkers();
      }
    });
  }

  openEdit(worker: Worker): void {
    const isNarrow = window.innerWidth < 768;
    const navExpanded = this.userPreferencesService.preferences.navigationExpanded;
    const railWidth = isNarrow ? 0 : (navExpanded ? 220 : 80);
    const leftOffset = railWidth > 0 ? `${railWidth}px` : undefined;

    const editRef = this.panelService.open<WorkerEditDialogComponent, WorkerEditDialogData, boolean>(
      WorkerEditDialogComponent,
      {
        leftOffset,
        data: {
          worker: { ...worker, teams: [...worker.teams] },
          allTeams: this.allTeams,
          isSelf: worker.id === this.authService.currentUser?.id,
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

  openAddWorker(): void {
    const isNarrow = window.innerWidth < 768;
    const navExpanded = this.userPreferencesService.preferences.navigationExpanded;
    const railWidth = isNarrow ? 0 : (navExpanded ? 220 : 80);
    const leftOffset = railWidth > 0 ? `${railWidth}px` : undefined;

    const addRef = this.panelService.open<AddWorkerDialogComponent, void, boolean>(
      AddWorkerDialogComponent,
      { leftOffset }
    );

    addRef.afterClosed().subscribe(saved => {
      if (saved) {
        this.loadData();
      }
    });
  }
}
