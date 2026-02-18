import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { ScheduleService } from '../services/schedule.service';
import { Member } from '../../../shared/models/member.model';
import { Team } from '../../../shared/models/team.model';
import { SettingsService } from '../../../shared/services/settings.service';
import { AppSettingsService } from '../../../core/services/app-settings.service';
import { HolidayService } from '../../../core/services/holiday.service';
import { MemberHolidayService, ExpandedDayEntry, MemberHolidayPeriod } from '../../../core/services/member-holiday.service';
import { HolidayTypeService } from '../../../core/services/holiday-type.service';
import { UserPreferencesService, NameColumnField, TeamFilterMode } from '../../../shared/services/user-preferences.service';
import { AuthService } from '../../../shared/services/auth.service';
import { SlideInPanelService } from '../../../shared/services/slide-in-panel.service';
import { HolidayDialogComponent, HolidayDialogData, HolidayDialogResult } from '../../../shared/components/holiday-dialog.component';
import { MemberDetailDialogComponent } from '../../../shared/components/member-detail-dialog.component';
import { ScheduleFilterPanelComponent, ScheduleFilterPanelData, ScheduleFilterPanelResult } from '../schedule-filter/schedule-filter-panel.component';
import { ScheduleSearchPanelComponent, ScheduleSearchPanelData, ScheduleSearchPanelResult } from '../schedule-filter/schedule-search-panel.component';

