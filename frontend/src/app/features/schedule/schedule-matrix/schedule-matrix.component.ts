import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ScheduleService } from '../services/schedule.service';
import { Worker } from '../../../shared/models/worker.model';
import { Team } from '../../../shared/models/team.model';

interface DateColumn {
  date: Date;
  dayName: string;
  dayNumber: number;
  monthName: string;
  monthFullName: string;
  year: number;
  isWeekend: boolean;
  isToday: boolean;
  isFirstOfMonth: boolean;
  isFirstOfYear: boolean;
  daysInMonth?: number;
  daysInYear?: number;
}

@Component({
  selector: 'app-schedule-matrix',
  standalone: true,
  imports: [
    CommonModule,
    MatBadgeModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  template: `
    <div class="schedule-container">
      <!-- Header with Team Filter -->
      <div class="header">
        <h1>Schedule</h1>
        <div class="team-filter">
          <span class="filter-label">Filter by Team:</span>
          <mat-chip-set class="team-chips">
            <mat-chip *ngFor="let team of teams"
                      [highlighted]="isTeamSelected(team.id)"
                      [matBadge]="getWorkerCountForTeam(team.id)"
                      matBadgeSize="large"
                      [matBadgeColor]="isTeamSelected(team.id) ? 'primary' : 'accent'"
                      matBadgeOverlap="false"
                      (click)="toggleTeam(team.id)">
              {{ team.name }}
              <button *ngIf="isTeamSelected(team.id)"
                      matChipRemove
                      (click)="$event.stopPropagation(); toggleTeam(team.id)">
                <mat-icon>close</mat-icon>
              </button>
            </mat-chip>
          </mat-chip-set>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
        <p>Loading schedule...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="error-container">
        <mat-icon>error_outline</mat-icon>
        <p>{{ error }}</p>
      </div>

      <!-- Schedule Matrix -->
      <div *ngIf="!loading && !error" class="matrix-wrapper">
        <div class="matrix-grid">
          <!-- Fixed Worker Names Column -->
          <div class="worker-names-column">
            <div class="year-header-cell"></div>
            <div class="month-header-cell"></div>
            <div class="day-header-cell"></div>
            <div *ngFor="let worker of filteredWorkers" class="worker-name-cell">
              {{ worker.firstName }}
              <span *ngIf="worker.particles"> {{ worker.particles }}</span>
              {{ worker.lastName }}
            </div>
          </div>

          <!-- Scrollable Date Area -->
          <div class="date-scroll-container">
            <!-- Year Header Row -->
            <div class="year-row">
              <ng-container *ngFor="let col of dateColumns">
                <div *ngIf="col.isFirstOfYear"
                     class="year-cell"
                     [class.weekend]="col.isWeekend"
                     [style.width.px]="col.daysInYear! * 40">
                  {{ col.year }}
                </div>
              </ng-container>
            </div>

            <!-- Month Header Row -->
            <div class="month-row">
              <ng-container *ngFor="let col of dateColumns">
                <div *ngIf="col.isFirstOfMonth"
                     class="month-cell"
                     [class.weekend]="col.isWeekend"
                     [style.width.px]="col.daysInMonth! * 40">
                  {{ col.monthFullName }}
                </div>
              </ng-container>
            </div>

            <!-- Day Header Row -->
            <div class="day-row">
              <div *ngFor="let col of dateColumns"
                   class="day-cell"
                   [class.weekend]="col.isWeekend"
                   [class.today]="col.isToday">
                <div class="day-name">{{ col.dayName }}</div>
                <div class="day-number">{{ col.dayNumber }}</div>
              </div>
            </div>

            <!-- Worker Rows -->
            <div *ngFor="let worker of filteredWorkers" class="worker-row">
              <div *ngFor="let col of dateColumns"
                   class="schedule-cell"
                   [class.weekend]="col.isWeekend"
                   [class.today]="col.isToday">
                <!-- Empty for now - will hold schedule data later -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .schedule-container {
      max-width: 100%;
      padding: 24px;
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

    .team-filter {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-label {
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
    }

    .team-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .team-chips mat-chip {
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .team-chips mat-chip:not([highlighted]):hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .team-chips mat-chip[highlighted] {
      --mat-chip-elevated-container-color: var(--mat-sys-secondary-container);
      --mat-chip-label-text-color: var(--mat-sys-on-secondary-container);
      --mat-chip-elevated-selected-container-color: var(--mat-sys-secondary-container);
    }

    .team-chips mat-chip[highlighted] [matChipRemove] {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--mat-sys-error);
      color: var(--mat-sys-on-error);
      margin-left: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .team-chips mat-chip[highlighted] [matChipRemove]:hover {
      background: var(--mat-sys-error);
      opacity: 0.85;
      transform: scale(1.1);
    }

    .team-chips mat-chip[highlighted] [matChipRemove] mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .team-chips mat-chip:not([highlighted]) [matChipRemove] {
      display: none;
    }

    .team-chips mat-chip {
      overflow: visible;
    }

    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 16px;
    }

    .error-container mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--mat-sys-error);
    }

    .matrix-wrapper {
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      overflow: hidden;
    }

    .matrix-grid {
      display: flex;
    }

    .worker-names-column {
      flex-shrink: 0;
      width: 200px;
      border-right: 2px solid var(--mat-sys-outline-variant);
    }

    .year-header-cell,
    .month-header-cell,
    .day-header-cell {
      background: var(--mat-sys-surface-variant);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .year-header-cell {
      height: 30px;
    }

    .month-header-cell {
      height: 30px;
    }

    .day-header-cell {
      height: 50px;
      border-bottom: 2px solid var(--mat-sys-outline-variant);
    }

    .worker-name-cell {
      height: 50px;
      padding: 12px;
      display: flex;
      align-items: center;
      font-size: 14px;
      font-weight: 500;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .date-scroll-container {
      overflow-x: auto;
      overflow-y: hidden;
      position: relative;
      scroll-behavior: smooth;
    }

    .date-scroll-container::-webkit-scrollbar {
      height: 12px;
    }

    .year-row,
    .month-row,
    .day-row {
      display: flex;
      background: var(--mat-sys-surface-variant);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      position: sticky;
      z-index: 10;
    }

    .year-row {
      height: 30px;
      top: 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .month-row {
      height: 30px;
      top: 30px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .day-row {
      height: 50px;
      top: 60px;
      border-bottom: 2px solid var(--mat-sys-outline-variant);
    }

    .year-cell,
    .month-cell {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding-left: 8px;
      font-size: 13px;
      font-weight: 600;
      border-right: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-variant);
    }

    .year-cell:first-child,
    .month-cell:first-child {
      position: sticky;
      left: 0;
      z-index: 11;
    }

    .year-cell.weekend,
    .month-cell.weekend {
      background: rgba(0, 0, 0, 0.05);
    }

    .day-cell {
      flex-shrink: 0;
      width: 40px;
      padding: 4px;
      text-align: center;
      font-size: 11px;
      border-right: 1px solid var(--mat-sys-outline-variant);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .day-cell.weekend {
      background: rgba(0, 0, 0, 0.05);
    }

    .day-cell.today {
      background: var(--mat-sys-primary-container);
      border-left: 2px solid var(--mat-sys-primary);
      border-right: 2px solid var(--mat-sys-primary);
    }

    .day-name {
      font-weight: 600;
      font-size: 10px;
    }

    .day-number {
      font-size: 14px;
      font-weight: 500;
    }

    .worker-row {
      display: flex;
    }

    .schedule-cell {
      flex-shrink: 0;
      width: 40px;
      height: 50px;
      border-right: 1px solid var(--mat-sys-outline-variant);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      cursor: pointer;
    }

    .schedule-cell:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .schedule-cell.weekend {
      background: rgba(0, 0, 0, 0.03);
    }

    .schedule-cell.today {
      border-left: 2px solid var(--mat-sys-primary);
      border-right: 2px solid var(--mat-sys-primary);
    }

    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        align-items: stretch;
      }

      .team-filter {
        flex-direction: column;
        align-items: flex-start;
      }

      h1 {
        font-size: 24px;
      }
    }
  `]
})
export class ScheduleMatrixComponent implements OnInit {
  workers: Worker[] = [];
  filteredWorkers: Worker[] = [];
  teams: Team[] = [];
  dateColumns: DateColumn[] = [];
  selectedTeamIds: Set<string> = new Set();
  loading = true;
  error: string | null = null;

