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
import { WorkerHolidayService, ExpandedDayEntry, WorkerHolidayPeriod } from '../../../core/services/worker-holiday.service';
import { HolidayTypeService } from '../../../core/services/holiday-type.service';
import { UserPreferencesService } from '../../../shared/services/user-preferences.service';
import { AuthService } from '../../../shared/services/auth.service';
import { SlideInPanelService } from '../../../shared/services/slide-in-panel.service';
import { HolidayDialogComponent, HolidayDialogData, HolidayDialogResult } from '../../../shared/components/holiday-dialog.component';

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
  isFirstOfWeek: boolean;
  weekNumber: number;
  daysInMonth?: number;
  daysInYear?: number;
  daysInWeek?: number;
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
        <mat-form-field appearance="outline" class="team-select">
          <mat-label>Filter by Teams</mat-label>
          <mat-select [(ngModel)]="selectedTeamIdsArray" multiple (selectionChange)="onTeamSelectionChange()">
            <mat-option value="__no_team__">
              [geen team] ({{ getWorkerCountWithoutTeam() }})
            </mat-option>
            <mat-option *ngFor="let team of teams" [value]="team.id">
              {{ team.name }} ({{ getWorkerCountForTeam(team.id) }})
            </mat-option>
          </mat-select>
        </mat-form-field>
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
        <div class="zoom-controls">
          <button mat-icon-button (click)="zoomIn()" [disabled]="cellWidth >= 48" matTooltip="Zoom in">
            <mat-icon>add</mat-icon>
          </button>
          <button mat-icon-button (click)="zoomOut()" [disabled]="cellWidth <= 16" matTooltip="Zoom out">
            <mat-icon>remove</mat-icon>
          </button>
        </div>
        <div class="matrix-grid">
          <!-- Fixed Worker Names Column -->
          <div class="worker-names-column">
            <div class="year-header-cell">{{ visibleYear }}</div>
            <div class="month-header-cell">{{ visibleMonth }}</div>
            <div class="week-header-cell"></div>
            <div class="day-header-cell" [style.height.px]="rowHeight"></div>
            <div *ngFor="let worker of filteredWorkers; let rowIndex = index"
                 class="worker-name-cell"
                 [class.odd-row]="rowIndex % 2 === 1"
                 [class.my-row]="isCurrentUser(worker)"
                 [style.height.px]="rowHeight">
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
                     [style.width.px]="col.daysInYear! * cellWidth">
                  {{ col.year }}
                </div>
              </ng-container>
            </div>

            <!-- Month Header Row -->
            <div class="month-row">
              <ng-container *ngFor="let col of dateColumns">
                <div *ngIf="col.isFirstOfMonth"
                     class="month-cell"
                     [style.width.px]="col.daysInMonth! * cellWidth">
                  {{ col.monthFullName }}
                </div>
              </ng-container>
            </div>

            <!-- Week Header Row -->
            <div class="week-row">
              <ng-container *ngFor="let col of dateColumns">
                <div *ngIf="col.isFirstOfWeek"
                     class="week-cell"
                     [style.width.px]="col.daysInWeek! * cellWidth">
                  {{ col.weekNumber }}
                </div>
              </ng-container>
            </div>

            <!-- Day Header Row -->
            <div class="day-row" [style.height.px]="rowHeight">
              <div *ngFor="let col of dateColumns"
                   class="day-cell"
                   [class.non-working]="col.isNonWorkingDay"
                   [class.holiday]="col.isHoliday"
                   [class.today]="col.isToday"
                   [style.width.px]="cellWidth"
                   [style.background-color]="getCellColor(col)"
                   [matTooltip]="col.holidayName"
                   [matTooltipDisabled]="!col.isHoliday">
                <div class="day-name">{{ col.dayName }}</div>
                <div class="day-number">{{ col.dayNumber }}</div>
              </div>
            </div>

            <!-- Worker Rows -->
            <div *ngFor="let worker of filteredWorkers; let rowIndex = index"
                 class="worker-row">
              <div *ngFor="let col of dateColumns"
                   class="schedule-cell"
                   [class.non-working]="col.isNonWorkingDay"
                   [class.holiday]="col.isHoliday"
                   [class.worker-holiday]="hasWorkerHoliday(worker, col)"
                   [class.today]="col.isToday"
                   [class.odd-row]="rowIndex % 2 === 1"
                   [class.my-row]="isCurrentUser(worker)"
                   [class.editable]="canEditCell(worker)"
                   [style.width.px]="cellWidth"
                   [style.height.px]="rowHeight"
                   [style.background-color]="getWorkerCellBgColor(col, worker)"
                   [style.background-image]="getWorkerCellBgImage(col, worker)"
                   [matTooltip]="getWorkerCellTooltip(col, worker)"
                   [matTooltipDisabled]="!col.isHoliday && !hasWorkerHoliday(worker, col)"
                   (dblclick)="onCellDblClick(worker, col)"
                   (touchstart)="onCellTouchStart($event, worker, col)"
                   (touchend)="onCellTouchEnd()">
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
      position: relative;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      overflow: hidden;
    }

    .zoom-controls {
      position: absolute;
      top: 8px;
      right: 20px;
      z-index: 20;
      display: flex;
      flex-direction: column;
      gap: 2px;
      background: var(--mat-sys-surface-container);
      border-radius: 12px;
      padding: 2px;
      opacity: 0.5;
      transition: opacity 0.15s;
    }

    .zoom-controls:hover {
      opacity: 1;
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

    .week-header-cell {
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 12px;
      font-size: 11px;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-variant);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .day-header-cell {
      border-bottom: 2px solid var(--mat-sys-outline-variant);
    }

    .worker-name-cell {
      padding: 0 12px;
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

    .worker-name-cell.my-row {
      background: var(--mat-sys-primary-container);
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
    .week-row,
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

    .week-row {
      height: 20px;
      top: 60px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .week-cell {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding-left: 4px;
      font-size: 9px;
      color: var(--mat-sys-on-surface-variant);
      border-right: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-variant);
    }

    .day-row {
      top: 80px;
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
      font-size: 10px;
      font-weight: 500;
    }

    .worker-row {
      display: flex;
    }

    .schedule-cell {
      flex-shrink: 0;
      border-right: 1px solid var(--mat-sys-outline-variant);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      background-color: var(--mat-sys-surface);
    }

    .schedule-cell.odd-row {
      background-color: var(--mat-sys-surface-container-low);
    }

    .schedule-cell:hover {
      background-color: var(--mat-sys-surface-container-highest);
    }

    .schedule-cell.non-working {
      background-color: var(--mat-sys-surface-container);
    }

    .schedule-cell.non-working.odd-row {
      background-color: var(--mat-sys-surface-container-high);
    }

    .schedule-cell.today {
      border-left: 2px solid var(--mat-sys-primary);
      border-right: 2px solid var(--mat-sys-primary);
    }

    .worker-name-cell.my-row,
    .schedule-cell.my-row {
      border-top: 2px solid var(--mat-sys-primary);
      border-bottom: 2px solid var(--mat-sys-primary);
    }

    .schedule-cell.editable {
      cursor: pointer;
    }

    .schedule-cell.editable:hover {
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

  // Zoom
  cellWidth = 40;
  private readonly ZOOM_MIN = 16;
  private readonly ZOOM_MAX = 48;
  private readonly ZOOM_STEP = 4;

  get rowHeight(): number {
    return Math.round(this.cellWidth * 1.25);
  }

  // Visible date info for fixed header
  visibleYear = '';
  visibleMonth = '';
  visibleWeek = '';

  // Dynamic colors from settings (light/dark pairs)
  private nonWorkingDayColorLight = '#e0e0e0';
  private nonWorkingDayColorDark = '#3a3a3a';
  private holidayColorLight = '#ffcdd2';
  private holidayColorDark = '#772727';

  // Theme state for holiday type color selection
  private isDark = false;

  private get nonWorkingDayColor(): string {
    return this.isDark ? this.nonWorkingDayColorDark : this.nonWorkingDayColorLight;
  }

  private get holidayColor(): string {
    return this.isDark ? this.holidayColorDark : this.holidayColorLight;
  }

  // Manager editing mode
  private managementModeEnabled = false;

  // Drag-to-scroll state
  isDragging = false;
  private hasDragged = false;
  private startX = 0;
  private scrollLeft = 0;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: () => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: () => void;

  // Long-press state for mobile holiday edit
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private scheduleService: ScheduleService,
    private settingsService: SettingsService,
    private appSettingsService: AppSettingsService,
    private holidayService: HolidayService,
    private workerHolidayService: WorkerHolidayService,
    private holidayTypeService: HolidayTypeService,
    private userPreferencesService: UserPreferencesService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private panelService: SlideInPanelService
  ) {
    const settings = this.settingsService.getScheduleSettings();
    if (settings?.selectedTeamIds) {
      this.selectedTeamIds = new Set(settings.selectedTeamIds);
      this.selectedTeamIdsArray = settings.selectedTeamIds;
    }

    // Subscribe to app settings changes to update non-working days and colors
    this.appSettingsService.settings$.subscribe(settings => {
      this.nonWorkingDayColorLight = settings.nonWorkingDayColorLight;
      this.nonWorkingDayColorDark = settings.nonWorkingDayColorDark;
      this.holidayColorLight = settings.holidayColorLight;
      this.holidayColorDark = settings.holidayColorDark;
      this.updateNonWorkingDays();
    });

    // Track dark/light theme for holiday type colors
    this.userPreferencesService.isDarkTheme$.subscribe(isDark => {
      this.isDark = isDark;
    });

    // Track management mode and react to zoom changes from preferences
    this.userPreferencesService.preferences$.subscribe(prefs => {
      this.managementModeEnabled = prefs.managementMode;
      if (prefs.scheduleZoom >= this.ZOOM_MIN && prefs.scheduleZoom <= this.ZOOM_MAX && prefs.scheduleZoom !== this.cellWidth) {
        this.cellWidth = prefs.scheduleZoom;
      }
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
    this.holidayTypeService.ensureLoaded().subscribe();

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

    // Cancel long-press on any movement
    this.cancelLongPress();

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
    const firstVisibleIndex = Math.floor(scrollLeft / this.cellWidth);

    if (firstVisibleIndex >= 0 && firstVisibleIndex < this.dateColumns.length) {
      const col = this.dateColumns[firstVisibleIndex];
      this.visibleYear = col.year.toString();
      this.visibleMonth = col.monthFullName;
      this.visibleWeek = 'W' + col.weekNumber;
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

      const isoWeek = this.getISOWeekNumber(currentDate);
      // Monday = first of ISO week, or first column in the range
      const isFirstOfWeek = dayOfWeek === 1 || this.dateColumns.length === 0;

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
        isFirstOfWeek,
        weekNumber: isoWeek,
        daysInMonth: 0,
        daysInYear: 0,
        daysInWeek: 0
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

      if (col.isFirstOfWeek) {
        let daysInWeek = 1;
        for (let j = i + 1; j < this.dateColumns.length; j++) {
          if (this.dateColumns[j].weekNumber === col.weekNumber && !this.dateColumns[j].isFirstOfWeek) {
            daysInWeek++;
          } else {
            break;
          }
        }
        col.daysInWeek = daysInWeek;
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

  private getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
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
      // AND logic: worker must match ALL selected filters
      this.filteredWorkers = this.workers.filter(worker => {
        const workerTeamIds = new Set(worker.teams?.map(team => team.id) || []);
        return Array.from(this.selectedTeamIds).every(teamId => {
          if (teamId === '__no_team__') {
            return !worker.teams || worker.teams.length === 0;
          }
          return workerTeamIds.has(teamId);
        });
      });
    }
  }

  getWorkerCountForTeam(teamId: string): number {
    return this.workers.filter(worker =>
      worker.teams?.some(team => team.id === teamId)
    ).length;
  }

  getWorkerCountWithoutTeam(): number {
    return this.workers.filter(worker =>
      !worker.teams || worker.teams.length === 0
    ).length;
  }

  scrollToToday(animate = false): void {
    setTimeout(() => {
      const todayIndex = this.dateColumns.findIndex(col => col.isToday);
      if (todayIndex !== -1 && this.scrollContainer) {
        const scrollPosition = (todayIndex - 7) * this.cellWidth;
        if (animate) {
          this.scrollContainer.nativeElement.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
        } else {
          this.scrollContainer.nativeElement.scrollLeft = Math.max(0, scrollPosition);
        }
      }
      setTimeout(() => this.updateVisibleDateInfo(), animate ? 150 : 0);
    }, 100);
  }

  zoomIn(): void {
    this.applyZoom(Math.min(this.cellWidth + this.ZOOM_STEP, this.ZOOM_MAX));
  }

  zoomOut(): void {
    this.applyZoom(Math.max(this.cellWidth - this.ZOOM_STEP, this.ZOOM_MIN));
  }

  private applyZoom(newWidth: number): void {
    if (newWidth === this.cellWidth || !this.scrollContainer) return;

    const container = this.scrollContainer.nativeElement;
    const centerX = container.clientWidth / 2;
    const dateIndex = (container.scrollLeft + centerX) / this.cellWidth;
    this.cellWidth = newWidth;
    container.scrollLeft = dateIndex * newWidth - centerX;
    this.updateVisibleDateInfo();
    this.saveZoom();
  }

  private saveZoom(): void {
    this.userPreferencesService.setScheduleZoom(this.cellWidth);
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

  isCurrentUser(worker: Worker): boolean {
    return this.authService.currentUser?.id === worker.id;
  }

  hasWorkerHoliday(worker: Worker, col: DateColumn): boolean {
    return this.workerHolidayService.hasHoliday(worker.id, this.formatDateKey(col.date));
  }

  getWorkerCellBgColor(col: DateColumn, worker: Worker): string | null {
    const workerHoliday = this.workerHolidayService.getHoliday(worker.id, this.formatDateKey(col.date));
    if (workerHoliday) {
      // Full day: solid background color
      if (workerHoliday.dayPart === 'full') {
        return this.getHolidayColor(workerHoliday);
      }
      // Half day: no background-color — let CSS default show through the transparent half
      return null;
    }
    if (col.isToday) return null;
    if (col.isHoliday) return this.holidayColor;
    if (col.isNonWorkingDay) return this.nonWorkingDayColor;
    return null;
  }

  getWorkerCellBgImage(col: DateColumn, worker: Worker): string | null {
    const workerHoliday = this.workerHolidayService.getHoliday(worker.id, this.formatDateKey(col.date));
    if (workerHoliday && workerHoliday.dayPart !== 'full') {
      const color = this.getHolidayColor(workerHoliday);
      if (workerHoliday.dayPart === 'morning') {
        // Morning = \ pattern (top-left triangle colored)
        return `linear-gradient(to bottom right, ${color} 50%, transparent 50%)`;
      }
      if (workerHoliday.dayPart === 'afternoon') {
        // Afternoon = \ pattern (bottom-right triangle colored)
        return `linear-gradient(to bottom right, transparent 50%, ${color} 50%)`;
      }
    }
    return null;
  }

  private getHolidayColor(workerHoliday: ExpandedDayEntry): string {
    if (workerHoliday.holidayType) {
      return this.isDark ? workerHoliday.holidayType.colorDark : workerHoliday.holidayType.colorLight;
    }
    const defaultType = this.holidayTypeService.getDefaultType();
    if (defaultType) {
      return this.isDark ? defaultType.colorDark : defaultType.colorLight;
    }
    return '#c8e6c9';
  }

  getWorkerCellTooltip(col: DateColumn, worker: Worker): string {
    const workerHoliday = this.workerHolidayService.getHoliday(worker.id, this.formatDateKey(col.date));
    if (workerHoliday) {
      const typeName = workerHoliday.holidayType?.name || 'Vakantie';
      const partLabel = workerHoliday.dayPart === 'morning' ? ' (morning)'
                      : workerHoliday.dayPart === 'afternoon' ? ' (afternoon)'
                      : '';
      const desc = workerHoliday.description ? `: ${workerHoliday.description}` : '';
      return `${typeName}${partLabel}${desc}`;
    }
    return col.holidayName;
  }

  private get isManagerMode(): boolean {
    return this.authService.isManager && this.managementModeEnabled;
  }

  canEditCell(worker: Worker): boolean {
    return this.isCurrentUser(worker) || this.isManagerMode;
  }

  isEditableCell(worker: Worker, col: DateColumn): boolean {
    if (!this.canEditCell(worker)) return false;
    return this.hasWorkerHoliday(worker, col);
  }

  onCellDblClick(worker: Worker, col: DateColumn): void {
    if (!this.canEditCell(worker)) return;

    if (this.hasWorkerHoliday(worker, col)) {
      const dayEntry = this.workerHolidayService.getHoliday(worker.id, this.formatDateKey(col.date));
      if (!dayEntry) return;

      const period = this.workerHolidayService.getPeriod(dayEntry.periodId);
      if (!period) return;

      this.openEditHolidayDialog(period, worker);
    } else {
      this.openAddHolidayDialog(col.date, worker);
    }
  }

  onCellTouchStart(event: TouchEvent, worker: Worker, col: DateColumn): void {
    if (!this.canEditCell(worker)) return;

    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;

      if (this.hasWorkerHoliday(worker, col)) {
        const dayEntry = this.workerHolidayService.getHoliday(worker.id, this.formatDateKey(col.date));
        if (!dayEntry) return;

        const period = this.workerHolidayService.getPeriod(dayEntry.periodId);
        if (!period) return;

        this.openEditHolidayDialog(period, worker);
      } else {
        this.openAddHolidayDialog(col.date, worker);
      }
    }, 500);
  }

  onCellTouchEnd(): void {
    this.cancelLongPress();
  }

  private cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private getWorkerName(worker: Worker): string {
    return worker.particles
      ? `${worker.firstName} ${worker.particles} ${worker.lastName}`
      : `${worker.firstName} ${worker.lastName}`;
  }

  private openAddHolidayDialog(date: Date, worker: Worker): void {
    const isOther = !this.isCurrentUser(worker);
    const panelRef = this.panelService.open<HolidayDialogComponent, HolidayDialogData, HolidayDialogResult>(
      HolidayDialogComponent,
      {
        width: '480px',
        data: {
          mode: 'add',
          workerId: worker.id,
          initialDate: date,
          workerName: isOther ? this.getWorkerName(worker) : undefined
        }
      }
    );

    panelRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadWorkerHolidays();
      }
    });
  }

  private openEditHolidayDialog(period: WorkerHolidayPeriod, worker: Worker): void {
    const isOther = !this.isCurrentUser(worker);
    const panelRef = this.panelService.open<HolidayDialogComponent, HolidayDialogData, HolidayDialogResult>(
      HolidayDialogComponent,
      {
        width: '480px',
        data: {
          mode: 'edit',
          workerId: worker.id,
          period,
          workerName: isOther ? this.getWorkerName(worker) : undefined
        }
      }
    );

    panelRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadWorkerHolidays();
      }
    });
  }
}