interface DateColumn {
  date: Date;
  dateKey: string; // Pre-computed 'YYYY-MM-DD' for O(1) lookups
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

interface CellRenderData {
  bgColor: string | null;
  bgImage: string | null;
  tooltip: string;
  hasHoliday: boolean;
}

@Component({
  selector: 'app-schedule-matrix',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatBadgeModule,
    DragDropModule,
    TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="schedule-container">
      <!-- Search & Filter Buttons -->
      <div class="header">
        <button mat-icon-button
                (click)="openSearchPanel()"
                [matTooltip]="'schedule.searchMembers' | translate"
                [class.filter-active]="searchText.length > 0"
                [matBadge]="searchText ? '!' : ''"
                [matBadgeHidden]="!searchText"
                matBadgeSize="small"
                matBadgeColor="accent">
          <mat-icon>search</mat-icon>
        </button>
        <button mat-icon-button
                (click)="openFilterPanel()"
                [matTooltip]="'schedule.filterByTeams' | translate"
                [class.filter-active]="selectedTeamIds.size > 0"
                [matBadge]="selectedTeamIds.size > 0 ? '' + selectedTeamIds.size : ''"
                [matBadgeHidden]="selectedTeamIds.size === 0"
                matBadgeSize="small"
                matBadgeColor="primary">
          <mat-icon>filter_list</mat-icon>
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
        <p>{{ 'schedule.loading' | translate }}</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="error-container">
        <mat-icon>error_outline</mat-icon>
        <p>{{ error }}</p>
      </div>

      <!-- Schedule Matrix -->
      <div *ngIf="!loading && !error" class="matrix-wrapper">
        <div class="floating-controls top-right">
          <div class="control-group">
            <button mat-icon-button (click)="zoomIn()" [disabled]="cellWidth >= 48" [matTooltip]="'schedule.zoomIn' | translate">
              <mat-icon>add</mat-icon>
            </button>
            <button mat-icon-button (click)="zoomOut()" [disabled]="cellWidth <= 16" [matTooltip]="'schedule.zoomOut' | translate">
              <mat-icon>remove</mat-icon>
            </button>
          </div>
        </div>
        <div class="floating-controls bottom-right">
          <div class="control-group">
            <button mat-icon-button (click)="scrollToMyRow()" *ngIf="currentUserId" [matTooltip]="'schedule.goToMyRow' | translate">
              <mat-icon>person_pin</mat-icon>
            </button>
            <button mat-icon-button (click)="scrollToToday(true)" [matTooltip]="'schedule.goToToday' | translate">
              <mat-icon>today</mat-icon>
            </button>
          </div>
        </div>
        <div class="matrix-grid">
          <!-- Fixed Header Section -->
          <div class="matrix-header">
            <div class="member-names-column" [style.width.px]="nameColumnWidth">
              <div class="year-header-cell">{{ visibleYear }}</div>
              <div class="month-header-cell">{{ visibleMonth }}</div>
              <div class="week-header-cell"></div>
              <div class="day-header-cell name-columns-header"
                   [style.height.px]="rowHeight"
                   cdkDropList
                   cdkDropListOrientation="horizontal"
                   (cdkDropListDropped)="onColumnDrop($event)">
                <div *ngFor="let col of nameColumnOrder"
                     cdkDrag
                     class="name-col-header"
                     [class.sort-active]="sortColumn === col"
                     [class.particles-col]="col === 'particles'"
                     (click)="onSortClick(col)">
                  <span>{{ getColumnLabel(col) }}</span>
                  <mat-icon *ngIf="sortColumn === col" class="sort-icon">
                    {{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                  </mat-icon>
                  <span class="header-spacer"></span>
                  <mat-icon class="drag-handle">drag_indicator</mat-icon>
                </div>
              </div>
            </div>
            <div class="date-header-scroll"
                 #headerScrollContainer>
              <!-- Year Header Row -->
              <div class="year-row">
                <ng-container *ngFor="let col of dateColumns; trackBy: trackByDateKey">
                  <div *ngIf="col.isFirstOfYear"
                       class="year-cell"
                       [style.width.px]="col.daysInYear! * cellWidth">
                    {{ col.year }}
                  </div>
                </ng-container>
              </div>

              <!-- Month Header Row -->
              <div class="month-row">
                <ng-container *ngFor="let col of dateColumns; trackBy: trackByDateKey">
                  <div *ngIf="col.isFirstOfMonth"
                       class="month-cell"
                       [style.width.px]="col.daysInMonth! * cellWidth">
                    {{ col.monthFullName }}
                  </div>
                </ng-container>
              </div>

              <!-- Week Header Row -->
              <div class="week-row">
                <ng-container *ngFor="let col of dateColumns; trackBy: trackByDateKey">
                  <div *ngIf="col.isFirstOfWeek"
                       class="week-cell"
                       [style.width.px]="col.daysInWeek! * cellWidth">
                    {{ col.weekNumber }}
                  </div>
                </ng-container>
              </div>

              <!-- Day Header Row -->
              <div class="day-row" [style.height.px]="rowHeight">
                <div *ngFor="let col of dateColumns; trackBy: trackByDateKey"
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
            </div>
          </div>

          <!-- Scrollable Body Section -->
          <div class="matrix-body">
            <!-- Fixed name column -->
            <div class="body-names-column" #bodyNamesContainer [style.flex]="'0 0 ' + nameColumnWidth + 'px'">
              <div *ngFor="let member of filteredMembers; let rowIndex = index; trackBy: trackByMemberId"
                   class="member-name-cell"
                   [class.odd-row]="rowIndex % 2 === 1"
                   [class.my-row]="currentUserId === member.id"
                   [style.height.px]="rowHeight"
                   (dblclick)="openMemberDetail(member)"
                   (click)="onNameCellTap(member)">
                <span *ngFor="let col of nameColumnOrder"
                      class="name-col-value"
                      [class.particles-col]="col === 'particles'"
                      >{{ getNameField(member, col) }}</span>
              </div>
            </div>
            <!-- Resize handle for name column -->
            <div class="name-col-resize-handle"
                 (mousedown)="onResizeStart($event)"
                 (touchstart)="onResizeTouchStart($event)">
            </div>
            <!-- Scrollable date area -->
            <div class="body-dates-scroll"
                 #scrollContainer
                 [class.dragging]="isDragging"
                 (mousedown)="onMouseDown($event)"
                 (touchstart)="onTouchStart($event)"
                 (scroll)="onScroll()">
              <div *ngFor="let member of filteredMembers; let rowIndex = index; trackBy: trackByMemberId"
                   class="member-row">
                <div *ngFor="let col of dateColumns; trackBy: trackByDateKey"
                     class="schedule-cell"
                     [class.non-working]="col.isNonWorkingDay"
                     [class.holiday]="col.isHoliday"
                     [class.member-holiday]="cellRenderMap.has(member.id + ':' + col.dateKey)"
                     [class.today]="col.isToday"
                     [class.odd-row]="rowIndex % 2 === 1"
                     [class.my-row]="currentUserId === member.id"
                     [class.editable]="editableMemberIds.has(member.id)"
                     [style.width.px]="cellWidth"
                     [style.height.px]="rowHeight"
                     [style.background-color]="cellRenderMap.get(member.id + ':' + col.dateKey)?.bgColor ?? getCellColor(col)"
                     [style.background-image]="cellRenderMap.get(member.id + ':' + col.dateKey)?.bgImage"
                     [matTooltip]="cellRenderMap.get(member.id + ':' + col.dateKey)?.tooltip || col.holidayName"
                     [matTooltipDisabled]="!col.isHoliday && !cellRenderMap.has(member.id + ':' + col.dateKey)"
                     (dblclick)="onCellDblClick(member, col)"
                     (click)="onCellTap(member, col)"
                     (touchstart)="onCellTouchStart($event, member, col)"
                     (touchend)="onCellTouchEnd()">
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .schedule-container {
      max-width: 100%;
      padding: 24px;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
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
      flex: 1;
      min-height: 0;
    }

    .floating-controls {
      position: absolute;
      right: 20px;
      z-index: 20;
      display: flex;
      flex-direction: column;
      gap: 8px;
      opacity: 0.5;
      transition: opacity 0.15s;
    }

    .floating-controls:hover {
      opacity: 1;
    }

    .floating-controls.top-right {
      top: 8px;
    }

    .floating-controls.bottom-right {
      bottom: 8px;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      background: var(--mat-sys-surface-container);
      border-radius: 12px;
      padding: 2px;
    }

    .matrix-grid {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .matrix-header {
      display: flex;
      flex-shrink: 0;
      border-bottom: 2px solid var(--mat-sys-outline-variant);
    }

    .matrix-body {
      flex: 1;
      min-height: 0;
      display: flex;
    }

    .body-names-column {
      flex: 0 0 260px;
      overflow: hidden;
    }

    .body-dates-scroll {
      flex: 1;
      min-width: 0;
      overflow: auto;
      cursor: grab;
      user-select: none;
    }

    .body-dates-scroll.dragging {
      cursor: grabbing;
    }

    .matrix-header > .member-names-column {
      flex-shrink: 0;
      width: 260px;
      border-right: 2px solid var(--mat-sys-outline-variant);
    }

    .name-col-resize-handle {
      flex: 0 0 6px;
      cursor: col-resize;
      background: var(--mat-sys-outline-variant);
      transition: background 0.15s;
      touch-action: none;
      z-index: 5;
    }

    .name-col-resize-handle:hover,
    .name-col-resize-handle:active {
      background: var(--mat-sys-primary);
    }

    .date-header-scroll {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    .year-header-cell,
    .month-header-cell,
    .week-header-cell,
    .day-header-cell {
      background: var(--mat-sys-surface-variant);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .year-header-cell {
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding-left: 8px;
      font-size: 13px;
      font-weight: 600;
    }

    .month-header-cell {
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding-left: 8px;
      font-size: 13px;
      font-weight: 600;
    }

    .week-header-cell {
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding-left: 8px;
      font-size: 11px;
      color: var(--mat-sys-on-surface-variant);
    }

    .day-header-cell {
      border-bottom: none;
    }

    .name-columns-header {
      display: flex;
      align-items: stretch;
      padding: 0;
    }

    .name-col-header {
      flex: 1 1 0;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 2px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      color: var(--mat-sys-on-surface-variant);
      user-select: none;
      padding: 0 6px;
      border-right: 1px solid var(--mat-sys-outline-variant);
    }

    .name-col-header:last-child {
      border-right: none;
    }

    .name-col-header:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .name-col-header.sort-active {
      color: var(--mat-sys-primary);
    }

    .drag-handle {
      font-size: 14px;
      width: 14px;
      height: 14px;
      opacity: 0;
      transition: opacity 0.15s;
      color: var(--mat-sys-on-surface-variant);
      cursor: grab;
    }

    .name-col-header:hover .drag-handle {
      opacity: 0.6;
    }

    .header-spacer {
      flex: 1;
    }

    .sort-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .name-col-header.cdk-drag-preview {
      background: var(--mat-sys-surface-container);
      border-radius: 4px;
      padding: 4px 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .name-col-header.cdk-drag-placeholder {
      opacity: 0.3;
    }

    .member-name-cell {
      padding: 0;
      display: flex;
      align-items: stretch;
      justify-content: flex-start;
      font-size: 13px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface);
      cursor: pointer;
    }

    .member-name-cell:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .name-col-value {
      flex: 1 1 0;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 6px;
      text-align: left;
      display: flex;
      align-items: center;
      border-right: 1px solid var(--mat-sys-outline-variant);
    }

    .name-col-value:last-child {
      border-right: none;
    }

    .name-col-value.particles-col,
    .name-col-header.particles-col {
      flex: 0.7 0.7 0;
    }

    .member-name-cell.odd-row {
      background: var(--mat-sys-surface-container-low);
    }

    .member-name-cell.my-row {
      background: var(--mat-sys-primary-container);
    }

    .body-dates-scroll::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }

    .year-row,
    .month-row,
    .week-row,
    .day-row {
      display: flex;
      background: var(--mat-sys-surface-variant);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .year-row {
      height: 30px;
    }

    .month-row {
      height: 30px;
    }

    .week-row {
      height: 20px;
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
      border-bottom: none;
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

    .member-row {
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

    .member-name-cell.my-row,
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

    @media (max-width: 768px) {
      .schedule-container {
        padding: 8px;
      }

      .header {
        margin-bottom: 4px;
      }

      /* Smaller name text */
      .member-name-cell {
        font-size: 11px;
      }

      .name-col-value {
        padding: 0 4px;
      }

      /* Hide drag handles and sort icons (not usable on touch) */
      .drag-handle,
      .sort-icon {
        display: none;
      }

      .name-col-header {
        font-size: 10px;
        padding: 0 4px;
      }

      /* Hide year and week header rows to save vertical space */
      .year-header-cell,
      .year-row {
        display: none;
      }

      .week-header-cell,
      .week-row {
        display: none;
      }

      /* Compact month/day headers */
      .month-header-cell {
        font-size: 11px;
        height: 24px;
      }

      .month-cell {
        font-size: 11px;
      }

      .month-row {
        height: 24px;
      }
    }
  `]
})
export class ScheduleMatrixComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('headerScrollContainer') headerScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('bodyNamesContainer') bodyNamesContainer!: ElementRef<HTMLDivElement>;

  members: Member[] = [];
  filteredMembers: Member[] = [];
  teams: Team[] = [];
  dateColumns: DateColumn[] = [];
  selectedTeamIds: Set<string> = new Set();
  selectedTeamIdsArray: string[] = [];
  searchText = '';
  loading = true;
  error: string | null = null;

  // Pre-computed render data for member×date cells (only cells with member holidays)
  cellRenderMap = new Map<string, CellRenderData>();
  // Pre-computed set of member IDs that the current user can edit
  editableMemberIds = new Set<string>();
  // Current user ID cached for template comparisons
  currentUserId: string | null = null;

  // Team filter mode
  teamFilterMode: TeamFilterMode = 'and';

  // Name column ordering and sorting
  nameColumnOrder: NameColumnField[] = ['lastName', 'firstName', 'particles'];
  sortColumn: NameColumnField | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  // Name column width (resizable)
  nameColumnWidth = 260;
  private readonly NAME_COL_MIN = 60;
  private readonly NAME_COL_MAX = 400;
  private isResizingNameCol = false;
  private resizeStartX = 0;
  private resizeStartWidth = 0;
  private boundResizeMove: (e: MouseEvent) => void;
  private boundResizeEnd: (e: MouseEvent) => void;
  private boundResizeTouchMove: (e: TouchEvent) => void;
  private boundResizeTouchEnd: () => void;

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
  private navigationExpanded = true;

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

  // Double-tap detection for member name cells (mobile)
  private lastNameTapTime = 0;
  private lastNameTapMemberId: string | null = null;

  // Double-tap detection for date cells (mobile)
  private lastCellTapTime = 0;
  private lastCellTapKey: string | null = null;

  private get isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  constructor(
    private scheduleService: ScheduleService,
    private settingsService: SettingsService,
    private appSettingsService: AppSettingsService,
    private holidayService: HolidayService,
    private memberHolidayService: MemberHolidayService,
    private holidayTypeService: HolidayTypeService,
    private userPreferencesService: UserPreferencesService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private panelService: SlideInPanelService,
    private translate: TranslateService
  ) {
    const settings = this.settingsService.getScheduleSettings();
    if (settings?.selectedTeamIds) {
      this.selectedTeamIds = new Set(settings.selectedTeamIds);
      this.selectedTeamIdsArray = settings.selectedTeamIds;
    }
    if (settings?.searchText) {
      this.searchText = settings.searchText;
    }
    if (settings?.sortColumn) {
      this.sortColumn = settings.sortColumn as NameColumnField;
      this.sortDirection = settings.sortDirection || 'asc';
    }

    // Subscribe to app settings changes to update non-working days and colors
    this.appSettingsService.settings$.subscribe(settings => {
      this.nonWorkingDayColorLight = settings.nonWorkingDayColorLight;
      this.nonWorkingDayColorDark = settings.nonWorkingDayColorDark;
      this.holidayColorLight = settings.holidayColorLight;
      this.holidayColorDark = settings.holidayColorDark;
      this.updateNonWorkingDays();
      this.rebuildCellRenderMap();
      this.cdr.markForCheck();
    });

    // Track dark/light theme for holiday type colors
    this.userPreferencesService.isDarkTheme$.subscribe(isDark => {
      this.isDark = isDark;
      this.rebuildCellRenderMap();
      this.cdr.markForCheck();
    });

    // Track management mode, zoom, column order, filter mode, and nav state from preferences
    this.userPreferencesService.preferences$.subscribe(prefs => {
      this.managementModeEnabled = prefs.managementMode;
      this.navigationExpanded = prefs.navigationExpanded;
      this.teamFilterMode = prefs.teamFilterMode || 'and';
      this.rebuildEditableMemberIds();
      if (prefs.scheduleZoom >= this.ZOOM_MIN && prefs.scheduleZoom <= this.ZOOM_MAX && prefs.scheduleZoom !== this.cellWidth) {
        this.cellWidth = prefs.scheduleZoom;
      }
      if (prefs.scheduleNameColumnOrder) {
        this.nameColumnOrder = [...prefs.scheduleNameColumnOrder];
      }
      this.cdr.markForCheck();
    });

    // Sync sort from members table
    const membersSortSettings = this.settingsService.getMembersTableSettings();
    if (membersSortSettings && membersSortSettings.sortColumn &&
        ['firstName', 'particles', 'lastName'].includes(membersSortSettings.sortColumn)) {
      this.sortColumn = membersSortSettings.sortColumn as NameColumnField;
      this.sortDirection = membersSortSettings.sortDirection === 'desc' ? 'desc' : 'asc';
    }

    this.settingsService.membersTable$.subscribe(settings => {
      if (settings && settings.sortColumn &&
          ['firstName', 'particles', 'lastName'].includes(settings.sortColumn)) {
        this.sortColumn = settings.sortColumn as NameColumnField;
        this.sortDirection = settings.sortDirection === 'desc' ? 'desc' : 'asc';
        this.applySorting();
        this.cdr.markForCheck();
      }
    });

    // Re-generate date columns when language changes (day/month names)
    this.translate.onLangChange.subscribe(() => {
      this.generateDateColumns();
      this.updateVisibleDateInfo();
      this.cdr.markForCheck();
    });

    // Bind event handlers for drag-to-scroll
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundTouchMove = this.onTouchMove.bind(this);
    this.boundTouchEnd = this.onTouchEnd.bind(this);

    // Bind event handlers for name column resize
    this.boundResizeMove = this.onResizeMove.bind(this);
    this.boundResizeEnd = this.onResizeEnd.bind(this);
    this.boundResizeTouchMove = this.onResizeTouchMove.bind(this);
    this.boundResizeTouchEnd = this.onResizeTouchEnd.bind(this);

    // Use narrower default on mobile
    if (window.innerWidth <= 768) {
      this.nameColumnWidth = 90;
    }
  }

  ngOnInit(): void {
    this.currentUserId = this.authService.currentUser?.id || null;
    this.generateDateColumns();
    // Load data when user is logged in, or when they log in later
    this.authService.currentUser$.subscribe(user => {
      if (user && !this.members.length) {
        this.currentUserId = user.id;
        // Load date range from backend, then regenerate columns and load data
        this.appSettingsService.loadDateRange().subscribe(range => {
          this.generateDateColumns(range.startDate, range.endDate);
          this.loadHolidays();
          this.loadData();
          this.holidayTypeService.ensureLoaded().subscribe();
          this.cdr.markForCheck();
        });
      } else if (!user) {
        this.members = [];
        this.filteredMembers = [];
        this.currentUserId = null;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });

    // Subscribe to date range changes (e.g. from settings panel)
    this.appSettingsService.dateRange$.subscribe(range => {
      if (this.members.length > 0) {
        this.generateDateColumns(range.startDate, range.endDate);
        this.loadHolidays();
        this.loadMemberHolidays();
        this.cdr.markForCheck();
      }
    });

    // Subscribe to holiday data changes
    this.holidayService.holidays$.subscribe(() => {
      this.updateHolidays();
      this.cdr.markForCheck();
    });

    // Subscribe to member holiday changes - rebuild cell render map
    this.memberHolidayService.holidays$.subscribe(() => {
      this.rebuildCellRenderMap();
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
    document.removeEventListener('mousemove', this.boundResizeMove);
    document.removeEventListener('mouseup', this.boundResizeEnd);
    document.removeEventListener('touchmove', this.boundResizeTouchMove);
    document.removeEventListener('touchend', this.boundResizeTouchEnd);
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

  // Name column resize handlers
  onResizeStart(event: MouseEvent): void {
    event.preventDefault();
    this.isResizingNameCol = true;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.nameColumnWidth;
    document.addEventListener('mousemove', this.boundResizeMove);
    document.addEventListener('mouseup', this.boundResizeEnd);
  }

  onResizeTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    event.preventDefault();
    this.isResizingNameCol = true;
    this.resizeStartX = event.touches[0].clientX;
    this.resizeStartWidth = this.nameColumnWidth;
    document.addEventListener('touchmove', this.boundResizeTouchMove, { passive: false });
    document.addEventListener('touchend', this.boundResizeTouchEnd);
  }

  private onResizeMove(event: MouseEvent): void {
    if (!this.isResizingNameCol) return;
    const delta = event.clientX - this.resizeStartX;
    this.nameColumnWidth = Math.min(this.NAME_COL_MAX, Math.max(this.NAME_COL_MIN, this.resizeStartWidth + delta));
    this.cdr.markForCheck();
  }

  private onResizeTouchMove(event: TouchEvent): void {
    if (!this.isResizingNameCol || event.touches.length !== 1) return;
    event.preventDefault();
    const delta = event.touches[0].clientX - this.resizeStartX;
    this.nameColumnWidth = Math.min(this.NAME_COL_MAX, Math.max(this.NAME_COL_MIN, this.resizeStartWidth + delta));
    this.cdr.markForCheck();
  }

  private onResizeEnd(): void {
    if (!this.isResizingNameCol) return;
    this.isResizingNameCol = false;
    document.removeEventListener('mousemove', this.boundResizeMove);
    document.removeEventListener('mouseup', this.boundResizeEnd);
  }

  private onResizeTouchEnd(): void {
    if (!this.isResizingNameCol) return;
    this.isResizingNameCol = false;
    document.removeEventListener('touchmove', this.boundResizeTouchMove);
    document.removeEventListener('touchend', this.boundResizeTouchEnd);
  }

  // Scroll handler to sync header horizontal scroll, body names vertical scroll, and update visible year/month
  onScroll(): void {
    if (this.headerScrollContainer) {
      this.headerScrollContainer.nativeElement.scrollLeft = this.scrollContainer.nativeElement.scrollLeft;
    }
    if (this.bodyNamesContainer) {
      this.bodyNamesContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollTop;
    }
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

  generateDateColumns(rangeStart?: string, rangeEnd?: string): void {
    const range = this.appSettingsService.dateRange;
    const startDate = new Date(rangeStart || range.startDate);
    const endDate = new Date(rangeEnd || range.endDate);

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

      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');

      this.dateColumns.push({
        date: new Date(currentDate),
        dateKey: `${year}-${month}-${day}`,
        dayName: this.getDayName(currentDate),
        dayNumber: currentDate.getDate(),
        monthName: this.getMonthName(currentDate),
        monthFullName: this.getMonthFullName(currentDate),
        year,
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

  private getDateLocale(): string {
    return this.translate.currentLang === 'nl' ? 'nl-NL' : 'en-US';
  }

  private getDayName(date: Date): string {
    return date.toLocaleDateString(this.getDateLocale(), { weekday: 'short' });
  }

  private getMonthName(date: Date): string {
    return date.toLocaleDateString(this.getDateLocale(), { month: 'short' });
  }

  private getMonthFullName(date: Date): string {
    return date.toLocaleDateString(this.getDateLocale(), { month: 'long' });
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
      members: this.scheduleService.getMembersWithTeams(),
      teams: this.scheduleService.getTeams()
    }).subscribe({
      next: (result) => {
        this.members = result.members;
        this.teams = result.teams;
        this.filterMembers();
        this.loading = false;
        this.cdr.markForCheck();
        this.scrollToToday();
        this.loadMemberHolidays();
      },
      error: (error) => {
        this.error = error.message || this.translate.instant('schedule.messages.loadFailed');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openFilterPanel(): void {
    const panelRef = this.panelService.open<ScheduleFilterPanelComponent, ScheduleFilterPanelData, ScheduleFilterPanelResult>(
      ScheduleFilterPanelComponent,
      {
        ...(this.isMobile ? { leftOffset: '0px' } : { width: '360px' }),
        data: {
          teams: this.teams,
          selectedTeamIds: new Set(this.selectedTeamIds),
          teamFilterMode: this.teamFilterMode,
          getMemberCountForTeam: (teamId: string) => this.getMemberCountForTeam(teamId),
          getMemberCountWithoutTeam: () => this.getMemberCountWithoutTeam(),
          onSelectionChange: (ids: string[]) => {
            this.selectedTeamIds = new Set(ids);
            this.selectedTeamIdsArray = ids;
            this.filterMembers();
            this.rebuildCellRenderMap();
            this.cdr.markForCheck();
          },
          onFilterModeChange: (mode: TeamFilterMode) => {
            this.teamFilterMode = mode;
            this.userPreferencesService.setTeamFilterMode(mode);
            this.filterMembers();
            this.rebuildCellRenderMap();
            this.cdr.markForCheck();
          }
        }
      }
    );
    panelRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectedTeamIds = new Set(result.selectedTeamIds);
        this.selectedTeamIdsArray = result.selectedTeamIds;
        this.filterMembers();
        this.rebuildCellRenderMap();
        this.saveSettings();
        this.cdr.markForCheck();
      }
    });
  }

  openSearchPanel(): void {
    const panelRef = this.panelService.open<ScheduleSearchPanelComponent, ScheduleSearchPanelData, ScheduleSearchPanelResult>(
      ScheduleSearchPanelComponent,
      {
        ...(this.isMobile ? { leftOffset: '0px' } : { width: '360px' }),
        data: {
          searchText: this.searchText,
          onSearchChange: (text: string) => {
            this.searchText = text;
            this.filterMembers();
            this.rebuildCellRenderMap();
            this.cdr.markForCheck();
          }
        }
      }
    );
    panelRef.afterClosed().subscribe(result => {
      if (result) {
        this.searchText = result.searchText;
        this.filterMembers();
        this.rebuildCellRenderMap();
        this.saveSettings();
        this.cdr.markForCheck();
      }
    });
  }

  private saveSettings(): void {
    this.settingsService.setScheduleSettings({
      selectedTeamIds: this.selectedTeamIdsArray,
      searchText: this.searchText || undefined,
      sortColumn: this.sortColumn || undefined,
      sortDirection: this.sortColumn ? this.sortDirection : undefined
    });
  }

  filterMembers(): void {
    let result = this.members;

    // Team filter (AND or OR logic based on mode)
    if (this.selectedTeamIds.size > 0) {
      const matchFn = this.teamFilterMode === 'and' ? 'every' : 'some';
      result = result.filter(member => {
        const memberTeamIds = new Set(member.teams?.map(team => team.id) || []);
        return Array.from(this.selectedTeamIds)[matchFn](teamId => {
          if (teamId === '__no_team__') {
            return !member.teams || member.teams.length === 0;
          }
          return memberTeamIds.has(teamId);
        });
      });
    }

    // Search filter
    if (this.searchText) {
      const term = this.searchText.toLowerCase();
      result = result.filter(member =>
        member.firstName.toLowerCase().includes(term) ||
        member.lastName.toLowerCase().includes(term) ||
        (member.particles || '').toLowerCase().includes(term)
      );
    }

    this.filteredMembers = result;
    this.applySorting();
    this.rebuildEditableMemberIds();
  }

  getColumnLabel(col: NameColumnField): string {
    switch (col) {
      case 'firstName': return this.translate.instant('schedule.columns.first');
      case 'particles': return this.translate.instant('schedule.columns.particles');
      case 'lastName': return this.translate.instant('schedule.columns.last');
    }
  }

  getNameField(member: Member, col: NameColumnField): string {
    switch (col) {
      case 'firstName': return member.firstName;
      case 'particles': return member.particles || '';
      case 'lastName': return member.lastName;
    }
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

  onSortClick(col: NameColumnField): void {
    if (this.sortColumn === col) {
      if (this.sortDirection === 'asc') {
        this.sortDirection = 'desc';
      } else {
        this.sortColumn = null;
      }
    } else {
      this.sortColumn = col;
      this.sortDirection = 'asc';
    }
    this.applySorting();
    this.rebuildCellRenderMap();
    this.saveSettings();
    this.cdr.markForCheck();

    // Sync to members table
    this.settingsService.setMembersTableSettings({
      sortColumn: this.sortColumn || '',
      sortDirection: this.sortColumn ? this.sortDirection : '',
      pageSize: this.settingsService.getMembersTableSettings()?.pageSize || 10
    });
  }

  onColumnDrop(event: CdkDragDrop<NameColumnField[]>): void {
    moveItemInArray(this.nameColumnOrder, event.previousIndex, event.currentIndex);
    this.userPreferencesService.setScheduleNameColumnOrder([...this.nameColumnOrder]);
  }

  private applySorting(): void {
    if (!this.sortColumn) return;
    const col = this.sortColumn;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.filteredMembers = [...this.filteredMembers].sort((a, b) => {
      const aVal = this.getNameField(a, col).toLowerCase();
      const bVal = this.getNameField(b, col).toLowerCase();
      return aVal.localeCompare(bVal) * dir;
    });
  }

  trackByMemberId(_index: number, member: Member): string {
    return member.id;
  }

  trackByDateKey(_index: number, col: DateColumn): string {
    return col.dateKey;
  }

  private memberMatchesTeam(member: Member, teamId: string): boolean {
    if (teamId === '__no_team__') {
      return !member.teams || member.teams.length === 0;
    }
    return member.teams?.some(team => team.id === teamId) || false;
  }

  private memberMatchesSelection(member: Member, selection: Set<string>, mode: TeamFilterMode): boolean {
    const matchFn = mode === 'and' ? 'every' : 'some';
    return Array.from(selection)[matchFn](teamId => this.memberMatchesTeam(member, teamId));
  }

  getMemberCountForTeam(teamId: string): number {
    if (this.selectedTeamIds.size === 0 || this.selectedTeamIds.has(teamId)) {
      // No filters active or this team already selected: show total membership
      return this.members.filter(m => this.memberMatchesTeam(m, teamId)).length;
    }

    if (this.teamFilterMode === 'and') {
      // AND: how many members match when this team is ADDED to current selection
      const testSelection = new Set([...this.selectedTeamIds, teamId]);
      return this.members.filter(m => this.memberMatchesSelection(m, testSelection, 'and')).length;
    } else {
      // OR: how many ADDITIONAL members this team would contribute
      return this.members.filter(m =>
        this.memberMatchesTeam(m, teamId) && !this.memberMatchesSelection(m, this.selectedTeamIds, 'or')
      ).length;
    }
  }

  getMemberCountWithoutTeam(): number {
    const teamId = '__no_team__';
    if (this.selectedTeamIds.size === 0 || this.selectedTeamIds.has(teamId)) {
      return this.members.filter(m => this.memberMatchesTeam(m, teamId)).length;
    }

    if (this.teamFilterMode === 'and') {
      // AND + real teams: no member can be teamless AND in a team
      const hasRealTeams = Array.from(this.selectedTeamIds).some(id => id !== '__no_team__');
      if (hasRealTeams) return 0;
      return this.members.filter(m => this.memberMatchesTeam(m, teamId)).length;
    } else {
      // OR: additional teamless members not already matched
      return this.members.filter(m =>
        this.memberMatchesTeam(m, teamId) && !this.memberMatchesSelection(m, this.selectedTeamIds, 'or')
      ).length;
    }
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

  scrollToMyRow(): void {
    if (!this.currentUserId) return;
    const myIndex = this.filteredMembers.findIndex(m => m.id === this.currentUserId);
    if (myIndex === -1 || !this.scrollContainer) return;

    const targetRow = Math.max(0, myIndex - 3);
    const scrollTop = targetRow * this.rowHeight;
    this.scrollContainer.nativeElement.scrollTo({ top: scrollTop, behavior: 'smooth' });
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
    const centerOffset = container.clientWidth / 2;
    const dateIndex = (container.scrollLeft + centerOffset) / this.cellWidth;
    this.cellWidth = newWidth;
    container.scrollLeft = dateIndex * newWidth - centerOffset;
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

  private loadMemberHolidays(): void {
    if (this.dateColumns.length === 0) return;
    const startDate = this.dateColumns[0].dateKey;
    const endDate = this.dateColumns[this.dateColumns.length - 1].dateKey;
    this.memberHolidayService.loadAllHolidays(startDate, endDate).subscribe();
  }

  /** Pre-compute render data for all member×date cells that have member holidays */
  private rebuildCellRenderMap(): void {
    this.cellRenderMap.clear();
    for (const member of this.filteredMembers) {
      for (const col of this.dateColumns) {
        const holiday = this.memberHolidayService.getHoliday(member.id, col.dateKey);
        if (holiday) {
          const color = this.getHolidayColor(holiday);
          let bgColor: string | null = null;
          let bgImage: string | null = null;

          if (holiday.dayPart === 'full') {
            bgColor = color;
          } else if (holiday.dayPart === 'morning') {
            bgImage = `linear-gradient(to bottom right, ${color} 50%, transparent 50%)`;
          } else if (holiday.dayPart === 'afternoon') {
            bgImage = `linear-gradient(to bottom right, transparent 50%, ${color} 50%)`;
          }

          const typeName = holiday.holidayType?.name || 'Vakantie';
          const partLabel = holiday.dayPart === 'morning' ? ' ' + this.translate.instant('schedule.dayParts.morning')
                          : holiday.dayPart === 'afternoon' ? ' ' + this.translate.instant('schedule.dayParts.afternoon')
                          : '';
          const desc = holiday.description ? `: ${holiday.description}` : '';

          this.cellRenderMap.set(`${member.id}:${col.dateKey}`, {
            bgColor,
            bgImage,
            tooltip: `${typeName}${partLabel}${desc}`,
            hasHoliday: true
          });
        }
      }
    }
  }

  private rebuildEditableMemberIds(): void {
    this.editableMemberIds.clear();
    const isManager = this.authService.isManager && this.managementModeEnabled;
    for (const member of this.filteredMembers) {
      if (isManager || member.id === this.currentUserId) {
        this.editableMemberIds.add(member.id);
      }
    }
  }

  private getHolidayColor(memberHoliday: ExpandedDayEntry): string {
    if (memberHoliday.holidayType) {
      return this.isDark ? memberHoliday.holidayType.colorDark : memberHoliday.holidayType.colorLight;
    }
    const defaultType = this.holidayTypeService.getDefaultType();
    if (defaultType) {
      return this.isDark ? defaultType.colorDark : defaultType.colorLight;
    }
    return '#c8e6c9';
  }

  private canEditCell(member: Member): boolean {
    return this.editableMemberIds.has(member.id);
  }

  onCellDblClick(member: Member, col: DateColumn): void {
    if (!this.canEditCell(member)) return;

    if (this.memberHolidayService.hasHoliday(member.id, col.dateKey)) {
      const dayEntry = this.memberHolidayService.getHoliday(member.id, col.dateKey);
      if (!dayEntry) return;

      const period = this.memberHolidayService.getPeriod(dayEntry.periodId);
      if (!period) return;

      this.openEditHolidayDialog(period, member);
    } else {
      this.openAddHolidayDialog(col.date, member);
    }
  }

  onCellTap(member: Member, col: DateColumn): void {
    if (!this.canEditCell(member)) return;
    const key = member.id + ':' + col.dateKey;
    const now = Date.now();
    if (this.lastCellTapKey === key && now - this.lastCellTapTime < 400) {
      this.lastCellTapTime = 0;
      this.lastCellTapKey = null;
      this.onCellDblClick(member, col);
    } else {
      this.lastCellTapTime = now;
      this.lastCellTapKey = key;
    }
  }

  onCellTouchStart(event: TouchEvent, member: Member, col: DateColumn): void {
    if (!this.canEditCell(member)) return;

    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;

      if (this.memberHolidayService.hasHoliday(member.id, col.dateKey)) {
        const dayEntry = this.memberHolidayService.getHoliday(member.id, col.dateKey);
        if (!dayEntry) return;

        const period = this.memberHolidayService.getPeriod(dayEntry.periodId);
        if (!period) return;

        this.openEditHolidayDialog(period, member);
      } else {
        this.openAddHolidayDialog(col.date, member);
      }
    }, 500);
  }

  private getMemberName(member: Member): string {
    return member.particles
      ? `${member.firstName} ${member.particles} ${member.lastName}`
      : `${member.firstName} ${member.lastName}`;
  }

  private openAddHolidayDialog(date: Date, member: Member): void {
    const isOther = member.id !== this.currentUserId;
    const panelRef = this.panelService.open<HolidayDialogComponent, HolidayDialogData, HolidayDialogResult>(
      HolidayDialogComponent,
      {
        ...(this.isMobile ? { leftOffset: '0px' } : {}),
        data: {
          mode: 'add',
          memberId: member.id,
          initialDate: date,
          memberName: isOther ? this.getMemberName(member) : undefined
        }
      }
    );

    panelRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMemberHolidays();
      }
    });
  }

  private openEditHolidayDialog(period: MemberHolidayPeriod, member: Member): void {
    const isOther = member.id !== this.currentUserId;
    const panelRef = this.panelService.open<HolidayDialogComponent, HolidayDialogData, HolidayDialogResult>(
      HolidayDialogComponent,
      {
        ...(this.isMobile ? { leftOffset: '0px' } : {}),
        data: {
          mode: 'edit',
          memberId: member.id,
          period,
          memberName: isOther ? this.getMemberName(member) : undefined
        }
      }
    );

    panelRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMemberHolidays();
      }
    });
  }

  onNameCellTap(member: Member): void {
    const now = Date.now();
    if (this.lastNameTapMemberId === member.id && now - this.lastNameTapTime < 400) {
      this.lastNameTapTime = 0;
      this.lastNameTapMemberId = null;
      this.openMemberDetail(member);
    } else {
      this.lastNameTapTime = now;
      this.lastNameTapMemberId = member.id;
    }
  }

  openMemberDetail(member: Member): void {
    const mobile = this.isMobile;
    const railWidth = mobile ? 0 : (this.navigationExpanded ? 220 : 80);
    const panelRef = this.panelService.open(MemberDetailDialogComponent, {
      leftOffset: `${railWidth}px`,
      data: { memberId: member.id, leftOffset: `${railWidth}px` }
    });

    panelRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }
}
