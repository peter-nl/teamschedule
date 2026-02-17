import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TableSettings {
  sortColumn: string;
  sortDirection: 'asc' | 'desc' | '';
  pageSize: number;
}

export interface ScheduleSettings {
  selectedTeamIds: string[];
  searchText?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface MembersFilterSettings {
  selectedTeamIds: string[];
}

interface AppSettings {
  teamsTable?: TableSettings;
  membersTable?: TableSettings;
  membersFilter?: MembersFilterSettings;
  schedule?: ScheduleSettings;
}

const STORAGE_KEY = 'teamschedule-settings';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private settings: AppSettings = {};

  private membersTableSubject = new BehaviorSubject<TableSettings | undefined>(undefined);
  public membersTable$ = this.membersTableSubject.asObservable();

  constructor() {
    this.loadSettings();
    this.membersTableSubject.next(this.settings.membersTable);
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

  getMembersTableSettings(): TableSettings | undefined {
    return this.settings.membersTable;
  }

  setMembersTableSettings(settings: TableSettings): void {
    this.settings.membersTable = settings;
    this.saveSettings();
    this.membersTableSubject.next(settings);
  }

  getMembersFilterSettings(): MembersFilterSettings | undefined {
    return this.settings.membersFilter;
  }

  setMembersFilterSettings(settings: MembersFilterSettings): void {
    this.settings.membersFilter = settings;
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
