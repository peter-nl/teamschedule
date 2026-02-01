import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { HolidayService, HolidayInfo } from '../../core/services/holiday.service';
import { HolidayTypeService, HolidayType } from '../../core/services/holiday-type.service';

interface DayConfig {
  label: string;
  jsIndex: number; // JavaScript Date.getDay() index (0=Sun, 1=Mon, etc.)
}

interface HolidayYearGroup {
  year: number;
  holidays: HolidayInfo[];
}

@Component({
  selector: 'app-manage-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <div class="settings-container">
      <mat-card class="settings-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>settings</mat-icon>
          <mat-card-title>Application Settings</mat-card-title>
          <mat-card-subtitle>Configure application-wide settings</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="settings-section">
            <div class="section-header">
              <div>
                <h3>Working Days</h3>
                <p class="section-description">Select which days are working days. Non-working days will be highlighted in the schedule.</p>
              </div>
              <button mat-button class="reset-button" (click)="resetWorkingDays()">
                <mat-icon>restart_alt</mat-icon> Reset
              </button>
            </div>

            <div class="days-grid">
              <mat-checkbox
                *ngFor="let day of orderedDays"
                [checked]="workingDays[day.jsIndex]"
                (change)="onDayToggle(day.jsIndex, $event.checked)">
                {{ day.label }}
              </mat-checkbox>
            </div>

            <mat-form-field appearance="outline" class="week-start-field">
              <mat-label>Week starts on</mat-label>
              <mat-select [value]="weekStartDay" (selectionChange)="onWeekStartDayChange($event.value)">
                <mat-option [value]="1">Monday</mat-option>
                <mat-option [value]="0">Sunday</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-divider></mat-divider>

          <div class="settings-section">
            <div class="section-header">
              <div>
                <h3>Schedule Colors</h3>
                <p class="section-description">Customize the appearance of special days in the schedule.</p>
              </div>
              <button mat-button class="reset-button" (click)="resetColors()">
                <mat-icon>restart_alt</mat-icon> Reset
              </button>
            </div>

            <div class="color-settings">
              <div class="color-setting">
                <span class="color-setting-label">Non-working days</span>
                <div class="color-setting-pickers">
                  <div class="color-pair">
                    <label>Light</label>
                    <input type="color" [value]="nonWorkingDayColorLight"
                      (input)="onColorChange('nonWorkingDayLight', $event)">
                    <div class="color-preview-small" [style.background-color]="nonWorkingDayColorLight"></div>
                  </div>
                  <div class="color-pair">
                    <label>Dark</label>
                    <input type="color" [value]="nonWorkingDayColorDark"
                      (input)="onColorChange('nonWorkingDayDark', $event)">
                    <div class="color-preview-small" [style.background-color]="nonWorkingDayColorDark"></div>
                  </div>
                </div>
              </div>

              <div class="color-setting">
                <span class="color-setting-label">Public holidays</span>
                <div class="color-setting-pickers">
                  <div class="color-pair">
                    <label>Light</label>
                    <input type="color" [value]="holidayColorLight"
                      (input)="onColorChange('holidayLight', $event)">
                    <div class="color-preview-small" [style.background-color]="holidayColorLight"></div>
                  </div>
                  <div class="color-pair">
                    <label>Dark</label>
                    <input type="color" [value]="holidayColorDark"
                      (input)="onColorChange('holidayDark', $event)">
                    <div class="color-preview-small" [style.background-color]="holidayColorDark"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="settings-section">
            <div class="section-header">
              <div>
                <h3>Holiday Types</h3>
                <p class="section-description">Define holiday types with separate colors for light and dark themes. These are used when workers log personal holidays.</p>
              </div>
            </div>

            <div class="holiday-types-list">
              <div *ngFor="let type of holidayTypes" class="holiday-type-row">
                <span class="holiday-type-name">{{ type.name }}</span>
                <div class="holiday-type-colors">
                  <div class="color-pair">
                    <label>Light</label>
                    <input type="color" [value]="type.colorLight"
                      (input)="onTypeColorLightChange(type, $event)">
                    <div class="color-preview-small" [style.background-color]="type.colorLight"></div>
                  </div>
                  <div class="color-pair">
                    <label>Dark</label>
                    <input type="color" [value]="type.colorDark"
                      (input)="onTypeColorDarkChange(type, $event)">
                    <div class="color-preview-small" [style.background-color]="type.colorDark"></div>
                  </div>
                </div>
                <button mat-icon-button (click)="deleteHolidayType(type)" class="delete-type-button">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>

            <div class="add-holiday-type-form">
              <mat-form-field appearance="outline" class="type-name-field">
                <mat-label>New type name</mat-label>
                <input matInput [(ngModel)]="newTypeName" placeholder="e.g. Ziekte">
              </mat-form-field>
              <div class="color-pair">
                <label>Light</label>
                <input type="color" [(ngModel)]="newTypeColorLight">
                <div class="color-preview-small" [style.background-color]="newTypeColorLight"></div>
              </div>
              <div class="color-pair">
                <label>Dark</label>
                <input type="color" [(ngModel)]="newTypeColorDark">
                <div class="color-preview-small" [style.background-color]="newTypeColorDark"></div>
              </div>
              <button mat-button color="primary" (click)="addHolidayType()" [disabled]="!newTypeName.trim()">
                <mat-icon>add</mat-icon> Add
              </button>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="settings-section">
            <div class="section-header">
              <div>
                <h3>Public Holidays (Netherlands)</h3>
                <p class="section-description">Holidays retrieved from the Nager.Date API. These are highlighted in the schedule.</p>
              </div>
              <button mat-button class="reset-button" (click)="resetHolidays()">
                <mat-icon>restart_alt</mat-icon> Reload
              </button>
            </div>

            <div *ngIf="holidaysLoading" class="holidays-loading">
              <mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner>
              <span>Loading holidays...</span>
            </div>

            <div *ngIf="!holidaysLoading && holidays.length === 0" class="holidays-empty">
              No holidays loaded.
            </div>

            <div *ngIf="!holidaysLoading && holidays.length > 0" class="holidays-list">
              <div *ngFor="let yearGroup of holidaysByYear" class="holiday-year-group">
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
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .settings-card {
      border-radius: 16px;
    }

    mat-card-header {
      margin-bottom: 16px;
    }

    mat-card-header mat-icon[mat-card-avatar] {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--mat-sys-primary);
    }

    .settings-section {
      padding: 16px 0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .reset-button {
      flex-shrink: 0;
      color: var(--mat-sys-on-surface-variant);
    }

    .settings-section h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .section-description {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
    }

    .days-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }

    .days-grid mat-checkbox {
      min-width: 110px;
    }

    .week-start-field {
      margin-top: 16px;
      width: 200px;
    }

    mat-card-actions {
      padding: 16px;
    }

    .color-settings {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .color-setting {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--mat-sys-surface-container-low);
      border-radius: 8px;
    }

    .color-setting-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
      min-width: 120px;
      flex: 1;
    }

    .color-setting-pickers {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .holidays-loading {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 0;
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
    }

    .holidays-empty {
      padding: 16px 0;
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
    }

    .holiday-year-group h4 {
      margin: 16px 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
    }

    .holiday-year-group:first-child h4 {
      margin-top: 0;
    }

    .holiday-items {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .holiday-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 6px 12px;
      background: var(--mat-sys-surface-container-low);
      border-radius: 8px;
      font-size: 14px;
    }

    .holiday-date {
      min-width: 120px;
      color: var(--mat-sys-on-surface-variant);
      font-weight: 500;
    }

    .holiday-name {
      color: var(--mat-sys-on-surface);
    }

    .holiday-types-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .holiday-type-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 12px;
      background: var(--mat-sys-surface-container-low);
      border-radius: 8px;
    }

    .holiday-type-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
      min-width: 120px;
      flex: 1;
    }

    .holiday-type-colors {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .color-pair {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .color-pair label {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      min-width: 32px;
    }

    .color-pair input[type="color"] {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      padding: 0;
      background: transparent;
    }

    .color-pair input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    .color-pair input[type="color"]::-webkit-color-swatch {
      border: 2px solid var(--mat-sys-outline);
      border-radius: 4px;
    }

    .color-preview-small {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid var(--mat-sys-outline-variant);
    }

    .delete-type-button {
      color: var(--mat-sys-error);
    }

    .add-holiday-type-form {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0;
    }

    .type-name-field {
      flex: 1;
    }
  `]
})
export class ManageSettingsComponent implements OnInit {
  private static readonly ALL_DAYS: DayConfig[] = [
    { label: 'Sunday', jsIndex: 0 },
    { label: 'Monday', jsIndex: 1 },
    { label: 'Tuesday', jsIndex: 2 },
    { label: 'Wednesday', jsIndex: 3 },
    { label: 'Thursday', jsIndex: 4 },
    { label: 'Friday', jsIndex: 5 },
    { label: 'Saturday', jsIndex: 6 }
  ];

  orderedDays: DayConfig[] = [];
  weekStartDay: 0 | 1 = 1;

  workingDays: boolean[];
  nonWorkingDayColorLight: string;
  nonWorkingDayColorDark: string;
  holidayColorLight: string;
  holidayColorDark: string;

  holidays: HolidayInfo[] = [];
  holidaysByYear: HolidayYearGroup[] = [];
  holidaysLoading = true;

  // Holiday types
  holidayTypes: HolidayType[] = [];
  newTypeName = '';
  newTypeColorLight = '#c8e6c9';
  newTypeColorDark = '#2e7d32';

  constructor(
    private appSettingsService: AppSettingsService,
    private holidayService: HolidayService,
    private holidayTypeService: HolidayTypeService
  ) {
    const s = this.appSettingsService.settings;
    this.workingDays = [...s.workingDays];
    this.nonWorkingDayColorLight = s.nonWorkingDayColorLight;
    this.nonWorkingDayColorDark = s.nonWorkingDayColorDark;
    this.holidayColorLight = s.holidayColorLight;
    this.holidayColorDark = s.holidayColorDark;
    this.weekStartDay = s.weekStartDay;
    this.reorderDays();

    this.appSettingsService.settings$.subscribe(settings => {
      this.workingDays = [...settings.workingDays];
      this.nonWorkingDayColorLight = settings.nonWorkingDayColorLight;
      this.nonWorkingDayColorDark = settings.nonWorkingDayColorDark;
      this.holidayColorLight = settings.holidayColorLight;
      this.holidayColorDark = settings.holidayColorDark;
      this.weekStartDay = settings.weekStartDay;
      this.reorderDays();
    });
  }

  onDayToggle(jsIndex: number, checked: boolean): void {
    this.workingDays[jsIndex] = checked;
    this.appSettingsService.setWorkingDays([...this.workingDays]);
  }

  onWeekStartDayChange(day: 0 | 1): void {
    this.appSettingsService.setWeekStartDay(day);
  }

  private reorderDays(): void {
    const allDays = ManageSettingsComponent.ALL_DAYS;
    const startIndex = this.weekStartDay;
    this.orderedDays = [
      ...allDays.slice(startIndex),
      ...allDays.slice(0, startIndex)
    ];
  }

  onColorChange(target: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    switch (target) {
      case 'nonWorkingDayLight':
        this.nonWorkingDayColorLight = value;
        this.appSettingsService.setNonWorkingDayColor(this.nonWorkingDayColorLight, this.nonWorkingDayColorDark);
        break;
      case 'nonWorkingDayDark':
        this.nonWorkingDayColorDark = value;
        this.appSettingsService.setNonWorkingDayColor(this.nonWorkingDayColorLight, this.nonWorkingDayColorDark);
        break;
      case 'holidayLight':
        this.holidayColorLight = value;
        this.appSettingsService.setHolidayColor(this.holidayColorLight, this.holidayColorDark);
        break;
      case 'holidayDark':
        this.holidayColorDark = value;
        this.appSettingsService.setHolidayColor(this.holidayColorLight, this.holidayColorDark);
        break;
    }
  }

  ngOnInit(): void {
    // Load holiday types
    this.holidayTypeService.types$.subscribe(types => {
      this.holidayTypes = types;
    });
    this.holidayTypeService.loadTypes().subscribe();
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1];

    this.holidayService.holidays$.subscribe(holidaysMap => {
      this.holidays = Array.from(holidaysMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      this.groupHolidaysByYear();
      this.holidaysLoading = false;
    });

    this.holidayService.loadHolidaysForYears(years).subscribe();
  }

  private groupHolidaysByYear(): void {
    const groups = new Map<number, HolidayInfo[]>();
    for (const holiday of this.holidays) {
      const year = new Date(holiday.date).getFullYear();
      if (!groups.has(year)) {
        groups.set(year, []);
      }
      groups.get(year)!.push(holiday);
    }
    this.holidaysByYear = Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, holidays]) => ({ year, holidays }));
  }

  addHolidayType(): void {
    const name = this.newTypeName.trim();
    if (!name) return;
    this.holidayTypeService.createType(name, this.newTypeColorLight, this.newTypeColorDark).subscribe(() => {
      this.newTypeName = '';
      this.newTypeColorLight = '#c8e6c9';
      this.newTypeColorDark = '#2e7d32';
    });
  }

  onTypeColorLightChange(type: HolidayType, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.holidayTypeService.updateType(type.id, undefined, input.value).subscribe();
  }

  onTypeColorDarkChange(type: HolidayType, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.holidayTypeService.updateType(type.id, undefined, undefined, input.value).subscribe();
  }

  deleteHolidayType(type: HolidayType): void {
    this.holidayTypeService.deleteType(type.id).subscribe();
  }

  resetWorkingDays(): void {
    this.appSettingsService.resetWorkingDays();
  }

  resetColors(): void {
    this.appSettingsService.resetColors();
  }

  resetHolidays(): void {
    this.holidaysLoading = true;
    this.holidayService.clearCache();
    const currentYear = new Date().getFullYear();
    this.holidayService.loadHolidaysForYears([currentYear, currentYear + 1]).subscribe();
  }
}
