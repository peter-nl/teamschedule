import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../shared/services/auth.service';
import { WorkerHolidayService, WorkerHolidayPeriod } from '../../core/services/worker-holiday.service';
import { UserPreferencesService } from '../../shared/services/user-preferences.service';
import { HolidayDialogComponent, HolidayDialogData, HolidayDialogResult } from '../../shared/components/holiday-dialog.component';

@Component({
  selector: 'app-account-holidays',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  template: `
    <mat-card class="holidays-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>beach_access</mat-icon>
        <mat-card-title>My Personal Holidays</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <div class="holidays-section">
          <button mat-raised-button
                  color="primary"
                  (click)="openAddHolidayDialog()">
            <mat-icon>add</mat-icon>
            Add Holiday
          </button>

          <div *ngIf="holidaysLoading" class="holidays-loading">
            <mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner>
            <span>Loading holidays...</span>
          </div>

          <div *ngIf="!holidaysLoading && myHolidays.length === 0" class="holidays-empty">
            No personal holidays set.
          </div>

          <div *ngIf="!holidaysLoading && myHolidays.length > 0" class="holidays-list">
            <div *ngFor="let holiday of myHolidays"
                 class="holiday-item clickable"
                 (click)="openEditHolidayDialog(holiday)">
              <div class="holiday-info">
                <span class="holiday-date">
                  {{ formatHolidayPeriod(holiday) }}
                  <span *ngIf="holiday.startDate === holiday.endDate && holiday.startDayPart !== 'full'" class="day-part-label">
                    ({{ holiday.startDayPart === 'morning' ? 'Morning' : 'Afternoon' }})
                  </span>
                  <span *ngIf="holiday.startDate !== holiday.endDate" class="day-part-label">
                    <span *ngIf="holiday.startDayPart !== 'full'"> (first: {{ holiday.startDayPart === 'afternoon' ? 'Afternoon' : 'Morning' }})</span>
                    <span *ngIf="holiday.endDayPart !== 'full'"> (last: {{ holiday.endDayPart === 'morning' ? 'Morning' : 'Afternoon' }})</span>
                  </span>
                </span>
                <span *ngIf="holiday.holidayType" class="holiday-type-badge"
                      [style.background-color]="isDark ? holiday.holidayType.colorDark : holiday.holidayType.colorLight">
                  {{ holiday.holidayType.name }}
                </span>
                <span *ngIf="holiday.description" class="holiday-description">{{ holiday.description }}</span>
              </div>
              <button mat-icon-button
                      (click)="onRemoveHoliday(holiday, $event)"
                      [disabled]="removingHolidayId === holiday.id">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .holidays-card {
      border-radius: 16px;
    }

    mat-card-header {
      margin-bottom: 24px;
    }

    mat-card-header mat-icon[mat-card-avatar] {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--mat-sys-primary);
    }

    .holidays-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .holidays-loading {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 0;
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
    }

    .holidays-empty {
      padding: 16px 0;
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
    }

    .holidays-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .holiday-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--mat-sys-surface-container-low);
      border-radius: 8px;
    }

    .holiday-item.clickable {
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .holiday-item.clickable:hover {
      background: var(--mat-sys-surface-container);
    }

    .holiday-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .holiday-date {
      font-size: 14px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .holiday-description {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .holiday-type-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 12px;
      color: rgba(0, 0, 0, 0.87);
      width: fit-content;
    }

    .day-part-label {
      font-size: 12px;
      font-weight: 400;
      color: var(--mat-sys-on-surface-variant);
    }
  `]
})
export class AccountHolidaysComponent {
  myHolidays: WorkerHolidayPeriod[] = [];
  holidaysLoading = false;
  removingHolidayId: string | null = null;
  isDark = false;

  constructor(
    private authService: AuthService,
    private workerHolidayService: WorkerHolidayService,
    private userPreferencesService: UserPreferencesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.userPreferencesService.isDarkTheme$.subscribe(isDark => {
      this.isDark = isDark;
    });

    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadMyHolidays(user.id);
      } else {
        this.myHolidays = [];
      }
    });
  }

  private loadMyHolidays(workerId: string): void {
    this.holidaysLoading = true;
    this.workerHolidayService.loadWorkerHolidays(workerId).subscribe({
      next: (periods) => {
        this.myHolidays = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
        this.holidaysLoading = false;
      },
      error: (error) => {
        this.holidaysLoading = false;
        console.error('Failed to load holidays:', error);
      }
    });
  }

  openAddHolidayDialog(): void {
    const user = this.authService.currentUser;
    if (!user) return;

    const dialogRef = this.dialog.open<HolidayDialogComponent, HolidayDialogData, HolidayDialogResult>(
      HolidayDialogComponent,
      {
        width: '480px',
        maxWidth: '95vw',
        data: { mode: 'add', workerId: user.id }
      }
    );

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadMyHolidays(user.id);
    });
  }

  openEditHolidayDialog(holiday: WorkerHolidayPeriod): void {
    const user = this.authService.currentUser;
    if (!user) return;

    const dialogRef = this.dialog.open<HolidayDialogComponent, HolidayDialogData, HolidayDialogResult>(
      HolidayDialogComponent,
      {
        width: '480px',
        maxWidth: '95vw',
        data: { mode: 'edit', workerId: user.id, period: holiday }
      }
    );

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadMyHolidays(user.id);
    });
  }

  onRemoveHoliday(holiday: WorkerHolidayPeriod, event?: Event): void {
    event?.stopPropagation();
    const user = this.authService.currentUser;
    if (!user) return;

    this.removingHolidayId = holiday.id;
    this.workerHolidayService.removeHoliday(holiday.id).subscribe({
      next: () => {
        this.removingHolidayId = null;
        this.snackBar.open('Holiday removed', 'Close', { duration: 3000 });
        this.loadMyHolidays(user.id);
      },
      error: (error) => {
        this.removingHolidayId = null;
        this.snackBar.open('Failed to remove holiday', 'Close', { duration: 3000 });
        console.error('Remove holiday error:', error);
      }
    });
  }

  formatHolidayPeriod(period: WorkerHolidayPeriod): string {
    const opts: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const start = new Date(period.startDate + 'T00:00:00');
    if (period.startDate === period.endDate) {
      return start.toLocaleDateString('en-US', opts);
    }
    const end = new Date(period.endDate + 'T00:00:00');
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', opts);
    return `${startStr} – ${endStr}`;
  }
}
