import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppSettings {
  workingDays: boolean[]; // Index 0 = Sunday, 1 = Monday, ..., 6 = Saturday (matches JS Date.getDay())
  nonWorkingDayColorLight: string;
  nonWorkingDayColorDark: string;
  holidayColorLight: string;
  holidayColorDark: string;
  weekStartDay: 0 | 1; // 0 = Sunday, 1 = Monday
}

const DEFAULT_SETTINGS: AppSettings = {
  workingDays: [false, true, true, true, true, true, false], // Sun=off, Mon-Fri=on, Sat=off
  nonWorkingDayColorLight: '#e0e0e0',
  nonWorkingDayColorDark: '#3a3a3a',
  holidayColorLight: '#ffcdd2',
  holidayColorDark: '#772727',
  weekStartDay: 1 // Monday
};

const STORAGE_KEY = 'teamschedule-app-settings';

@Injectable({
  providedIn: 'root'
})
export class AppSettingsService {
  private settingsSubject = new BehaviorSubject<AppSettings>(DEFAULT_SETTINGS);
  public settings$ = this.settingsSubject.asObservable();

  constructor() {
    this.loadSettings();
  }

  get settings(): AppSettings {
    return this.settingsSubject.value;
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
      holidayColorDark: DEFAULT_SETTINGS.holidayColorDark
    });
    this.saveSettings();
  }

  resetToDefaults(): void {
    this.settingsSubject.next({ ...DEFAULT_SETTINGS, workingDays: [...DEFAULT_SETTINGS.workingDays] });
    this.saveSettings();
  }
}
