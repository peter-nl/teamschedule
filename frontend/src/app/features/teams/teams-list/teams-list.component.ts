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
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TeamsService } from '../services/teams.service';
import { Team } from '../../../shared/models/team.model';
import { SettingsService } from '../../../shared/services/settings.service';

@Component({
  selector: 'app-teams-list',
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
    MatTooltipModule,
    TranslateModule
  ],
  template: `
    <div class="teams-container">
      <div class="header">
        <h1>{{ 'teamsList.title' | translate }}</h1>
        <mat-form-field class="search-field" appearance="outline">
          <mat-label>{{ 'teamsList.searchLabel' | translate }}</mat-label>
          <input matInput (keyup)="applyFilter($event)" [placeholder]="'teamsList.searchPlaceholder' | translate" #input>
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
        <p>{{ 'teamsList.loading' | translate }}</p>
      </div>

      <div *ngIf="error && !loading" class="error-container">
        <mat-icon>error_outline</mat-icon>
        <p>{{ error }}</p>
        <button mat-icon-button color="primary" (click)="loadTeams()" [matTooltip]="'common.retry' | translate">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <div *ngIf="!loading && !error" class="table-container">
        <table mat-table [dataSource]="dataSource" matSort (matSortChange)="onSortChange($event)" class="teams-table">

          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'teamsList.id' | translate }}</th>
            <td mat-cell *matCellDef="let team">{{ team.id }}</td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'teamsList.name' | translate }}</th>
            <td mat-cell *matCellDef="let team">{{ team.name }}</td>
          </ng-container>

          <ng-container matColumnDef="memberCount">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'teamsList.memberCount' | translate }}</th>
            <td mat-cell *matCellDef="let team">{{ team.memberCount }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>{{ 'teamsList.actions' | translate }}</th>
            <td mat-cell *matCellDef="let team">
              <button mat-icon-button color="primary" [attr.aria-label]="'teamsList.viewTeam' | translate">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button color="accent" [attr.aria-label]="'teamsList.editTeam' | translate">
                <mat-icon>edit</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" [attr.colspan]="displayedColumns.length">
              <div class="no-data">
                <mat-icon>info</mat-icon>
                <p *ngIf="input.value">{{ 'teamsList.noTeamsMatch' | translate:{ search: input.value } }}</p>
                <p *ngIf="!input.value">{{ 'teamsList.noTeams' | translate }}</p>
              </div>
            </td>
          </tr>
        </table>

        <mat-paginator
          [pageSizeOptions]="[10, 25, 50]"
          [pageSize]="pageSize"
          (page)="onPageChange($event)"
          showFirstLastButtons
          aria-label="Select page of teams">
        </mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .teams-container {
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

    .search-field {
      flex: 0 1 400px;
      min-width: 200px;
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

    .teams-table {
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

    .mat-mdc-row:hover {
      background: var(--mat-sys-surface-container-highest);
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
export class TeamsListComponent implements OnInit {
  displayedColumns: string[] = ['id', 'name', 'memberCount', 'actions'];
  dataSource = new MatTableDataSource<Team>();
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
    private teamsService: TeamsService,
    private settingsService: SettingsService,
    private translate: TranslateService
  ) {
    const settings = this.settingsService.getTeamsTableSettings();
    if (settings) {
      this.pageSize = settings.pageSize;
    }
  }

  ngOnInit() {
    this.loadTeams();
  }

  private applySavedSort(): void {
    const settings = this.settingsService.getTeamsTableSettings();
    if (settings && settings.sortColumn && this.sortRef) {
      this.sortRef.active = settings.sortColumn;
      this.sortRef.direction = settings.sortDirection;
      this.dataSource.sort = this.sortRef;
    }
  }

  loadTeams() {
    this.loading = true;
    this.error = null;

    this.teamsService.getTeams().subscribe({
      next: (teams) => {
        this.dataSource.data = teams;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message || this.translate.instant('teamsList.loadFailed');
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
    this.settingsService.setTeamsTableSettings({
      sortColumn: sort.active,
      sortDirection: sort.direction,
      pageSize: this.pageSize
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.settingsService.setTeamsTableSettings({
      sortColumn: this.sortRef?.active || '',
      sortDirection: this.sortRef?.direction || '',
      pageSize: this.pageSize
    });
  }
}
