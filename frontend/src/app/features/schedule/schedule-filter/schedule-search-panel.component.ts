import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SlideInPanelRef, SLIDE_IN_PANEL_DATA } from '../../../shared/services/slide-in-panel.service';

export interface ScheduleSearchPanelData {
  searchText: string;
  onSearchChange: (searchText: string) => void;
}

export interface ScheduleSearchPanelResult {
  searchText: string;
}

@Component({
  selector: 'app-schedule-search-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2><mat-icon>search</mat-icon> Search Workers</h2>
        <button class="panel-close" (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <div class="panel-content">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search by name</mat-label>
          <input matInput
                 [(ngModel)]="searchText"
                 (ngModelChange)="onSearchInput()"
                 placeholder="Type to search..."
                 autocomplete="off"
                 #searchInput>
          <mat-icon matSuffix *ngIf="!searchText">search</mat-icon>
          <button mat-icon-button matSuffix *ngIf="searchText" (click)="clearSearch()" matTooltip="Clear search">
            <mat-icon>close</mat-icon>
          </button>
        </mat-form-field>
        <p class="search-hint">Searches in First name, Last name and Particles columns.</p>
      </div>
      <div class="panel-actions">
        <button mat-icon-button (click)="clearSearch()" [disabled]="!searchText" matTooltip="Clear search">
          <mat-icon>search_off</mat-icon>
        </button>
        <div class="spacer"></div>
        <button mat-icon-button (click)="cancel()" matTooltip="Cancel">
          <mat-icon>close</mat-icon>
        </button>
        <button mat-icon-button (click)="apply()" matTooltip="Apply" color="primary">
          <mat-icon>check</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .search-field {
      width: 100%;
    }

    .search-hint {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      margin-top: 4px;
    }
  `]
})
export class ScheduleSearchPanelComponent implements OnInit {
  searchText = '';
  private initialSearchText = '';

  constructor(
    public panelRef: SlideInPanelRef<ScheduleSearchPanelComponent, ScheduleSearchPanelResult>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: ScheduleSearchPanelData
  ) {}

  ngOnInit(): void {
    this.searchText = this.data.searchText || '';
    this.initialSearchText = this.searchText;
  }

  onSearchInput(): void {
    this.data.onSearchChange(this.searchText);
  }

  clearSearch(): void {
    this.searchText = '';
    this.data.onSearchChange('');
  }

  cancel(): void {
    this.data.onSearchChange(this.initialSearchText);
    this.panelRef.close();
  }

  apply(): void {
    this.panelRef.close({ searchText: this.searchText });
  }
}
