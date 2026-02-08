import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export type NameColumnField = 'firstName' | 'particles' | 'lastName';

export interface UserPreferences {
  theme: 'system' | 'light' | 'dark';
  navigationExpanded: boolean;
  defaultView: 'schedule' | 'teams' | 'workers';
  managementMode: boolean;
  scheduleZoom: number;
  scheduleNameColumnOrder: NameColumnField[];
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  navigationExpanded: true,
  defaultView: 'schedule',
  managementMode: true,
  scheduleZoom: 40,
  scheduleNameColumnOrder: ['lastName', 'firstName', 'particles'] as NameColumnField[]
};

const STORAGE_KEY = 'teamschedule-user-preferences';

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private preferencesSubject = new BehaviorSubject<UserPreferences>(DEFAULT_PREFERENCES);
  public preferences$ = this.preferencesSubject.asObservable();

  public isDarkTheme$ = this.preferences$.pipe(
    map(prefs => this.computeIsDark(prefs.theme))
  );

  constructor() {
    this.loadPreferences();
    // Re-emit when OS theme changes (affects 'system' setting)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      this.preferencesSubject.next(this.preferencesSubject.value);
    });
  }

  get preferences(): UserPreferences {
    return this.preferencesSubject.value;
  }

  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const preferences = { ...DEFAULT_PREFERENCES, ...parsed };
        this.preferencesSubject.next(preferences);
        this.applyTheme(preferences.theme);
      }
    } catch (e) {
      console.warn('Failed to load preferences from localStorage:', e);
    }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferencesSubject.value));
    } catch (e) {
      console.warn('Failed to save preferences to localStorage:', e);
    }
  }

  setTheme(theme: 'system' | 'light' | 'dark'): void {
    const current = this.preferencesSubject.value;
    this.preferencesSubject.next({ ...current, theme });
    this.applyTheme(theme);
    this.savePreferences();
  }

  setDefaultView(defaultView: 'schedule' | 'teams' | 'workers'): void {
    const current = this.preferencesSubject.value;
    this.preferencesSubject.next({ ...current, defaultView });
    this.savePreferences();
  }

  setNavigationExpanded(expanded: boolean): void {
    const current = this.preferencesSubject.value;
    this.preferencesSubject.next({ ...current, navigationExpanded: expanded });
    this.savePreferences();
  }

  setManagementMode(enabled: boolean): void {
    const current = this.preferencesSubject.value;
    this.preferencesSubject.next({ ...current, managementMode: enabled });
    this.savePreferences();
  }

  setScheduleZoom(zoom: number): void {
    const current = this.preferencesSubject.value;
    this.preferencesSubject.next({ ...current, scheduleZoom: zoom });
    this.savePreferences();
  }

  setScheduleNameColumnOrder(order: NameColumnField[]): void {
    const current = this.preferencesSubject.value;
    this.preferencesSubject.next({ ...current, scheduleNameColumnOrder: order });
    this.savePreferences();
  }

  updatePreferences(partial: Partial<UserPreferences>): void {
    const current = this.preferencesSubject.value;
    const updated = { ...current, ...partial };
    this.preferencesSubject.next(updated);
    if (partial.theme !== undefined) {
      this.applyTheme(partial.theme);
    }
    this.savePreferences();
  }

  private applyTheme(theme: 'system' | 'light' | 'dark'): void {
    const root = document.documentElement;
    root.classList.remove('light-theme', 'dark-theme');

    if (theme === 'system') {
      // Let the system preference take over (handled by CSS media query)
      return;
    }

    root.classList.add(`${theme}-theme`);
  }

  resetToDefaults(): void {
    this.preferencesSubject.next(DEFAULT_PREFERENCES);
    this.applyTheme(DEFAULT_PREFERENCES.theme);
    this.savePreferences();
  }

  get isDarkTheme(): boolean {
    return this.computeIsDark(this.preferencesSubject.value.theme);
  }

  private computeIsDark(theme: 'system' | 'light' | 'dark'): boolean {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
