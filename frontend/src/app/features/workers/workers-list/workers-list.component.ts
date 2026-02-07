import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { WorkersService } from '../services/workers.service';
import { Worker, TeamBasic } from '../../../shared/models/worker.model';
import { SettingsService } from '../../../shared/services/settings.service';
import { ScheduleService } from '../../schedule/services/schedule.service';
import { SlideInPanelService } from '../../../shared/services/slide-in-panel.service';
import { WorkerDetailDialogComponent } from '../../../shared/components/worker-detail-dialog.component';

@Component({
  selector: 'app-workers-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    FormsModule
  ],
  template: `
    <div class="workers-container">
      <div class="header">
        <h1>Workers</h1>
        <div class="filter-fields">
          <mat-form-field class="search-field" appearance="outline">
            <mat-label>Search workers</mat-label>
            <input matInput (keyup)="applyFilter($event)" placeholder="Search by ID, name, or particles" #input>
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-form-field class="team-filter" appearance="outline">
            <mat-label>Filter by Teams</mat-label>
            <mat-select [(ngModel)]="selectedTeamIdsArray" multiple (selectionChange)="onTeamFilterChange()">
              <mat-option value="__no_team__">
                [geen team] ({{ getWorkerCountWithoutTeam() }})
              </mat-option>
              <mat-option *ngFor="let team of teams" [value]="team.id">
                {{ team.name }} ({{ getWorkerCountForTeam(team.id) }})
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
        <p>Loading workers...</p>
      </div>

      <div *ngIf="error && !loading" class="error-container">
        <mat-icon>error_outline</mat-icon>
        <p>{{ error }}</p>
        <button mat-raised-button color="primary" (click)="loadWorkers()">Retry</button>
      </div>

      <div *ngIf="!loading && !error" class="table-container">
        <table mat-table [dataSource]="dataSource" matSort (matSortChange)="onSortChange($event)" class="workers-table">

          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
            <td mat-cell *matCellDef="let worker">{{ worker.id }}</td>
          </ng-container>

          <ng-container matColumnDef="firstName">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>First Name</th>
            <td mat-cell *matCellDef="let worker">{{ worker.firstName }}</td>
          </ng-container>

          <ng-container matColumnDef="particles">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Particles</th>
            <td mat-cell *matCellDef="let worker">{{ worker.particles || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="lastName">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Last Name</th>
            <td mat-cell *matCellDef="let worker">{{ worker.lastName }}</td>
          </ng-container>

          <ng-container matColumnDef="teams">
            <th mat-header-cell *matHeaderCellDef>Teams</th>
            <td mat-cell *matCellDef="let worker">
              <div class="teams-chips">
                <mat-chip *ngFor="let team of worker.teams" class="team-chip">
                  {{ team.name }}
                </mat-chip>
                <span *ngIf="!worker.teams || worker.teams.length === 0" class="no-teams">
                  No teams
                </span>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"
              (dblclick)="onRowDblClick(row)"
              class="clickable-row"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" [attr.colspan]="displayedColumns.length">
              <div class="no-data">
                <mat-icon>info</mat-icon>
                <p *ngIf="input.value">No workers found matching "{{ input.value }}"</p>
                <p *ngIf="!input.value">No workers available. Create your first worker!</p>
              </div>
            </td>
          </tr>
        </table>

        <mat-paginator
          [pageSizeOptions]="[10, 25, 50]"
          [pageSize]="pageSize"
          (page)="onPageChange($event)"
          showFirstLastButtons
          aria-label="Select page of workers">
        </mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .workers-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 24px;
    }

    h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 400;
      color: var(--mat-sys-on-surface);
    }

    .filter-fields {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .search-field {
      flex: 0 1 400px;
      min-width: 200px;
    }

    .team-filter {
      min-width: 250px;
    }

    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      gap: 16px;
    }

    .error-container {
      color: var(--mat-sys-error);
    }

    .error-container mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .table-container {
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--mat-sys-outline-variant);
    }

    .workers-table {
      width: 100%;
    }

    .mat-mdc-header-cell {
      font-weight: 600;
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
    }

    .mat-mdc-cell {
      padding: 16px;
    }

    .clickable-row {
      cursor: pointer;
    }

    .mat-mdc-row:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .teams-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .team-chip {
      font-size: 12px;
      min-height: 24px;
      padding: 4px 12px;
    }

    .no-teams {
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
      font-size: 13px;
    }

    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 24px;
      gap: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .no-data mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.5;
    }

    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        align-items: stretch;
      }

      .search-field {
        flex: 1 1 auto;
      }

      .table-container {
        overflow-x: auto;
      }

      h1 {
        font-size: 24px;
      }
    }
  `]
})
export class WorkersListComponent implements OnInit {
  displayedColumns: string[] = ['id', 'firstName', 'particles', 'lastName', 'teams'];
  dataSource = new MatTableDataSource<Worker>();
  allWorkers: Worker[] = [];
  teams: TeamBasic[] = [];
  selectedTeamIdsArray: string[] = [];
  loading = true;
  error: string | null = null;
  pageSize = 10;