  constructor(private scheduleService: ScheduleService) {}

  ngOnInit(): void {
    this.generateDateColumns();
    this.loadData();
  }

  generateDateColumns(): void {
    const startDate = new Date('2025-01-01');
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    this.dateColumns = [];
    let currentDate = new Date(startDate);

    // First pass: create all date columns
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = this.isSameDay(currentDate, new Date());
      const isFirstOfMonth = currentDate.getDate() === 1;
      const isFirstOfYear = currentDate.getMonth() === 0 && currentDate.getDate() === 1;

      this.dateColumns.push({
        date: new Date(currentDate),
        dayName: this.getDayName(currentDate),
        dayNumber: currentDate.getDate(),
        monthName: this.getMonthName(currentDate),
        monthFullName: this.getMonthFullName(currentDate),
        year: currentDate.getFullYear(),
        isWeekend,
        isToday,
        isFirstOfMonth,
        isFirstOfYear,
        daysInMonth: 0,
        daysInYear: 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Second pass: calculate spans for months and years
    for (let i = 0; i < this.dateColumns.length; i++) {
      const col = this.dateColumns[i];

      if (col.isFirstOfMonth) {
        let daysInMonth = 1;
        for (let j = i + 1; j < this.dateColumns.length; j++) {
          if (this.dateColumns[j].date.getMonth() === col.date.getMonth() &&
              this.dateColumns[j].date.getFullYear() === col.date.getFullYear()) {
            daysInMonth++;
          } else {
            break;
          }
        }
        col.daysInMonth = daysInMonth;
      }

      if (col.isFirstOfYear) {
        let daysInYear = 1;
        for (let j = i + 1; j < this.dateColumns.length; j++) {
          if (this.dateColumns[j].date.getFullYear() === col.date.getFullYear()) {
            daysInYear++;
          } else {
            break;
          }
        }
        col.daysInYear = daysInYear;
      }
    }
  }

  private getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  private getMonthName(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short' });
  }

  private getMonthFullName(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long' });
  }

  private isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  loadData(): void {
    this.loading = true;

    forkJoin({
      workers: this.scheduleService.getWorkersWithTeams(),
      teams: this.scheduleService.getTeams()
    }).subscribe({
      next: (result) => {
        this.workers = result.workers;
        this.teams = result.teams;
        this.filteredWorkers = this.workers;
        this.loading = false;
        this.scrollToToday();
      },
      error: (error) => {
        this.error = error.message || 'Failed to load schedule';
        this.loading = false;
      }
    });
  }

  isTeamSelected(teamId: string): boolean {
    return this.selectedTeamIds.has(teamId);
  }

  toggleTeam(teamId: string): void {
    if (this.selectedTeamIds.has(teamId)) {
      this.selectedTeamIds.delete(teamId);
    } else {
      this.selectedTeamIds.add(teamId);
    }
    this.filterWorkers();
  }

  filterWorkers(): void {
    if (this.selectedTeamIds.size === 0) {
      this.filteredWorkers = this.workers;
    } else {
      // AND logic: worker must belong to ALL selected teams
      this.filteredWorkers = this.workers.filter(worker => {
        const workerTeamIds = new Set(worker.teams?.map(team => team.id) || []);
        return Array.from(this.selectedTeamIds).every(teamId => workerTeamIds.has(teamId));
      });
    }
  }

  getWorkerCountForTeam(teamId: string): number {
    return this.filteredWorkers.filter(worker =>
      worker.teams?.some(team => team.id === teamId)
    ).length;
  }

  scrollToToday(): void {
    setTimeout(() => {
      const todayIndex = this.dateColumns.findIndex(col => col.isToday);
      if (todayIndex !== -1) {
        const scrollContainer = document.querySelector('.date-scroll-container');
        const cellWidth = 40;
        const containerWidth = scrollContainer?.clientWidth || 800;

        const scrollPosition = (todayIndex * cellWidth) - (containerWidth / 2);
        scrollContainer?.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
      }
    }, 100);
  }
}
