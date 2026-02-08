import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TableSettings {
  sortColumn: string;
  sortDirection: 'asc' | 'desc' | '';
  pageSize: number;
}

export interface ScheduleSettings {
  selectedTeamIds: string[];
}

export interface WorkersFilterSettings {
  selectedTeamIds: string[];
}

interface AppSettings {
  teamsTable?: TableSettings;
  workersTable?: TableSettings;
  workersFilter?: WorkersFilterSettings;
  schedule?: ScheduleSettings;
}

const STORAGE_KEY = 'teamschedule-settings';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private settings: AppSettings = {};

  private workersTableSubject = new BehaviorSubject<TableSettings | undefined>(undefined);
  public workersTable$ = this.workersTableSubject.asObservable();

  constructor() {
    this.loadSettings();
    this.workersTableSubject.next(this.settings.workersTable);
  }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.settings = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
      this.settings = {};
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
  }

  getTeamsTableSettings(): TableSettings | undefined {
    return this.settings.teamsTable;
  }

  setTeamsTableSettings(settings: TableSettings): void {
    this.settings.teamsTable = settings;
    this.saveSettings();
  }

  getWorkersTableSettings(): TableSettings | undefined {
    return this.settings.workersTable;
  }

  setWorkersTableSettings(settings: TableSettings): void {
    this.settings.workersTable = settings;
    this.saveSettings();
    this.workersTableSubject.next(settings);
  }

  getWorkersFilterSettings(): WorkersFilterSettings | undefined {
    return this.settings.workersFilter;
  }

  setWorkersFilterSettings(settings: WorkersFilterSettings): void {
    this.settings.workersFilter = settings;
    this.saveSettings();
  }

  getScheduleSettings(): ScheduleSettings | undefined {
    return this.settings.schedule;
  }

  setScheduleSettings(settings: ScheduleSettings): void {
    this.settings.schedule = settings;
    this.saveSettings();
  }
}
