import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, map, tap } from 'rxjs';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';

export interface AppSettings {
  workingDays: boolean[]; // Index 0 = Sunday, 1 = Monday, ..., 6 = Saturday (matches JS Date.getDay())
  nonWorkingDayColorLight: string;
  nonWorkingDayColorDark: string;
  holidayColorLight: string;
  holidayColorDark: string;
  scheduledDayOffColorLight: string;
  scheduledDayOffColorDark: string;
  noContractColorLight: string;
  noContractColorDark: string;
  weekStartDay: 0 | 1; // 0 = Sunday, 1 = Monday
}

export interface ScheduleDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

const DEFAULT_SETTINGS: AppSettings = {
  workingDays: [false, true, true, true, true, true, false], // Sun=off, Mon-Fri=on, Sat=off
  nonWorkingDayColorLight: '#e0e0e0',
  nonWorkingDayColorDark: '#3a3a3a',
  holidayColorLight: '#ffcdd2',
  holidayColorDark: '#772727',
  scheduledDayOffColorLight: '#bdbdbd',
  scheduledDayOffColorDark: '#757575',
  noContractColorLight: '#9e9e9e',
  noContractColorDark: '#616161',
  weekStartDay: 1 // Monday
};

const STORAGE_KEY = 'teamschedule-app-settings';

const SCHEDULE_DATE_RANGE_QUERY = gql`
  query ScheduleDateRange {
    scheduleDateRange { startDate endDate }
  }
`;

const SAVE_SCHEDULE_DATE_RANGE_MUTATION = gql`
  mutation SaveScheduleDateRange($startDate: String!, $endDate: String!) {
    saveScheduleDateRange(startDate: $startDate, endDate: $endDate) {
      success message deletedCount
    }
  }
`;

function getDefaultDateRange(): ScheduleDateRange {
  const now = new Date();
  return {
    startDate: `${now.getFullYear() - 1}-01-01`,
    endDate: `${now.getFullYear() + 1}-12-31`,
  };
}

@Injectable({
  providedIn: 'root'
})
export class AppSettingsService {
  private settingsSubject = new BehaviorSubject<AppSettings>(DEFAULT_SETTINGS);
  public settings$ = this.settingsSubject.asObservable();

  private dateRangeSubject = new BehaviorSubject<ScheduleDateRange>(getDefaultDateRange());
  public dateRange$ = this.dateRangeSubject.asObservable();

  constructor() {
    this.loadSettings();
  }

  get settings(): AppSettings {
    return this.settingsSubject.value;
  }

  get dateRange(): ScheduleDateRange {
    return this.dateRangeSubject.value;
  }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const settings = { ...DEFAULT_SETTINGS, ...parsed };
        this.settingsSubject.next(settings);
      }
    } catch (e) {
      console.warn('Failed to load app settings from localStorage:', e);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settingsSubject.value));
    } catch (e) {
      console.warn('Failed to save app settings to localStorage:', e);
    }
  }

  loadDateRange(): Observable<ScheduleDateRange> {
    return from(
      apolloClient.query({ query: SCHEDULE_DATE_RANGE_QUERY, fetchPolicy: 'network-only' })
    ).pipe(
      map((result: any) => result.data.scheduleDateRange as ScheduleDateRange),
      tap(range => this.dateRangeSubject.next(range))
    );
  }

  saveDateRange(startDate: string, endDate: string): Observable<{ success: boolean; message: string; deletedCount: number }> {
    return from(
      apolloClient.mutate({
        mutation: SAVE_SCHEDULE_DATE_RANGE_MUTATION,
        variables: { startDate, endDate }
      })
    ).pipe(
      map((result: any) => result.data.saveScheduleDateRange),
      tap(res => {
        if (res.success) {
          this.dateRangeSubject.next({ startDate, endDate });
        }
      })
    );
  }

  setWorkingDays(workingDays: boolean[]): void {
    const current = this.settingsSubject.value;
    this.settingsSubject.next({ ...current, workingDays });
    this.saveSettings();
  }

  isWorkingDay(dayOfWeek: number): boolean {
    return this.settingsSubject.value.workingDays[dayOfWeek];
  }

  setNonWorkingDayColor(colorLight: string, colorDark: string): void {
    const current = this.settingsSubject.value;
    this.settingsSubject.next({ ...current, nonWorkingDayColorLight: colorLight, nonWorkingDayColorDark: colorDark });
    this.saveSettings();
  }

  setHolidayColor(colorLight: string, colorDark: string): void {
    const current = this.settingsSubject.value;
    this.settingsSubject.next({ ...current, holidayColorLight: colorLight, holidayColorDark: colorDark });
    this.saveSettings();
  }

  setScheduledDayOffColor(colorLight: string, colorDark: string): void {
    const current = this.settingsSubject.value;
    this.settingsSubject.next({ ...current, scheduledDayOffColorLight: colorLight, scheduledDayOffColorDark: colorDark });
    this.saveSettings();
  }

  setNoContractColor(colorLight: string, colorDark: string): void {
    const current = this.settingsSubject.value;
    this.settingsSubject.next({ ...current, noContractColorLight: colorLight, noContractColorDark: colorDark });
    this.saveSettings();
  }

  setWeekStartDay(day: 0 | 1): void {
    const current = this.settingsSubject.value;
    this.settingsSubject.next({ ...current, weekStartDay: day });
    this.saveSettings();
  }

  resetWorkingDays(): void {
    const current = this.settingsSubject.value;
    this.settingsSubject.next({ ...current, workingDays: [...DEFAULT_SETTINGS.workingDays] });
    this.saveSettings();
  }

  resetColors(): void {
    const current = this.settingsSubject.value;
    this.settingsSubject.next({
      ...current,
      nonWorkingDayColorLight: DEFAULT_SETTINGS.nonWorkingDayColorLight,
      nonWorkingDayColorDark: DEFAULT_SETTINGS.nonWorkingDayColorDark,
      holidayColorLight: DEFAULT_SETTINGS.holidayColorLight,
      holidayColorDark: DEFAULT_SETTINGS.holidayColorDark,
      scheduledDayOffColorLight: DEFAULT_SETTINGS.scheduledDayOffColorLight,
      scheduledDayOffColorDark: DEFAULT_SETTINGS.scheduledDayOffColorDark,
      noContractColorLight: DEFAULT_SETTINGS.noContractColorLight,
      noContractColorDark: DEFAULT_SETTINGS.noContractColorDark
    });
    this.saveSettings();
  }

  resetToDefaults(): void {
    this.settingsSubject.next({ ...DEFAULT_SETTINGS, workingDays: [...DEFAULT_SETTINGS.workingDays] });
    this.saveSettings();
  }
}
