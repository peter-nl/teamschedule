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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { HolidayService, HolidayInfo } from '../../core/services/holiday.service';
import { HolidayTypeService, HolidayType } from '../../core/services/holiday-type.service';

const LOAD_EMAIL_CONFIG = gql`
  query EmailConfig {
    emailConfig { host port secure user from configured }
  }
`;

const SAVE_EMAIL_CONFIG = gql`
  mutation SaveEmailConfig($host: String!, $port: Int!, $secure: Boolean!, $user: String!, $password: String!, $from: String!) {
    saveEmailConfig(host: $host, port: $port, secure: $secure, user: $user, password: $password, from: $from) {
      success message
    }
  }
`;

const TEST_EMAIL_CONFIG = gql`
  mutation TestEmailConfig($testAddress: String!) {
    testEmailConfig(testAddress: $testAddress) { success message }
  }
`;

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
    MatSelectModule,
    MatDatepickerModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="settings-container">
      <mat-card class="settings-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>settings</mat-icon>
          <mat-card-title>{{ 'settings.title' | translate }}</mat-card-title>
          <mat-card-subtitle>{{ 'settings.subtitle' | translate }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>

          <!-- Schedule Date Range (first section) -->
          <div class="settings-section">
            <div class="section-header">
              <div>
                <h3>{{ 'settings.dateRange.title' | translate }}</h3>
                <p class="section-description">{{ 'settings.dateRange.description' | translate }}</p>
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
                <mat-spinner *ngIf="dateRangeSaving" diameter="18"></mat-spinner>
                <mat-icon *ngIf="!dateRangeSaving">save</mat-icon>
              </button>
            </div>

            <div *ngIf="dateRangeMessage" class="email-status"
                 [class.success]="dateRangeSuccess" [class.error]="!dateRangeSuccess">
              <mat-icon>{{ dateRangeSuccess ? 'check_circle' : 'error' }}</mat-icon>
              {{ dateRangeMessage }}
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Public Holidays (moved up, right after date range) -->
          <div class="settings-section">
            <div class="section-header">
              <div>
                <h3>{{ 'settings.holidays.title' | translate }}</h3>
                <p class="section-description">{{ 'settings.holidays.description' | translate }}</p>
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

          <div class="settings-section">
            <div class="section-header">
              <div>
                <h3>{{ 'settings.workingDays.title' | translate }}</h3>
                <p class="section-description">{{ 'settings.workingDays.description' | translate }}</p>
              </div>
              <button mat-icon-button (click)="resetWorkingDays()" [matTooltip]="'common.reset' | translate">
                <mat-icon>restart_alt</mat-icon>
              </button>
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

          <div class="settings-section">
            <div class="section-header">
              <div>
                <h3>{{ 'settings.colors.title' | translate }}</h3>
                <p class="section-description">{{ 'settings.colors.description' | translate }}</p>
              </div>
              <button mat-icon-button (click)="resetColors()" [matTooltip]="'common.reset' | translate">
                <mat-icon>restart_alt</mat-icon>
              </button>
            </div>

            <div class="color-settings">
              <div class="color-setting">
                <span class="color-setting-label">{{ 'settings.colors.nonWorkingDays' | translate }}</span>
                <div class="color-setting-pickers">
                  <div class="color-pair">
                    <label>{{ 'common.light' | translate }}</label>
                    <input type="color" [value]="nonWorkingDayColorLight"
                      (input)="onColorChange('nonWorkingDayLight', $event)">
                    <div class="color-preview-small" [style.background-color]="nonWorkingDayColorLight"></div>
                  </div>
                  <div class="color-pair">
                    <label>{{ 'common.dark' | translate }}</label>
                    <input type="color" [value]="nonWorkingDayColorDark"
                      (input)="onColorChange('nonWorkingDayDark', $event)">
                    <div class="color-preview-small" [style.background-color]="nonWorkingDayColorDark"></div>
                  </div>
                </div>
              </div>

              <div class="color-setting">
                <span class="color-setting-label">{{ 'settings.colors.publicHolidays' | translate }}</span>
                <div class="color-setting-pickers">
                  <div class="color-pair">
                    <label>{{ 'common.light' | translate }}</label>
                    <input type="color" [value]="holidayColorLight"
                      (input)="onColorChange('holidayLight', $event)">
                    <div class="color-preview-small" [style.background-color]="holidayColorLight"></div>
                  </div>
                  <div class="color-pair">
                    <label>{{ 'common.dark' | translate }}</label>
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
                <h3>{{ 'settings.holidayTypes.title' | translate }}</h3>
                <p class="section-description">{{ 'settings.holidayTypes.description' | translate }}</p>
              </div>
            </div>

            <div class="holiday-types-list">
              <div *ngFor="let type of holidayTypes" class="holiday-type-row">
                <input class="holiday-type-name-input" [value]="type.name"
                       (blur)="onTypeNameChange(type, $event)"
                       (keydown.enter)="$any($event.target).blur()">
                <div class="holiday-type-colors">
                  <div class="color-pair">
                    <label>{{ 'common.light' | translate }}</label>
                    <input type="color" [value]="type.colorLight"
                      (input)="onTypeColorLightChange(type, $event)">
                    <div class="color-preview-small" [style.background-color]="type.colorLight"></div>
                  </div>
                  <div class="color-pair">
                    <label>{{ 'common.dark' | translate }}</label>
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
                <mat-label>{{ 'settings.holidayTypes.newTypeName' | translate }}</mat-label>
                <input matInput [(ngModel)]="newTypeName" [placeholder]="'settings.holidayTypes.newTypePlaceholder' | translate">
              </mat-form-field>
              <div class="color-pair">
                <label>{{ 'common.light' | translate }}</label>
                <input type="color" [(ngModel)]="newTypeColorLight">
                <div class="color-preview-small" [style.background-color]="newTypeColorLight"></div>
              </div>
              <div class="color-pair">
                <label>{{ 'common.dark' | translate }}</label>
                <input type="color" [(ngModel)]="newTypeColorDark">
                <div class="color-preview-small" [style.background-color]="newTypeColorDark"></div>
              </div>
              <button mat-icon-button color="primary" (click)="addHolidayType()" [disabled]="!newTypeName.trim()" [matTooltip]="'common.add' | translate">
                <mat-icon>add</mat-icon>
              </button>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="settings-section">
            <div class="section-header">
              <div>
                <h3>{{ 'settings.email.title' | translate }}</h3>
                <p class="section-description">{{ 'settings.email.description' | translate }}</p>
              </div>
            </div>

            <div class="email-config-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'settings.email.smtpHost' | translate }}</mat-label>
                <input matInput [(ngModel)]="emailConfig.host" name="smtpHost" [placeholder]="'settings.email.smtpHostPlaceholder' | translate">
              </mat-form-field>

              <div class="email-row">
                <mat-form-field appearance="outline" class="port-field">
                  <mat-label>{{ 'settings.email.port' | translate }}</mat-label>
                  <input matInput type="number" [(ngModel)]="emailConfig.port" name="smtpPort">
                </mat-form-field>
                <mat-form-field appearance="outline" class="encryption-field">
                  <mat-label>{{ 'settings.email.encryption' | translate }}</mat-label>
                  <mat-select [(ngModel)]="emailConfig.encryption" name="smtpEncryption">
                    <mat-option value="starttls">{{ 'settings.email.starttls' | translate }}</mat-option>
                    <mat-option value="ssl">{{ 'settings.email.ssl' | translate }}</mat-option>
                    <mat-option value="none">{{ 'settings.email.none' | translate }}</mat-option>
                  </mat-select>
                  <mat-hint>{{ encryptionHint }}</mat-hint>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'settings.email.username' | translate }}</mat-label>
                <input matInput [(ngModel)]="emailConfig.user" name="smtpUser">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'settings.email.password' | translate }}</mat-label>
                <input matInput type="password" [(ngModel)]="emailConfig.password" name="smtpPass"
                       [placeholder]="'settings.email.passwordPlaceholder' | translate">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'settings.email.fromAddress' | translate }}</mat-label>
                <input matInput [(ngModel)]="emailConfig.from" name="smtpFrom" [placeholder]="'settings.email.fromPlaceholder' | translate">
              </mat-form-field>

              <div class="email-actions">
                <button mat-icon-button color="primary" (click)="saveEmailConfig()"
                        [disabled]="emailSaving || !emailConfig.host || !emailConfig.user || !emailConfig.password"
                        [matTooltip]="'settings.email.saveConfig' | translate">
                  <mat-spinner *ngIf="emailSaving" diameter="18"></mat-spinner>
                  <mat-icon *ngIf="!emailSaving">save</mat-icon>
                </button>
                <button mat-icon-button (click)="testEmailConfig()" [disabled]="emailTesting || !emailConfigured"
                        [matTooltip]="'settings.email.sendTest' | translate">
                  <mat-spinner *ngIf="emailTesting" diameter="18"></mat-spinner>
                  <mat-icon *ngIf="!emailTesting">send</mat-icon>
                </button>
              </div>

              <div *ngIf="emailStatusMessage" class="email-status"
                   [class.success]="emailStatusSuccess" [class.error]="!emailStatusSuccess">
                <mat-icon>{{ emailStatusSuccess ? 'check_circle' : 'error' }}</mat-icon>
                {{ emailStatusMessage }}
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

    /* Date Range */
    .date-range-form {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .date-field {
      width: 220px;
    }

    /* Public Holidays horizontal columns */
    .holidays-columns-scroll {
      overflow-x: auto;
      padding-bottom: 8px;
    }

    .holidays-columns {
      display: flex;
      gap: 24px;
      min-width: min-content;
    }

    .holiday-year-column {
      min-width: 220px;
      flex-shrink: 0;
    }

    .holiday-year-column h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      position: sticky;
      top: 0;
      background: var(--mat-sys-surface);
      padding: 4px 0;
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

    .holiday-items {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .holiday-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 12px;
      background: var(--mat-sys-surface-container-low);
      border-radius: 8px;
      font-size: 13px;
    }

    .holiday-date {
      min-width: 100px;
      color: var(--mat-sys-on-surface-variant);
      font-weight: 500;
    }

    .holiday-name {
      color: var(--mat-sys-on-surface);
    }

    /* Days grid */
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

    .holiday-type-name-input {
      font-size: 14px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
      min-width: 120px;
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      padding: 4px 0;
      font-family: inherit;
      border-bottom: 1px solid transparent;
    }

    .holiday-type-name-input:hover {
      border-bottom-color: var(--mat-sys-outline-variant);
    }

    .holiday-type-name-input:focus {
      border-bottom-color: var(--mat-sys-primary);
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

    .email-config-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .full-width {
      width: 100%;
    }

    .email-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .port-field {
      width: 120px;
    }

    .encryption-field {
      flex: 1;
    }

    .email-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 8px;
    }

    .email-actions mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    .email-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 8px;
      margin-top: 12px;
      font-size: 14px;
    }

    .email-status.success {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }

    .email-status.error {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
  `]
})
export class ManageSettingsComponent implements OnInit {
  private static readonly ALL_DAYS: DayConfig[] = [
    { label: 'days.sunday', jsIndex: 0 },
    { label: 'days.monday', jsIndex: 1 },
    { label: 'days.tuesday', jsIndex: 2 },
    { label: 'days.wednesday', jsIndex: 3 },
    { label: 'days.thursday', jsIndex: 4 },
    { label: 'days.friday', jsIndex: 5 },
    { label: 'days.saturday', jsIndex: 6 }
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

  // Schedule date range
  scheduleStartDate = '';
  scheduleEndDate = '';
  scheduleStartDateObj: Date | null = null;
  scheduleEndDateObj: Date | null = null;
  dateRangeSaving = false;
  dateRangeMessage: string | null = null;
  dateRangeSuccess = false;

  // Holiday types
  holidayTypes: HolidayType[] = [];
  newTypeName = '';
  newTypeColorLight = '#c8e6c9';
  newTypeColorDark = '#2e7d32';

  // Email config
  emailConfig = { host: '', port: 587, encryption: 'starttls' as 'starttls' | 'ssl' | 'none', user: '', password: '', from: '' };
  emailConfigured = false;

  get encryptionHint(): string {
    switch (this.emailConfig.encryption) {
      case 'starttls': return this.translate.instant('settings.email.starttlsHint');
      case 'ssl': return this.translate.instant('settings.email.sslHint');
      case 'none': return this.translate.instant('settings.email.noneHint');
    }
  }
  emailSaving = false;
  emailTesting = false;
  emailStatusMessage: string | null = null;
  emailStatusSuccess = false;

  get isDateRangeValid(): boolean {
    if (!this.scheduleStartDateObj || !this.scheduleEndDateObj) return false;
    return this.scheduleStartDateObj < this.scheduleEndDateObj;
  }

  constructor(
    private appSettingsService: AppSettingsService,
    private holidayService: HolidayService,
    private holidayTypeService: HolidayTypeService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
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
    // Load schedule date range
    this.appSettingsService.loadDateRange().subscribe(range => {
      this.scheduleStartDate = range.startDate;
      this.scheduleEndDate = range.endDate;
      this.scheduleStartDateObj = new Date(range.startDate + 'T00:00:00');
      this.scheduleEndDateObj = new Date(range.endDate + 'T00:00:00');
      // Load holidays for the configured date range years
      this.loadHolidaysForRange(range.startDate, range.endDate);
    });

    // Load holiday types
    this.holidayTypeService.types$.subscribe(types => {
      this.holidayTypes = types;
    });
    this.holidayTypeService.loadTypes().subscribe();

    this.holidayService.holidays$.subscribe(holidaysMap => {
      this.holidays = Array.from(holidaysMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      this.groupHolidaysByYear();
      this.holidaysLoading = false;
    });

    // Load email config
    this.loadEmailConfig();
  }

  private loadHolidaysForRange(startDate: string, endDate: string): void {
    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();
    const years: number[] = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    this.holidayService.loadHolidaysForYears(years).subscribe();
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  saveScheduleDateRange(): void {
    if (!this.isDateRangeValid) return;

    this.scheduleStartDate = this.formatDate(this.scheduleStartDateObj!);
    this.scheduleEndDate = this.formatDate(this.scheduleEndDateObj!);

    const proceed = window.confirm(this.translate.instant('settings.dateRange.confirmDelete'));
    if (!proceed) return;

    this.dateRangeSaving = true;
    this.dateRangeMessage = null;
    this.appSettingsService.saveDateRange(this.scheduleStartDate, this.scheduleEndDate).subscribe({
      next: (result) => {
        this.dateRangeSaving = false;
        this.dateRangeSuccess = result.success;
        this.dateRangeMessage = result.message;
        if (result.success) {
          // Reload public holidays for the new range
          this.holidaysLoading = true;
          this.holidayService.clearCache();
          this.loadHolidaysForRange(this.scheduleStartDate, this.scheduleEndDate);
        }
      },
      error: (err) => {
        this.dateRangeSaving = false;
        this.dateRangeSuccess = false;
        this.dateRangeMessage = `Error: ${err.message}`;
      }
    });
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
    this.loadHolidaysForRange(this.scheduleStartDate, this.scheduleEndDate);
  }

  private loadEmailConfig(): void {
    apolloClient.query({ query: LOAD_EMAIL_CONFIG, fetchPolicy: 'network-only' }).then(result => {
      const config = (result.data as any).emailConfig;
      if (config) {
        this.emailConfig.host = config.host;
        this.emailConfig.port = config.port;
        this.emailConfig.encryption = config.secure ? 'ssl' : (config.port === 25 ? 'none' : 'starttls');
        this.emailConfig.user = config.user;
        this.emailConfig.from = config.from;
        this.emailConfigured = config.configured;
      }
    }).catch(() => {});
  }

  saveEmailConfig(): void {
    this.emailSaving = true;
    this.emailStatusMessage = null;
    apolloClient.mutate({
      mutation: SAVE_EMAIL_CONFIG,
      variables: {
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.encryption === 'ssl',
        user: this.emailConfig.user,
        password: this.emailConfig.password,
        from: this.emailConfig.from,
      }
    }).then(result => {
      this.emailSaving = false;
      const res = (result.data as any).saveEmailConfig;
      this.emailStatusSuccess = res.success;
      this.emailStatusMessage = res.message;
      if (res.success) {
        this.emailConfigured = true;
        this.emailConfig.password = '';
      }
    }).catch(err => {
      this.emailSaving = false;
      this.emailStatusSuccess = false;
      this.emailStatusMessage = `Error: ${err.message}`;
    });
  }

  testEmailConfig(): void {
    const testAddress = window.prompt(this.translate.instant('settings.email.testPrompt'));
    if (!testAddress) return;
    this.emailTesting = true;
    this.emailStatusMessage = null;
    apolloClient.mutate({
      mutation: TEST_EMAIL_CONFIG,
      variables: { testAddress }
    }).then(result => {
      this.emailTesting = false;
      const res = (result.data as any).testEmailConfig;
      this.emailStatusSuccess = res.success;
      this.emailStatusMessage = res.message;
    }).catch(err => {
      this.emailTesting = false;
      this.emailStatusSuccess = false;
      this.emailStatusMessage = `Error: ${err.message}`;
    });
  }
}
