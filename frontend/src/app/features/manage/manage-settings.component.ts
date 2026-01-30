import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { HolidayService, HolidayInfo } from '../../core/services/holiday.service';

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
    MatProgressSpinnerModule
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
                *ngFor="let day of days"
                [checked]="workingDays[day.jsIndex]"
                (change)="onDayToggle(day.jsIndex, $event.checked)">
                {{ day.label }}
              </mat-checkbox>
            </div>
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
                <label for="nonWorkingDayColor">Non-working days</label>
                <div class="color-picker-wrapper">
                  <input
                    type="color"
                    id="nonWorkingDayColor"
                    [value]="nonWorkingDayColor"
                    (input)="onNonWorkingDayColorChange($event)">
                  <div class="color-preview" [style.background-color]="nonWorkingDayColor"></div>
                  <span class="color-value">{{ nonWorkingDayColor }}</span>
                </div>
              </div>

              <div class="color-setting">
                <label for="holidayColor">Holidays</label>
                <div class="color-picker-wrapper">
                  <input
                    type="color"
                    id="holidayColor"
                    [value]="holidayColor"
                    (input)="onHolidayColorChange($event)">
                  <div class="color-preview" [style.background-color]="holidayColor"></div>
                  <span class="color-value">{{ holidayColor }}</span>
                </div>
              </div>

              <div class="color-setting">
                <label for="workerHolidayColor">Personal holidays</label>
                <div class="color-picker-wrapper">
                  <input
                    type="color"
                    id="workerHolidayColor"
                    [value]="workerHolidayColor"
                    (input)="onWorkerHolidayColorChange($event)">
                  <div class="color-preview" [style.background-color]="workerHolidayColor"></div>
                  <span class="color-value">{{ workerHolidayColor }}</span>
                </div>
              </div>
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

    .color-setting label {
      font-size: 14px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .color-picker-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .color-picker-wrapper input[type="color"] {
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      padding: 0;
      background: transparent;
    }

    .color-picker-wrapper input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    .color-picker-wrapper input[type="color"]::-webkit-color-swatch {
      border: 2px solid var(--mat-sys-outline);
      border-radius: 6px;
    }

    .color-preview {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid var(--mat-sys-outline-variant);
    }

    .color-value {
      font-family: monospace;
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      min-width: 70px;
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
  `]
})
export class ManageSettingsComponent implements OnInit {
  // Days ordered Monday to Sunday for display
  days: DayConfig[] = [
    { label: 'Monday', jsIndex: 1 },
    { label: 'Tuesday', jsIndex: 2 },
    { label: 'Wednesday', jsIndex: 3 },
    { label: 'Thursday', jsIndex: 4 },
    { label: 'Friday', jsIndex: 5 },
    { label: 'Saturday', jsIndex: 6 },
    { label: 'Sunday', jsIndex: 0 }
  ];

  workingDays: boolean[];
  nonWorkingDayColor: string;
  holidayColor: string;
  workerHolidayColor: string;

  holidays: HolidayInfo[] = [];
  holidaysByYear: HolidayYearGroup[] = [];
  holidaysLoading = true;

  constructor(
    private appSettingsService: AppSettingsService,
    private holidayService: HolidayService
  ) {
    this.workingDays = [...this.appSettingsService.settings.workingDays];
    this.nonWorkingDayColor = this.appSettingsService.settings.nonWorkingDayColor;
    this.holidayColor = this.appSettingsService.settings.holidayColor;
    this.workerHolidayColor = this.appSettingsService.settings.workerHolidayColor;

    this.appSettingsService.settings$.subscribe(settings => {
      this.workingDays = [...settings.workingDays];
      this.nonWorkingDayColor = settings.nonWorkingDayColor;
      this.holidayColor = settings.holidayColor;
      this.workerHolidayColor = settings.workerHolidayColor;
    });
  }

  onDayToggle(jsIndex: number, checked: boolean): void {
    this.workingDays[jsIndex] = checked;
    this.appSettingsService.setWorkingDays([...this.workingDays]);
  }

  onNonWorkingDayColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.nonWorkingDayColor = input.value;
    this.appSettingsService.setNonWorkingDayColor(input.value);
  }

  onHolidayColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.holidayColor = input.value;
    this.appSettingsService.setHolidayColor(input.value);
  }

  onWorkerHolidayColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.workerHolidayColor = input.value;
    this.appSettingsService.setWorkerHolidayColor(input.value);
  }

  ngOnInit(): void {
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
