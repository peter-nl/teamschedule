import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export type NameColumnField = 'firstName' | 'particles' | 'lastName';

export type TeamFilterMode = 'and' | 'or';

export interface UserPreferences {
  theme: 'system' | 'light' | 'dark';
  navigationExpanded: boolean;
  defaultView: 'schedule' | 'teams' | 'members';
  scheduleZoom: number;
  scheduleNameColumnOrder: NameColumnField[];
  teamFilterMode: TeamFilterMode;
  language: 'en' | 'nl';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  navigationExpanded: true,
  defaultView: 'schedule',
  scheduleZoom: 40,
  scheduleNameColumnOrder: ['lastName', 'firstName', 'particles'] as NameColumnField[],
  teamFilterMode: 'and' as TeamFilterMode,
  language: 'en' as const
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

  setDefaultView(defaultView: 'schedule' | 'teams' | 'members'): void {
    const current = this.preferencesSubject.value;
    this.preferencesSubject.next({ ...current, defaultView });
    this.savePreferences();
  }

  setNavigationExpanded(expanded: boolean): void {
    const current = this.preferencesSubject.value;
    this.preferencesSubject.next({ ...current, navigationExpanded: expanded });
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

  setTeamFilterMode(mode: TeamFilterMode): void {
    const current = this.preferencesSubject.value;
    this.preferencesSubject.next({ ...current, teamFilterMode: mode });
    this.savePreferences();
  }

  setLanguage(language: 'en' | 'nl'): void {
    const current = this.preferencesSubject.value;
    this.preferencesSubject.next({ ...current, language });
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

    // Update the color-scheme meta tag so the browser doesn't override
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      if (theme === 'system') {
        meta.setAttribute('content', 'light dark');
      } else {
        meta.setAttribute('content', theme);
      }
    }

    if (theme === 'system') {
      // Let the system preference take over (handled by CSS media query)
      return;
    }

    root.classList.add(`${theme}-theme`);
  }

  /** Left offset for slide-in panels in non-management context (rail only). */
  getPanelLeftOffset(): string | undefined {
    const isNarrow = window.innerWidth < 768;
    const railWidth = isNarrow ? 0 : (this.preferences.navigationExpanded ? 220 : 80);
    return railWidth > 0 ? `${railWidth}px` : undefined;
  }

  /** Left offset for slide-in panels opened from within the management section (rail + nav bar). */
  getManagementPanelLeftOffset(): string | undefined {
    if (window.innerWidth < 768) return undefined;
    const navBarWidth = this.preferences.navigationExpanded ? 200 : 80;
    const railWidth = this.preferences.navigationExpanded ? 220 : 80;
    return `${railWidth + navBarWidth}px`;
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
