import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SlideInPanelRef, SLIDE_IN_PANEL_DATA } from '../../../shared/services/slide-in-panel.service';
import { TeamFilterMode } from '../../../shared/services/user-preferences.service';

export interface ScheduleFilterPanelData {
  teams: { id: string; name: string }[];
  selectedTeamIds: Set<string>;
  teamFilterMode: TeamFilterMode;
  getMemberCountForTeam: (teamId: string) => number;
  getMemberCountWithoutTeam: () => number;
  onSelectionChange: (selectedTeamIds: string[]) => void;
  onFilterModeChange: (mode: TeamFilterMode) => void;
}

export interface ScheduleFilterPanelResult {
  selectedTeamIds: string[];
}

@Component({
  selector: 'app-schedule-filter-panel',
  standalone: true,
  imports: [CommonModule, MatCheckboxModule, MatButtonModule, MatIconModule, MatTooltipModule, TranslateModule],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2><mat-icon>filter_list</mat-icon> {{ 'scheduleFilter.title' | translate }}</h2>
        <button class="panel-close" (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <div class="panel-content">
        <div class="filter-list">
          <div class="filter-item" (click)="toggleTeam('__no_team__')">
            <mat-checkbox
              [checked]="isSelected('__no_team__')"
              (click)="$event.stopPropagation()"
              (change)="toggleTeam('__no_team__')">
              {{ 'scheduleFilter.noTeam' | translate }} ({{ data.getMemberCountWithoutTeam() }})
            </mat-checkbox>
          </div>
          <div *ngFor="let team of data.teams" class="filter-item" (click)="toggleTeam(team.id)">
            <mat-checkbox
              [checked]="isSelected(team.id)"
              (click)="$event.stopPropagation()"
              (change)="toggleTeam(team.id)">
              {{ team.name }} ({{ data.getMemberCountForTeam(team.id) }})
            </mat-checkbox>
          </div>
        </div>
      </div>
      <div class="panel-actions">
        <button mat-icon-button (click)="clearAll()" [disabled]="selection.size === 0" [matTooltip]="'scheduleFilter.clearAll' | translate">
          <mat-icon>filter_list_off</mat-icon>
        </button>
        <button mat-icon-button
                (click)="toggleFilterMode()"
                [matTooltip]="filterModeTooltip"
                class="filter-mode-toggle">
          <mat-icon>{{ filterModeIcon }}</mat-icon>
        </button>
        <div class="spacer"></div>
        <button mat-icon-button (click)="cancel()" [matTooltip]="'common.cancel' | translate">
          <mat-icon>close</mat-icon>
        </button>
        <button mat-icon-button (click)="apply()" [matTooltip]="'common.apply' | translate" color="primary">
          <mat-icon>check</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .filter-mode-toggle {
      color: var(--mat-sys-primary);
    }

    .filter-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .filter-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .filter-item:hover {
      background: var(--mat-sys-surface-container-high);
    }
  `]
})
export class ScheduleFilterPanelComponent implements OnInit {
  selection = new Set<string>();
  private initialSelection: string[] = [];

  constructor(
    public panelRef: SlideInPanelRef<ScheduleFilterPanelComponent, ScheduleFilterPanelResult>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: ScheduleFilterPanelData,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.selection = new Set(this.data.selectedTeamIds);
    this.initialSelection = Array.from(this.data.selectedTeamIds);
  }

  get filterModeIcon(): string {
    return this.data.teamFilterMode === 'and' ? 'join_inner' : 'join_full';
  }

  get filterModeTooltip(): string {
    return this.data.teamFilterMode === 'and'
      ? this.translate.instant('scheduleFilter.andMode')
      : this.translate.instant('scheduleFilter.orMode');
  }

  toggleFilterMode(): void {
    const newMode = this.data.teamFilterMode === 'and' ? 'or' : 'and';
    this.data.teamFilterMode = newMode;
    this.data.onFilterModeChange(newMode);
  }

  isSelected(id: string): boolean {
    return this.selection.has(id);
  }

  toggleTeam(id: string): void {
    if (this.selection.has(id)) {
      this.selection.delete(id);
    } else {
      this.selection.add(id);
    }
    this.data.onSelectionChange(Array.from(this.selection));
  }

  clearAll(): void {
    this.selection.clear();
    this.data.onSelectionChange([]);
  }

  cancel(): void {
    this.data.onSelectionChange(this.initialSelection);
    this.panelRef.close();
  }

  apply(): void {
    this.panelRef.close({ selectedTeamIds: Array.from(this.selection) });
  }
}