  private sortRef: MatSort | null = null;

  @ViewChild(MatPaginator) set paginator(paginator: MatPaginator) {
    if (paginator) {
      this.dataSource.paginator = paginator;
    }
  }

  @ViewChild(MatSort) set sort(sort: MatSort) {
    if (sort) {
      this.sortRef = sort;
      this.dataSource.sort = sort;
      this.applySavedSort();
    }
  }

  constructor(
    private workersService: WorkersService,
    private scheduleService: ScheduleService,
    private settingsService: SettingsService,
    private panelService: SlideInPanelService
  ) {
    const settings = this.settingsService.getWorkersTableSettings();
    if (settings) {
      this.pageSize = settings.pageSize;
    }

    const filterSettings = this.settingsService.getWorkersFilterSettings();
    if (filterSettings) {
      this.selectedTeamIdsArray = filterSettings.selectedTeamIds;
    }

    // Custom filter for searching across multiple fields including teams
    this.dataSource.filterPredicate = (data: Worker, filter: string) => {
      const searchStr = filter.toLowerCase();
      const teamNames = data.teams?.map(t => t.name.toLowerCase()).join(' ') || '';
      const particles = (data.particles || '').toLowerCase();
      return data.id.toLowerCase().includes(searchStr) ||
             data.firstName.toLowerCase().includes(searchStr) ||
             data.lastName.toLowerCase().includes(searchStr) ||
             particles.includes(searchStr) ||
             teamNames.includes(searchStr);
    };
  }

  ngOnInit() {
    this.loadWorkers();
  }

  private applySavedSort(): void {
    const settings = this.settingsService.getWorkersTableSettings();
    if (settings && settings.sortColumn && this.sortRef) {
      this.sortRef.active = settings.sortColumn;
      this.sortRef.direction = settings.sortDirection;
      this.dataSource.sort = this.sortRef;
    }
  }

  loadWorkers() {
    this.loading = true;
    this.error = null;

    forkJoin({
      workers: this.workersService.getWorkers(),
      teams: this.scheduleService.getTeams()
    }).subscribe({
      next: (result) => {
        this.allWorkers = result.workers;
        this.teams = result.teams;
        this.applyTeamFilter();
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message || 'Failed to load workers';
        this.loading = false;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  onSortChange(sort: Sort): void {
    this.settingsService.setWorkersTableSettings({
      sortColumn: sort.active,
      sortDirection: sort.direction,
      pageSize: this.pageSize
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.settingsService.setWorkersTableSettings({
      sortColumn: this.sortRef?.active || '',
      sortDirection: this.sortRef?.direction || '',
      pageSize: this.pageSize
    });
  }

  onTeamFilterChange(): void {
    this.settingsService.setWorkersFilterSettings({
      selectedTeamIds: this.selectedTeamIdsArray
    });
    this.applyTeamFilter();
  }

  private applyTeamFilter(): void {
    if (this.selectedTeamIdsArray.length === 0) {
      this.dataSource.data = this.allWorkers;
    } else {
      this.dataSource.data = this.allWorkers.filter(worker => {
        const workerTeamIds = new Set(worker.teams?.map(t => t.id) || []);
        return this.selectedTeamIdsArray.every(teamId => {
          if (teamId === '__no_team__') {
            return !worker.teams || worker.teams.length === 0;
          }
          return workerTeamIds.has(teamId);
        });
      });
    }
  }

  getWorkerCountForTeam(teamId: string): number {
    return this.allWorkers.filter(worker =>
      worker.teams?.some(t => t.id === teamId)
    ).length;
  }

  getWorkerCountWithoutTeam(): number {
    return this.allWorkers.filter(worker =>
      !worker.teams || worker.teams.length === 0
    ).length;
  }

  onRowDblClick(worker: Worker): void {
    const panelRef = this.panelService.open(WorkerDetailDialogComponent, {
      width: '480px',
      data: { workerId: worker.id }
    });

    panelRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadWorkers();
      }
    });
  }
}
