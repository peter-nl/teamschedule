import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppSettings {
  workingDays: boolean[]; // Index 0 = Sunday, 1 = Monday, ..., 6 = Saturday (matches JS Date.getDay())
  nonWorkingDayColor: string; // Background color for non-working days
  holidayColor: string; // Background color for holidays
  workerHolidayColor: string; // Background color for personal holidays
}

const DEFAULT_SETTINGS: AppSettings = {
  workingDays: [false, true, true, true, true, true, false], // Sun=off, Mon-Fri=on, Sat=off
  nonWorkingDayColor: '#e0e0e0', // Light gray
  holidayColor: '#ffcdd2', // Light red/pink
  workerHolidayColor: '#c8e6c9' // Light green
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

  setNonWorkingDayColor(color: string): void {
    const current = this.settingsSubject.value;
    this.settingsSubject.next({ ...current, nonWorkingDayColor: color });
    this.saveSettings();
  }

  setHolidayColor(color: string): void {
    const current = this.settingsSubject.value;
    this.settingsSubject.next({ ...current, holidayColor: color });
    this.saveSettings();
  }

  setWorkerHolidayColor(color: string): void {
    const current = this.settingsSubject.value;
    this.settingsSubject.next({ ...current, workerHolidayColor: color });
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
      nonWorkingDayColor: DEFAULT_SETTINGS.nonWorkingDayColor,
      holidayColor: DEFAULT_SETTINGS.holidayColor,
      workerHolidayColor: DEFAULT_SETTINGS.workerHolidayColor
    });
    this.saveSettings();
  }

  resetToDefaults(): void {
    this.settingsSubject.next({ ...DEFAULT_SETTINGS, workingDays: [...DEFAULT_SETTINGS.workingDays] });
    this.saveSettings();
  }
}
