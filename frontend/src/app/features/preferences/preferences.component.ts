import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../shared/services/auth.service';
import { UserPreferencesService, UserPreferences } from '../../shared/services/user-preferences.service';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatDividerModule
  ],
  template: `
    <div class="preferences-container">
      <mat-card class="preferences-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>tune</mat-icon>
          <mat-card-title>User Preferences</mat-card-title>
          <mat-card-subtitle>Customize your experience</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="user-info">
            <p><strong>Logged in as:</strong> {{ authService.currentUser?.firstName }} {{ authService.currentUser?.lastName }}</p>
          </div>

          <mat-divider></mat-divider>

          <div class="preferences-section">
            <h3>Appearance</h3>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Theme</mat-label>
              <mat-select [value]="preferences.theme" (selectionChange)="onThemeChange($event.value)">
                <mat-option value="system">System Default</mat-option>
                <mat-option value="light">Light</mat-option>
                <mat-option value="dark">Dark</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-divider></mat-divider>

          <div class="preferences-section">
            <h3>Navigation</h3>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Navigation rail</mat-label>
              <mat-select [value]="preferences.navigationExpanded" (selectionChange)="onNavigationExpandedChange($event.value)">
                <mat-option [value]="true">Expanded</mat-option>
                <mat-option [value]="false">Collapsed</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-divider></mat-divider>

          <div class="preferences-section">
            <h3>Default View</h3>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Start page</mat-label>
              <mat-select [value]="preferences.defaultView" (selectionChange)="onDefaultViewChange($event.value)">
                <mat-option value="schedule">Schedule</mat-option>
                <mat-option value="teams">Teams</mat-option>
                <mat-option value="workers">Workers</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-divider></mat-divider>

          <div class="preferences-section">
            <h3>Schedule</h3>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Week starts on</mat-label>
              <mat-select [value]="preferences.scheduleWeekStartDay" (selectionChange)="onWeekStartDayChange($event.value)">
                <mat-option [value]="0">Sunday</mat-option>
                <mat-option [value]="1">Monday</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
        <mat-card-actions align="end">
          <button mat-button color="warn" (click)="resetToDefaults()">
            <mat-icon>restart_alt</mat-icon> Reset to Defaults
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .preferences-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .preferences-card {
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

    .user-info {
      margin-bottom: 16px;
      padding: 12px;
      background: var(--mat-sys-surface-container);
      border-radius: 8px;
    }

    .user-info p {
      margin: 0;
    }

    .preferences-section {
      padding: 16px 0;
    }

    .preferences-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .full-width {
      width: 100%;
    }

    mat-divider {
      margin: 0;
    }

    mat-card-actions {
      padding: 16px;
    }
  `]
})
export class PreferencesComponent {
  preferences: UserPreferences;

  constructor(
    public authService: AuthService,
    private userPreferencesService: UserPreferencesService
  ) {
    this.preferences = this.userPreferencesService.preferences;
    this.userPreferencesService.preferences$.subscribe(prefs => {
      this.preferences = prefs;
    });
  }

  onThemeChange(theme: 'system' | 'light' | 'dark'): void {
    this.userPreferencesService.setTheme(theme);
  }

  onDefaultViewChange(view: 'schedule' | 'teams' | 'workers'): void {
    this.userPreferencesService.setDefaultView(view);
  }

  onWeekStartDayChange(day: 0 | 1): void {
    this.userPreferencesService.setScheduleWeekStartDay(day);
  }

  onNavigationExpandedChange(expanded: boolean): void {
    this.userPreferencesService.setNavigationExpanded(expanded);
  }

  resetToDefaults(): void {
    this.userPreferencesService.resetToDefaults();
  }
}
