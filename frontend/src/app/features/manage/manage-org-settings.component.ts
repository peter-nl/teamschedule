import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { HolidayService, HolidayInfo } from '../../core/services/holiday.service';
import { HolidayTypeService, HolidayType } from '../../core/services/holiday-type.service';
import { NotificationService } from '../../shared/services/notification.service';

interface DayConfig { label: string; jsIndex: number; }
interface HolidayYearGroup { year: number; holidays: HolidayInfo[]; }

@Component({
  selector: 'app-manage-org-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatTooltipModule,
    TranslateModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="org-settings-loading" *ngIf="loading">
      <mat-progress-spinner mode="indeterminate" diameter="32"></mat-progress-spinner>
    </div>

    <ng-container *ngIf="!loading">

      <!-- Schedule Date Range (own org only) -->
      <div class="settings-section" *ngIf="!orgId">
        <div class="section-header">
          <div>
            <h3 class="section-title">{{ 'settings.dateRange.title' | translate }}</h3>
            <p class="section-desc">{{ 'settings.dateRange.description' | translate }}</p>
          </div>
        </div>
        <div class="date-range-form">
          <mat-form-field appearance="outline" class="date-field">
            <mat-label>{{ 'settings.dateRange.startDate' | translate }}</mat-label>
            <input matInput [matDatepicker]="startPicker" [(ngModel)]="scheduleStartDateObj" name="scheduleStart">
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" class="date-field">
            <mat-label>{{ 'settings.dateRange.endDate' | translate }}</mat-label>
            <input matInput [matDatepicker]="endPicker" [(ngModel)]="scheduleEndDateObj" name="scheduleEnd">
            <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
          <button mat-icon-button color="primary"
                  (click)="saveScheduleDateRange()"
                  [disabled]="dateRangeSaving || !isDateRangeValid"
                  [matTooltip]="'settings.dateRange.saveButton' | translate">
            <mat-progress-spinner *ngIf="dateRangeSaving" mode="indeterminate" diameter="18"></mat-progress-spinner>
            <mat-icon *ngIf="!dateRangeSaving">save</mat-icon>
          </button>
        </div>
        <div class="date-range-warning" *ngIf="scheduleStartDateObj || scheduleEndDateObj">
          <mat-icon>warning</mat-icon>
          {{ 'settings.dateRange.warning' | translate }}
        </div>
        <div *ngIf="dateRangeMessage" class="message-row" [class.msg-success]="dateRangeSuccess" [class.msg-error]="!dateRangeSuccess">
          <mat-icon>{{ dateRangeSuccess ? 'check_circle' : 'error' }}</mat-icon>
          {{ dateRangeMessage }}
        </div>
      </div>

      <mat-divider *ngIf="!orgId"></mat-divider>

      <!-- Public Holidays (own org only) -->
      <div class="settings-section" *ngIf="!orgId">
        <div class="section-header">
          <div>
            <h3 class="section-title">{{ 'settings.holidays.title' | translate }}</h3>
            <p class="section-desc">{{ 'settings.holidays.description' | translate }}</p>
          </div>
          <button mat-icon-button (click)="resetHolidays()" [matTooltip]="'common.reload' | translate">
            <mat-icon>restart_alt</mat-icon>
          </button>
        </div>
        <div *ngIf="holidaysLoading" class="holidays-loading">
          <mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner>
          <span>{{ 'settings.holidays.loading' | translate }}</span>
        </div>
        <div *ngIf="!holidaysLoading && holidays.length === 0" class="holidays-empty">
          {{ 'settings.holidays.empty' | translate }}
        </div>
        <div *ngIf="!holidaysLoading && holidays.length > 0" class="holidays-columns-scroll">
          <div class="holidays-columns">
            <div *ngFor="let yearGroup of holidaysByYear" class="holiday-year-column">
              <h4>{{ yearGroup.year }}</h4>
              <div class="holiday-items">
                <div *ngFor="let holiday of yearGroup.holidays" class="holiday-item">
                  <div class="holiday-date">{{ holiday.date | date:'EEE, d MMM' }}</div>
                  <div class="holiday-name">{{ holiday.localName }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <mat-divider></mat-divider>

      <!-- Working Days -->
      <div class="settings-section">
        <div class="section-header">
          <div>
            <h3 class="section-title">{{ 'settings.workingDays.title' | translate }}</h3>
            <p class="section-desc">{{ 'settings.workingDays.description' | translate }}</p>
          </div>
        </div>
        <div class="days-grid">
          <mat-checkbox
            *ngFor="let day of orderedDays"
            [checked]="workingDays[day.jsIndex]"
            (change)="onDayToggle(day.jsIndex, $event.checked)">
            {{ day.label | translate }}
          </mat-checkbox>
        </div>
        <mat-form-field appearance="outline" class="week-start-field">
          <mat-label>{{ 'settings.workingDays.weekStartsOn' | translate }}</mat-label>
          <mat-select [value]="weekStartDay" (selectionChange)="onWeekStartDayChange($event.value)">
            <mat-option [value]="1">{{ 'days.monday' | translate }}</mat-option>
            <mat-option [value]="0">{{ 'days.sunday' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-divider></mat-divider>

      <!-- Colors -->
      <div class="settings-section">
        <div class="section-header">
          <div>
            <h3 class="section-title">{{ 'settings.colors.title' | translate }}</h3>
            <p class="section-desc">{{ 'settings.colors.description' | translate }}</p>
          </div>
        </div>
        <div class="color-theme-sections">
          <div class="color-theme-section">
            <div class="theme-section-header">
              <mat-icon>light_mode</mat-icon>
              <span>{{ 'common.light' | translate }}</span>
            </div>
            <div class="theme-swatches">
              <div class="theme-swatch">
                <span class="swatch-label">{{ 'settings.colors.nonWorkingDays' | translate }}</span>
                <input type="color" [value]="nonWorkingDayColorLight" (input)="onColorChange('nonWorkingDayLight', $event)">
              </div>
              <div class="theme-swatch">
                <span class="swatch-label">{{ 'settings.colors.publicHolidays' | translate }}</span>
                <input type="color" [value]="holidayColorLight" (input)="onColorChange('holidayLight', $event)">
              </div>
              <div class="theme-swatch">
                <span class="swatch-label">{{ 'settings.colors.scheduledDaysOff' | translate }}</span>
                <input type="color" [value]="scheduledDayOffColorLight" (input)="onColorChange('scheduledDayOffLight', $event)">
              </div>
              <div class="theme-swatch">
                <span class="swatch-label">{{ 'settings.colors.noContract' | translate }}</span>
                <input type="color" [value]="noContractColorLight" (input)="onColorChange('noContractLight', $event)">
              </div>
            </div>
            <div class="theme-preview light-preview">
              <div class="preview-cell">Mo</div>
              <div class="preview-cell" [style.background-color]="holidayColorLight">Tu</div>
              <div class="preview-cell">We</div>
              <div class="preview-cell" [style.background-color]="scheduledDayOffColorLight">Th</div>
              <div class="preview-cell" [style.background-color]="noContractColorLight">Fr</div>
              <div class="preview-cell" [style.background-color]="nonWorkingDayColorLight">Sa</div>
              <div class="preview-cell" [style.background-color]="nonWorkingDayColorLight">Su</div>
            </div>
          </div>
          <div class="color-theme-section dark-theme">
            <div class="theme-section-header">
              <mat-icon>dark_mode</mat-icon>
              <span>{{ 'common.dark' | translate }}</span>
            </div>
            <div class="theme-swatches">
              <div class="theme-swatch">
                <span class="swatch-label">{{ 'settings.colors.nonWorkingDays' | translate }}</span>
                <input type="color" [value]="nonWorkingDayColorDark" (input)="onColorChange('nonWorkingDayDark', $event)">
              </div>
              <div class="theme-swatch">
                <span class="swatch-label">{{ 'settings.colors.publicHolidays' | translate }}</span>
                <input type="color" [value]="holidayColorDark" (input)="onColorChange('holidayDark', $event)">
              </div>
              <div class="theme-swatch">
                <span class="swatch-label">{{ 'settings.colors.scheduledDaysOff' | translate }}</span>
                <input type="color" [value]="scheduledDayOffColorDark" (input)="onColorChange('scheduledDayOffDark', $event)">
              </div>
              <div class="theme-swatch">
                <span class="swatch-label">{{ 'settings.colors.noContract' | translate }}</span>
                <input type="color" [value]="noContractColorDark" (input)="onColorChange('noContractDark', $event)">
              </div>
            </div>
            <div class="theme-preview dark-preview">
              <div class="preview-cell">Mo</div>
              <div class="preview-cell" [style.background-color]="holidayColorDark">Tu</div>
              <div class="preview-cell">We</div>
              <div class="preview-cell" [style.background-color]="scheduledDayOffColorDark">Th</div>
              <div class="preview-cell" [style.background-color]="noContractColorDark">Fr</div>
              <div class="preview-cell" [style.background-color]="nonWorkingDayColorDark">Sa</div>
              <div class="preview-cell" [style.background-color]="nonWorkingDayColorDark">Su</div>
            </div>
          </div>
        </div>
      </div>

      <mat-divider *ngIf="!orgId"></mat-divider>

      <!-- Holiday Types (Days Off, own org only) -->
      <div class="settings-section" *ngIf="!orgId">
        <div class="section-header">
          <div>
            <h3 class="section-title">{{ 'settings.holidayTypes.title' | translate }}</h3>
            <p class="section-desc">{{ 'settings.holidayTypes.description' | translate }}</p>
          </div>
        </div>
        <div class="color-theme-sections">
          <div class="color-theme-section">
            <div class="theme-section-header">
              <mat-icon>light_mode</mat-icon>
              <span>{{ 'common.light' | translate }}</span>
            </div>
            <div class="theme-swatches">
              <div *ngFor="let type of holidayTypes" class="theme-swatch">
                <input class="swatch-name-input" [value]="type.name"
                       (blur)="onTypeNameChange(type, $event)"
                       (keydown.enter)="$any($event.target).blur()">
                <input type="color" [value]="type.colorLight" (input)="onTypeColorLightChange(type, $event)">
                <button class="swatch-delete-btn" (click)="deleteHolidayType(type)">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              <div class="theme-swatch add-type-slot" *ngIf="holidayTypes.length < 4">
                <div class="add-slot-box"><mat-icon>add</mat-icon></div>
              </div>
            </div>
            <div class="theme-preview light-preview">
              <div class="preview-cell">Mo</div>
              <div class="preview-cell" [style.background-color]="holidayTypes[0]?.colorLight">Tu</div>
              <div class="preview-cell">We</div>
              <div class="preview-cell" [style.background-color]="holidayTypes[1]?.colorLight">Th</div>
              <div class="preview-cell" [style.background-color]="holidayTypes[2]?.colorLight">Fr</div>
              <div class="preview-cell" [style.background-color]="holidayTypes[3]?.colorLight">Sa</div>
              <div class="preview-cell">Su</div>
            </div>
          </div>
          <div class="color-theme-section dark-theme">
            <div class="theme-section-header">
              <mat-icon>dark_mode</mat-icon>
              <span>{{ 'common.dark' | translate }}</span>
            </div>
            <div class="theme-swatches">
              <div *ngFor="let type of holidayTypes" class="theme-swatch">
                <span class="swatch-label">{{ type.name }}</span>
                <input type="color" [value]="type.colorDark" (input)="onTypeColorDarkChange(type, $event)">
              </div>
              <div class="theme-swatch add-type-slot" *ngIf="holidayTypes.length < 4">
                <div class="add-slot-box dark-add-slot"><mat-icon>add</mat-icon></div>
              </div>
            </div>
            <div class="theme-preview dark-preview">
              <div class="preview-cell">Mo</div>
              <div class="preview-cell" [style.background-color]="holidayTypes[0]?.colorDark">Tu</div>
              <div class="preview-cell">We</div>
              <div class="preview-cell" [style.background-color]="holidayTypes[1]?.colorDark">Th</div>
              <div class="preview-cell" [style.background-color]="holidayTypes[2]?.colorDark">Fr</div>
              <div class="preview-cell" [style.background-color]="holidayTypes[3]?.colorDark">Sa</div>
              <div class="preview-cell">Su</div>
            </div>
          </div>
        </div>
        <div class="add-holiday-type-form" *ngIf="holidayTypes.length < 4">
          <mat-form-field appearance="outline" class="type-name-field">
            <mat-label>{{ 'settings.holidayTypes.newTypeName' | translate }}</mat-label>
            <input matInput [(ngModel)]="newTypeName" [placeholder]="'settings.holidayTypes.newTypePlaceholder' | translate">
          </mat-form-field>
          <div class="color-pair">
            <label>{{ 'common.light' | translate }}</label>
            <input type="color" [value]="newTypeColorLight" (input)="newTypeColorLight = $any($event.target).value">
          </div>
          <div class="color-pair">
            <label>{{ 'common.dark' | translate }}</label>
            <input type="color" [value]="newTypeColorDark" (input)="newTypeColorDark = $any($event.target).value">
          </div>
          <button mat-icon-button color="primary" (click)="addHolidayType()"
                  [disabled]="!newTypeName.trim()" [matTooltip]="'common.add' | translate">
            <mat-icon>add</mat-icon>
          </button>
        </div>
        <p class="types-limit-note" *ngIf="holidayTypes.length >= 4">
          {{ 'settings.holidayTypes.maxTypes' | translate }}
        </p>
      </div>

    </ng-container>
  `,
  styles: [`
    :host {
      display: block;
    }

    .org-settings-loading {
      display: flex;
      justify-content: center;
      padding: 32px;
    }

    .settings-section {
      padding: 20px 0 4px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }

    .section-title {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .section-desc {
      margin: 0 0 12px 0;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    /* Date Range */
    .date-range-form {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .date-field { width: 200px; }

    .date-range-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      padding: 6px 0 0;
      color: var(--mat-sys-on-surface-variant);
    }

    .date-range-warning mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--mat-sys-tertiary);
    }

    .message-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      padding: 8px 0;
    }

    .msg-success { color: var(--mat-sys-primary); }
    .msg-error { color: var(--mat-sys-error); }

    .message-row mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Public Holidays */
    .holidays-loading {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
    }

    .holidays-empty {
      padding: 12px 0;
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
    }

    .holidays-columns-scroll {
      overflow-x: auto;
      padding-bottom: 8px;
    }

    .holidays-columns {
      display: flex;
      gap: 20px;
      min-width: min-content;
    }

    .holiday-year-column {
      min-width: 200px;
      flex-shrink: 0;
    }

    .holiday-year-column h4 {
      margin: 0 0 8px 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
    }

    .holiday-items {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .holiday-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 10px;
      background: var(--mat-sys-surface-container-low);
      border-radius: 6px;
      font-size: 12px;
    }

    .holiday-date {
      min-width: 95px;
      color: var(--mat-sys-on-surface-variant);
      font-weight: 500;
    }

    .holiday-name { color: var(--mat-sys-on-surface); }

    /* Working Days */
    .days-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;
    }

    .days-grid mat-checkbox { min-width: 100px; }

    .week-start-field { width: 180px; }

    /* Colors */
    .color-theme-sections {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .color-theme-section {
      padding: 14px;
      background: #eeeff1;
      border-radius: 10px;
    }

    .color-theme-section.dark-theme { background: #26282e; }

    .theme-section-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #5f6368;
    }

    .dark-theme .theme-section-header { color: #9a9da6; }
    .dark-theme .theme-section-header mat-icon { color: #9a9da6; }

    .theme-swatches {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .theme-swatch {
      flex: 1;
      min-width: 60px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .theme-swatch input[type="color"] {
      width: 40px;
      height: 40px;
      border: 2px solid rgba(0,0,0,0.15);
      border-radius: 6px;
      cursor: pointer;
      padding: 2px;
      background: none;
    }

    .dark-theme .theme-swatch input[type="color"] { border-color: rgba(255,255,255,0.2); }

    .swatch-label {
      font-size: 10px;
      color: #5f6368;
      text-align: center;
      line-height: 1.3;
    }

    .dark-theme .swatch-label { color: #9a9da6; }

    .theme-preview {
      display: flex;
      gap: 2px;
      margin-top: 12px;
      border-radius: 6px;
      overflow: hidden;
      padding: 3px;
    }

    .light-preview { background: #f0f0f0; }
    .dark-preview { background: #1a1c21; }

    .preview-cell {
      flex: 1;
      height: 26px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 500;
    }

    .light-preview .preview-cell { color: rgba(0,0,0,0.45); }
    .dark-preview .preview-cell { color: rgba(255,255,255,0.45); }

    /* Holiday type name input */
    .swatch-name-input {
      font-size: 10px;
      color: #5f6368;
      text-align: center;
      width: 100%;
      border: none;
      background: transparent;
      outline: none;
      font-family: inherit;
      border-bottom: 1px solid transparent;
      padding: 2px 0;
      line-height: 1.3;
    }

    .swatch-name-input:hover { border-bottom-color: rgba(0,0,0,0.3); }
    .swatch-name-input:focus { border-bottom-color: #1a73e8; color: #202124; }

    .swatch-delete-btn {
      background: none;
      border: none;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      padding: 0;
      transition: background 0.15s;
    }

    .swatch-delete-btn:hover { background: rgba(217,48,37,0.1); }

    .swatch-delete-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      line-height: 16px;
      color: rgba(0,0,0,0.35);
    }

    .swatch-delete-btn:hover mat-icon { color: #d93025; }

    .add-type-slot { opacity: 0.4; pointer-events: none; }

    .add-slot-box {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px dashed rgba(0,0,0,0.25);
      border-radius: 6px;
      color: rgba(0,0,0,0.4);
    }

    .dark-add-slot { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.4); }

    .add-holiday-type-form {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0 4px;
      flex-wrap: wrap;
    }

    .type-name-field { flex: 1; min-width: 140px; }

    .color-pair {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .color-pair label {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      min-width: 30px;
    }

    .color-pair input[type="color"] {
      width: 40px;
      height: 40px;
      border: 2px solid rgba(0,0,0,0.15);
      border-radius: 6px;
      cursor: pointer;
      padding: 2px;
      background: none;
    }

    .types-limit-note {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      margin: 8px 0 0;
      padding: 0;
    }
  `]
})
export class ManageOrgSettingsComponent implements OnInit, OnChanges {
  private static readonly ALL_DAYS: DayConfig[] = [
    { label: 'days.sunday', jsIndex: 0 },
    { label: 'days.monday', jsIndex: 1 },
    { label: 'days.tuesday', jsIndex: 2 },
    { label: 'days.wednesday', jsIndex: 3 },
    { label: 'days.thursday', jsIndex: 4 },
    { label: 'days.friday', jsIndex: 5 },
    { label: 'days.saturday', jsIndex: 6 },
  ];

  @Input() orgId?: string;

  loading = true;

  orderedDays: DayConfig[] = [];
  weekStartDay: 0 | 1 = 1;
  workingDays: boolean[] = [];

  nonWorkingDayColorLight = '';
  nonWorkingDayColorDark = '';
  holidayColorLight = '';
  holidayColorDark = '';
  scheduledDayOffColorLight = '';
  scheduledDayOffColorDark = '';
  noContractColorLight = '';
  noContractColorDark = '';

  scheduleStartDateObj: Date | null = null;
  scheduleEndDateObj: Date | null = null;
  dateRangeSaving = false;
  dateRangeMessage: string | null = null;
  dateRangeSuccess = false;

  holidays: HolidayInfo[] = [];
  holidaysByYear: HolidayYearGroup[] = [];
  holidaysLoading = true;

  holidayTypes: HolidayType[] = [];
  newTypeName = '';
  newTypeColorLight = '#c8e6c9';
  newTypeColorDark = '#2e7d32';

  private colorSaveTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private appSettingsService: AppSettingsService,
    private holidayService: HolidayService,
    private holidayTypeService: HolidayTypeService,
    private notificationService: NotificationService,
    private translate: TranslateService,
  ) {}

  get isDateRangeValid(): boolean {
    if (!this.scheduleStartDateObj || !this.scheduleEndDateObj) return false;
    return this.scheduleStartDateObj < this.scheduleEndDateObj;
  }

  ngOnInit(): void {
    this.loadSettings();

    if (!this.orgId) {
      // Load date range and holidays only for own org
      this.appSettingsService.loadDateRange().subscribe(range => {
        this.scheduleStartDateObj = new Date(range.startDate + 'T00:00:00');
        this.scheduleEndDateObj = new Date(range.endDate + 'T00:00:00');
        this.loadHolidaysForRange(range.startDate, range.endDate);
      });

      this.holidayTypeService.types$.subscribe(types => {
        this.holidayTypes = types.filter(t => !t.isSystem);
      });
      this.holidayTypeService.loadTypes().subscribe();

      this.holidayService.holidays$.subscribe(holidaysMap => {
        this.holidays = Array.from(holidaysMap.values())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        this.groupHolidaysByYear();
        this.holidaysLoading = false;
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['orgId'] && !changes['orgId'].firstChange) {
      this.loadSettings();
    }
  }

  private loadSettings(): void {
    this.loading = true;
    this.appSettingsService.loadOrgSettings(this.orgId).subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.loading = false;
      },
      error: () => {
        if (!this.orgId) {
          this.applySettings(this.appSettingsService.settings);
        }
        this.loading = false;
      }
    });
  }

  private applySettings(s: { workingDays: boolean[]; weekStartDay: 0 | 1; nonWorkingDayColorLight: string; nonWorkingDayColorDark: string; holidayColorLight: string; holidayColorDark: string; scheduledDayOffColorLight: string; scheduledDayOffColorDark: string; noContractColorLight: string; noContractColorDark: string }): void {
    this.workingDays = [...s.workingDays];
    this.weekStartDay = s.weekStartDay;
    this.nonWorkingDayColorLight = s.nonWorkingDayColorLight;
    this.nonWorkingDayColorDark = s.nonWorkingDayColorDark;
    this.holidayColorLight = s.holidayColorLight;
    this.holidayColorDark = s.holidayColorDark;
    this.scheduledDayOffColorLight = s.scheduledDayOffColorLight;
    this.scheduledDayOffColorDark = s.scheduledDayOffColorDark;
    this.noContractColorLight = s.noContractColorLight;
    this.noContractColorDark = s.noContractColorDark;
    this.reorderDays();
  }

  private buildCurrentSettings() {
    return {
      workingDays: [...this.workingDays],
      weekStartDay: this.weekStartDay,
      nonWorkingDayColorLight: this.nonWorkingDayColorLight,
      nonWorkingDayColorDark: this.nonWorkingDayColorDark,
      holidayColorLight: this.holidayColorLight,
      holidayColorDark: this.holidayColorDark,
      scheduledDayOffColorLight: this.scheduledDayOffColorLight,
      scheduledDayOffColorDark: this.scheduledDayOffColorDark,
      noContractColorLight: this.noContractColorLight,
      noContractColorDark: this.noContractColorDark,
    };
  }

  private persistSettings(): void {
    const obs = this.orgId
      ? this.appSettingsService.saveOrgSettings(this.buildCurrentSettings() as any, this.orgId)
      : this.appSettingsService.saveOrgSettings();
    obs.subscribe({
      next: () => this.notificationService.success(this.translate.instant('common.saved')),
      error: () => this.notificationService.error(this.translate.instant('common.error')),
    });
  }

  private reorderDays(): void {
    const all = ManageOrgSettingsComponent.ALL_DAYS;
    const start = this.weekStartDay;
    this.orderedDays = [...all.slice(start), ...all.slice(0, start)];
  }

  private loadHolidaysForRange(startDate: string, endDate: string): void {
    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();
    const years: number[] = [];
    for (let y = startYear; y <= endYear; y++) years.push(y);
    this.holidayService.loadHolidaysForYears(years).subscribe();
  }

  private groupHolidaysByYear(): void {
    const groups = new Map<number, HolidayInfo[]>();
    for (const h of this.holidays) {
      const year = new Date(h.date).getFullYear();
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year)!.push(h);
    }
    this.holidaysByYear = Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, holidays]) => ({ year, holidays }));
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  onDayToggle(jsIndex: number, checked: boolean): void {
    this.workingDays[jsIndex] = checked;
    if (!this.orgId) this.appSettingsService.setWorkingDays([...this.workingDays]);
    this.persistSettings();
  }

  onWeekStartDayChange(day: 0 | 1): void {
    this.weekStartDay = day;
    if (!this.orgId) this.appSettingsService.setWeekStartDay(day);
    this.reorderDays();
    this.persistSettings();
  }

  onColorChange(target: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    switch (target) {
      case 'nonWorkingDayLight': this.nonWorkingDayColorLight = value; break;
      case 'nonWorkingDayDark':  this.nonWorkingDayColorDark = value;  break;
      case 'holidayLight':       this.holidayColorLight = value;        break;
      case 'holidayDark':        this.holidayColorDark = value;         break;
      case 'scheduledDayOffLight': this.scheduledDayOffColorLight = value; break;
      case 'scheduledDayOffDark':  this.scheduledDayOffColorDark = value;  break;
      case 'noContractLight':    this.noContractColorLight = value;     break;
      case 'noContractDark':     this.noContractColorDark = value;      break;
    }
    if (!this.orgId) {
      this.appSettingsService.setNonWorkingDayColor(this.nonWorkingDayColorLight, this.nonWorkingDayColorDark);
      this.appSettingsService.setHolidayColor(this.holidayColorLight, this.holidayColorDark);
      this.appSettingsService.setScheduledDayOffColor(this.scheduledDayOffColorLight, this.scheduledDayOffColorDark);
      this.appSettingsService.setNoContractColor(this.noContractColorLight, this.noContractColorDark);
    }
    clearTimeout(this.colorSaveTimer);
    this.colorSaveTimer = setTimeout(() => this.persistSettings(), 400);
  }

  resetWorkingDays(): void {
    if (!this.orgId) {
      this.appSettingsService.resetWorkingDays();
      this.workingDays = [...this.appSettingsService.settings.workingDays];
    } else {
      this.workingDays = [false, true, true, true, true, true, false];
    }
    this.persistSettings();
  }

  resetColors(): void {
    const defaults = { nonWorkingDayColorLight: '#e0e0e0', nonWorkingDayColorDark: '#3a3a3a', holidayColorLight: '#ffcdd2', holidayColorDark: '#772727', scheduledDayOffColorLight: '#bdbdbd', scheduledDayOffColorDark: '#757575', noContractColorLight: '#9e9e9e', noContractColorDark: '#616161' };
    this.nonWorkingDayColorLight = defaults.nonWorkingDayColorLight;
    this.nonWorkingDayColorDark = defaults.nonWorkingDayColorDark;
    this.holidayColorLight = defaults.holidayColorLight;
    this.holidayColorDark = defaults.holidayColorDark;
    this.scheduledDayOffColorLight = defaults.scheduledDayOffColorLight;
    this.scheduledDayOffColorDark = defaults.scheduledDayOffColorDark;
    this.noContractColorLight = defaults.noContractColorLight;
    this.noContractColorDark = defaults.noContractColorDark;
    if (!this.orgId) this.appSettingsService.resetColors();
    this.persistSettings();
  }

  saveScheduleDateRange(): void {
    if (!this.isDateRangeValid) return;
    const startDate = this.formatDate(this.scheduleStartDateObj!);
    const endDate = this.formatDate(this.scheduleEndDateObj!);
    this.dateRangeSaving = true;
    this.dateRangeMessage = null;
    this.appSettingsService.saveDateRange(startDate, endDate).subscribe({
      next: (result) => {
        this.dateRangeSaving = false;
        this.dateRangeSuccess = result.success;
        this.dateRangeMessage = result.message;
        if (result.success) {
          this.holidaysLoading = true;
          this.holidayService.clearCache();
          this.loadHolidaysForRange(startDate, endDate);
        }
      },
      error: (err) => {
        this.dateRangeSaving = false;
        this.dateRangeSuccess = false;
        this.dateRangeMessage = `Error: ${err.message}`;
      }
    });
  }

  resetHolidays(): void {
    if (!this.scheduleStartDateObj || !this.scheduleEndDateObj) return;
    this.holidaysLoading = true;
    this.holidayService.clearCache();
    this.loadHolidaysForRange(
      this.formatDate(this.scheduleStartDateObj),
      this.formatDate(this.scheduleEndDateObj)
    );
  }

  addHolidayType(): void {
    const name = this.newTypeName.trim();
    if (!name) return;
    this.holidayTypeService.createType(name, this.newTypeColorLight, this.newTypeColorDark).subscribe({
      next: () => {
        this.newTypeName = '';
        this.newTypeColorLight = '#c8e6c9';
        this.newTypeColorDark = '#2e7d32';
      },
      error: () => this.notificationService.error(this.translate.instant('common.error'))
    });
  }

  onTypeNameChange(type: HolidayType, event: Event): void {
    const input = event.target as HTMLInputElement;
    const newName = input.value.trim();
    if (newName && newName !== type.name) {
      this.holidayTypeService.updateType(type.id, newName).subscribe();
    } else {
      input.value = type.name;
    }
  }

  onTypeColorLightChange(type: HolidayType, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.holidayTypeService.updateType(type.id, undefined, value).subscribe();
  }

  onTypeColorDarkChange(type: HolidayType, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.holidayTypeService.updateType(type.id, undefined, undefined, value).subscribe();
  }

  deleteHolidayType(type: HolidayType): void {
    this.holidayTypeService.deleteType(type.id).subscribe();
  }
}
