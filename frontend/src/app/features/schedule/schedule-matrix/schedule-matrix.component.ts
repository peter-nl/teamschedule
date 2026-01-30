import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin } from 'rxjs';
import { ScheduleService } from '../services/schedule.service';
import { Worker } from '../../../shared/models/worker.model';
import { Team } from '../../../shared/models/team.model';
import { SettingsService } from '../../../shared/services/settings.service';
import { AppSettingsService } from '../../../core/services/app-settings.service';
import { HolidayService } from '../../../core/services/holiday.service';
import { WorkerHolidayService } from '../../../core/services/worker-holiday.service';
import { AuthService } from '../../../shared/services/auth.service';

interface DateColumn {
  date: Date;
  dayName: string;
  dayNumber: number;
  monthName: string;
  monthFullName: string;
  year: number;
  dayOfWeek: number;
  isNonWorkingDay: boolean;
  isHoliday: boolean;
  holidayName: string;
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
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule
  ],
  template: `
    <div class="schedule-container">
      <!-- Header with Team Filter -->
      <div class="header">
        <h1>Schedule</h1>
        <div class="team-filter">
          <mat-form-field appearance="outline" class="team-select">
            <mat-label>Filter by Teams</mat-label>
            <mat-select [(ngModel)]="selectedTeamIdsArray" multiple (selectionChange)="onTeamSelectionChange()">
              <mat-option *ngFor="let team of teams" [value]="team.id">
                {{ team.name }} ({{ getWorkerCountForTeam(team.id) }})
              </mat-option>
            </mat-select>
          </mat-form-field>
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
            <div class="year-header-cell">{{ visibleYear }}</div>
            <div class="month-header-cell">{{ visibleMonth }}</div>
            <div class="day-header-cell"></div>
            <div *ngFor="let worker of filteredWorkers; let rowIndex = index"
                 class="worker-name-cell"
                 [class.odd-row]="rowIndex % 2 === 1">
              {{ worker.firstName }}{{ worker.particles ? ' ' + worker.particles + ' ' : ' ' }}{{ worker.lastName }}
            </div>
          </div>

          <!-- Scrollable Date Area -->
          <div class="date-scroll-container"
               #scrollContainer
               [class.dragging]="isDragging"
               (mousedown)="onMouseDown($event)"
               (touchstart)="onTouchStart($event)"
               (scroll)="onScroll()">
            <!-- Year Header Row -->
            <div class="year-row">
              <ng-container *ngFor="let col of dateColumns">
                <div *ngIf="col.isFirstOfYear"
                     class="year-cell"
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
                     [style.width.px]="col.daysInMonth! * 40">
                  {{ col.monthFullName }}
                </div>
              </ng-container>
            </div>

            <!-- Day Header Row -->
            <div class="day-row">
              <div *ngFor="let col of dateColumns"
                   class="day-cell"
                   [class.non-working]="col.isNonWorkingDay"
                   [class.holiday]="col.isHoliday"
                   [class.today]="col.isToday"
                   [style.background-color]="getCellColor(col)"
                   [matTooltip]="col.holidayName"
                   [matTooltipDisabled]="!col.isHoliday">
                <div class="day-name">{{ col.dayName }}</div>
                <div class="day-number">{{ col.dayNumber }}</div>
              </div>
            </div>

            <!-- Worker Rows -->
            <div *ngFor="let worker of filteredWorkers; let rowIndex = index"
                 class="worker-row"
                 [class.own-row]="isOwnRow(worker)">
              <div *ngFor="let col of dateColumns"
                   class="schedule-cell"
                   [class.non-working]="col.isNonWorkingDay"
                   [class.holiday]="col.isHoliday"
                   [class.worker-holiday]="hasWorkerHoliday(worker, col)"
                   [class.today]="col.isToday"
                   [class.odd-row]="rowIndex % 2 === 1"
                   [style.background-color]="getWorkerCellColor(col, worker)"
                   [matTooltip]="getWorkerCellTooltip(col, worker)"
                   [matTooltipDisabled]="!col.isHoliday && !hasWorkerHoliday(worker, col)"
                   (click)="onCellClick(worker, col)">
              </div>
            </div>
          </div>
        </div>

      </div>

      <button mat-fab class="today-fab" (click)="scrollToToday(true)" matTooltip="Go to today">
        <mat-icon>today</mat-icon>
      </button>
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
    }

    .team-select {
      min-width: 250px;
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
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 12px;
      font-size: 13px;
      font-weight: 600;
    }

    .month-header-cell {
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 12px;
      font-size: 13px;
      font-weight: 600;
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
      background: var(--mat-sys-surface);
    }

    .worker-name-cell.odd-row {
      background: var(--mat-sys-surface-container-low);
    }

    .date-scroll-container {
      overflow-x: auto;
      overflow-y: hidden;
      position: relative;
      cursor: grab;
      user-select: none;
    }

    .date-scroll-container.dragging {
      cursor: grabbing;
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

    .day-cell.non-working {
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface-variant);
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
      background: var(--mat-sys-surface);
    }

    .schedule-cell.odd-row {
      background: var(--mat-sys-surface-container-low);
    }

    .schedule-cell:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .schedule-cell.non-working {
      background: var(--mat-sys-surface-container);
    }

    .schedule-cell.non-working.odd-row {
      background: var(--mat-sys-surface-container-high);
    }

    .schedule-cell.today {
      border-left: 2px solid var(--mat-sys-primary);
      border-right: 2px solid var(--mat-sys-primary);
    }

    .own-row .schedule-cell:hover {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: -2px;
    }

    .today-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
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
export class ScheduleMatrixComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  workers: Worker[] = [];
  filteredWorkers: Worker[] = [];
  teams: Team[] = [];
  dateColumns: DateColumn[] = [];
  selectedTeamIds: Set<string> = new Set();
  selectedTeamIdsArray: string[] = [];
  loading = true;
  error: string | null = null;

  // Visible date info for fixed header
  visibleYear = '';
  visibleMonth = '';

  // Dynamic colors from settings
  nonWorkingDayColor = '#e0e0e0';
  holidayColor = '#ffcdd2';
  workerHolidayColor = '#c8e6c9';

  // Drag-to-scroll state
  isDragging = false;
  private hasDragged = false;
  private startX = 0;
  private scrollLeft = 0;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: () => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: () => void;

  constructor(
    private scheduleService: ScheduleService,
    private settingsService: SettingsService,
    private appSettingsService: AppSettingsService,
    private holidayService: HolidayService,
    private workerHolidayService: WorkerHolidayService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    const settings = this.settingsService.getScheduleSettings();
    if (settings?.selectedTeamIds) {
      this.selectedTeamIds = new Set(settings.selectedTeamIds);
      this.selectedTeamIdsArray = settings.selectedTeamIds;
    }

    // Subscribe to app settings changes to update non-working days and colors
    this.appSettingsService.settings$.subscribe(settings => {
      this.nonWorkingDayColor = settings.nonWorkingDayColor;
      this.holidayColor = settings.holidayColor;
      this.workerHolidayColor = settings.workerHolidayColor;
      this.updateNonWorkingDays();
    });

    // Bind event handlers for drag-to-scroll
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundTouchMove = this.onTouchMove.bind(this);
    this.boundTouchEnd = this.onTouchEnd.bind(this);
  }

  ngOnInit(): void {
    this.generateDateColumns();
    this.loadHolidays();
    this.loadData();

    // Subscribe to holiday data changes
    this.holidayService.holidays$.subscribe(() => {
      this.updateHolidays();
    });

    // Subscribe to worker holiday changes for reactive updates
    this.workerHolidayService.holidays$.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    // Add document-level listeners for mouse/touch end to handle drag ending outside container
    document.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('touchend', this.boundTouchEnd);
  }

  ngOnDestroy(): void {
    // Clean up document-level listeners
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    document.removeEventListener('touchmove', this.boundTouchMove);
    document.removeEventListener('touchend', this.boundTouchEnd);
  }

  // Mouse drag handlers
  onMouseDown(event: MouseEvent): void {
    // Only handle left mouse button
    if (event.button !== 0) return;

    this.isDragging = true;
    this.hasDragged = false;
    this.startX = event.pageX - this.scrollContainer.nativeElement.offsetLeft;
    this.scrollLeft = this.scrollContainer.nativeElement.scrollLeft;

    document.addEventListener('mousemove', this.boundMouseMove);
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    this.hasDragged = true;
    event.preventDefault();
    const x = event.pageX - this.scrollContainer.nativeElement.offsetLeft;
    const walk = (x - this.startX) * 1.5; // Multiply for faster scrolling
    this.scrollContainer.nativeElement.scrollLeft = this.scrollLeft - walk;
  }

  private onMouseUp(): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    document.removeEventListener('mousemove', this.boundMouseMove);
  }

  // Touch drag handlers
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;

    this.isDragging = true;
    this.startX = event.touches[0].pageX - this.scrollContainer.nativeElement.offsetLeft;
    this.scrollLeft = this.scrollContainer.nativeElement.scrollLeft;

    document.addEventListener('touchmove', this.boundTouchMove, { passive: false });
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || event.touches.length !== 1) return;

    event.preventDefault();
    const x = event.touches[0].pageX - this.scrollContainer.nativeElement.offsetLeft;
    const walk = (x - this.startX) * 1.5;
    this.scrollContainer.nativeElement.scrollLeft = this.scrollLeft - walk;
  }

  private onTouchEnd(): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    document.removeEventListener('touchmove', this.boundTouchMove);
  }

  // Scroll handler to update visible year/month
  onScroll(): void {
    this.updateVisibleDateInfo();
  }

  private updateVisibleDateInfo(): void {
    if (!this.scrollContainer || this.dateColumns.length === 0) return;

    const scrollLeft = this.scrollContainer.nativeElement.scrollLeft;
    const cellWidth = 40;
    const firstVisibleIndex = Math.floor(scrollLeft / cellWidth);

    if (firstVisibleIndex >= 0 && firstVisibleIndex < this.dateColumns.length) {
      const col = this.dateColumns[firstVisibleIndex];
      this.visibleYear = col.year.toString();
      this.visibleMonth = col.monthFullName;
    }
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
      const isNonWorkingDay = !this.appSettingsService.isWorkingDay(dayOfWeek);
      const isToday = this.isSameDay(currentDate, new Date());
      const isFirstOfMonth = currentDate.getDate() === 1;
      const isFirstOfYear = currentDate.getMonth() === 0 && currentDate.getDate() === 1;

      const holiday = this.holidayService.getHoliday(currentDate);

      this.dateColumns.push({
        date: new Date(currentDate),
        dayName: this.getDayName(currentDate),
        dayNumber: currentDate.getDate(),
        monthName: this.getMonthName(currentDate),
        monthFullName: this.getMonthFullName(currentDate),
        year: currentDate.getFullYear(),
        dayOfWeek,
        isNonWorkingDay,
        isHoliday: !!holiday,
        holidayName: holiday?.localName || '',
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
        this.filterWorkers();
        this.loading = false;
        this.scrollToToday();
        this.loadWorkerHolidays();
      },
      error: (error) => {
        this.error = error.message || 'Failed to load schedule';
        this.loading = false;
      }
    });
  }

  onTeamSelectionChange(): void {
    this.selectedTeamIds = new Set(this.selectedTeamIdsArray);
    this.filterWorkers();
    this.saveSettings();
  }

  private saveSettings(): void {
    this.settingsService.setScheduleSettings({
      selectedTeamIds: this.selectedTeamIdsArray
    });
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

  scrollToToday(animate = false): void {
    setTimeout(() => {
      const todayIndex = this.dateColumns.findIndex(col => col.isToday);
      if (todayIndex !== -1 && this.scrollContainer) {
        const cellWidth = 40;
        const containerWidth = this.scrollContainer.nativeElement.clientWidth || 800;

        const scrollPosition = (todayIndex * cellWidth) - (containerWidth / 2);
        if (animate) {
          this.scrollContainer.nativeElement.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
        } else {
          this.scrollContainer.nativeElement.scrollLeft = Math.max(0, scrollPosition);
        }
      }
      setTimeout(() => this.updateVisibleDateInfo(), animate ? 150 : 0);
    }, 100);
  }

  private loadHolidays(): void {
    // Determine which years are covered by the date range
    const years = new Set<number>();
    for (const col of this.dateColumns) {
      years.add(col.year);
    }
    this.holidayService.loadHolidaysForYears(Array.from(years)).subscribe();
  }

  private updateNonWorkingDays(): void {
    for (const col of this.dateColumns) {
      col.isNonWorkingDay = !this.appSettingsService.isWorkingDay(col.dayOfWeek);
    }
  }

  private updateHolidays(): void {
    for (const col of this.dateColumns) {
      const holiday = this.holidayService.getHoliday(col.date);
      col.isHoliday = !!holiday;
      col.holidayName = holiday?.localName || '';
    }
  }

  getCellColor(col: DateColumn): string | null {
    if (col.isToday) return null;
    if (col.isHoliday) return this.holidayColor;
    if (col.isNonWorkingDay) return this.nonWorkingDayColor;
    return null;
  }

  private loadWorkerHolidays(): void {
    if (this.dateColumns.length === 0) return;
    const startDate = this.formatDateKey(this.dateColumns[0].date);
    const endDate = this.formatDateKey(this.dateColumns[this.dateColumns.length - 1].date);
    this.workerHolidayService.loadAllHolidays(startDate, endDate).subscribe();
  }

  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isOwnRow(worker: Worker): boolean {
    return this.authService.currentUser?.id === worker.id;
  }

  hasWorkerHoliday(worker: Worker, col: DateColumn): boolean {
    return this.workerHolidayService.hasHoliday(worker.id, this.formatDateKey(col.date));
  }

  getWorkerCellColor(col: DateColumn, worker: Worker): string | null {
    if (col.isToday) return null;
    if (this.hasWorkerHoliday(worker, col)) return this.workerHolidayColor;
    if (col.isHoliday) return this.holidayColor;
    if (col.isNonWorkingDay) return this.nonWorkingDayColor;
    return null;
  }

  getWorkerCellTooltip(col: DateColumn, worker: Worker): string {
    const workerHoliday = this.workerHolidayService.getHoliday(worker.id, this.formatDateKey(col.date));
    if (workerHoliday) {
      return workerHoliday.description || 'Personal holiday';
    }
    return col.holidayName;
  }

  onCellClick(worker: Worker, col: DateColumn): void {
    // Only allow toggling on own row, and only if not dragging
    if (this.hasDragged) return;
    if (!this.isOwnRow(worker)) return;

    const dateStr = this.formatDateKey(col.date);
    this.workerHolidayService.toggleHoliday(worker.id, dateStr).subscribe();
  }
}
