import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../shared/services/auth.service';
import { WorkerHolidayService, WorkerHolidayPeriod } from '../../core/services/worker-holiday.service';
import { UserPreferencesService } from '../../shared/services/user-preferences.service';
import { SlideInPanelService } from '../../shared/services/slide-in-panel.service';
import { HolidayDialogComponent, HolidayDialogData, HolidayDialogResult } from '../../shared/components/holiday-dialog.component';

@Component({
  selector: 'app-account-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  template: `
    <mat-card class="profile-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>account_circle</mat-icon>
        <mat-card-title>My Account</mat-card-title>
        <mat-card-subtitle>Worker ID: {{ authService.currentUser?.id }}</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <form (ngSubmit)="onUpdateProfile()" class="profile-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>First Name</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.firstName"
                   name="firstName"
                   required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Particles (prefix)</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.particles"
                   name="particles"
                   placeholder="e.g., van, de, von">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Last Name</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.lastName"
                   name="lastName"
                   required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.email"
                   name="email"
                   type="email"
                   placeholder="e.g., john@example.com">
          </mat-form-field>

          <button mat-raised-button
                  color="primary"
                  type="submit"
                  [disabled]="profileLoading">
            <mat-spinner *ngIf="profileLoading" diameter="20"></mat-spinner>
            <span *ngIf="!profileLoading">Save Changes</span>
          </button>
        </form>

        <mat-divider class="section-divider"></mat-divider>

        <h3 class="section-title">Role</h3>
        <div class="role-section">
          <div class="role-display">
            <mat-icon>{{ authService.currentUser?.role === 'manager' ? 'admin_panel_settings' : 'person' }}</mat-icon>
            <span class="role-label">{{ authService.currentUser?.role === 'manager' ? 'Manager' : 'User' }}</span>
          </div>
        </div>

        <mat-divider class="section-divider"></mat-divider>

        <h3 class="section-title">
          <mat-icon class="section-icon">beach_access</mat-icon>
          My Personal Holidays
        </h3>
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
    .profile-card {
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

    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .full-width {
      width: 100%;
    }

    .section-divider {
      margin: 32px 0;
    }

    .section-title {
      font-size: 16px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--mat-sys-primary);
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    .role-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .role-display {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--mat-sys-surface-container);
      border-radius: 12px;
    }

    .role-display mat-icon {
      color: var(--mat-sys-primary);
    }

    .role-label {
      font-size: 16px;
      font-weight: 500;
      text-transform: capitalize;
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
export class AccountProfileComponent {
  profileForm = {
    firstName: '',
    lastName: '',
    particles: '',
    email: ''
  };
  profileLoading = false;

  myHolidays: WorkerHolidayPeriod[] = [];
  holidaysLoading = false;
  removingHolidayId: string | null = null;
  isDark = false;

  constructor(
    public authService: AuthService,
    private snackBar: MatSnackBar,
    private workerHolidayService: WorkerHolidayService,
    private userPreferencesService: UserPreferencesService,
    private panelService: SlideInPanelService
  ) {
    this.userPreferencesService.isDarkTheme$.subscribe(isDark => {
      this.isDark = isDark;
    });

    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.profileForm = {
          firstName: user.firstName,
          lastName: user.lastName,
          particles: user.particles || '',
          email: user.email || ''
        };
        this.loadMyHolidays(user.id);
      } else {
        this.myHolidays = [];
      }
    });
  }

  onUpdateProfile(): void {
    if (!this.profileForm.firstName || !this.profileForm.lastName) {
      this.snackBar.open('First name and last name are required', 'Close', { duration: 3000 });
      return;
    }

    this.profileLoading = true;

    this.authService.updateProfile(
      this.profileForm.firstName,
      this.profileForm.lastName,
      this.profileForm.particles || null,
      this.profileForm.email || null
    ).subscribe({
      next: () => {
        this.profileLoading = false;
        this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.profileLoading = false;
        this.snackBar.open('Failed to update profile', 'Close', { duration: 3000 });
        console.error('Update profile error:', error);
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

    const panelRef = this.panelService.open<HolidayDialogComponent, HolidayDialogData, HolidayDialogResult>(
      HolidayDialogComponent,
      {
        width: '480px',
        data: { mode: 'add', workerId: user.id }
      }
    );

    panelRef.afterClosed().subscribe(result => {
      if (result) this.loadMyHolidays(user.id);
    });
  }

  openEditHolidayDialog(holiday: WorkerHolidayPeriod): void {
    const user = this.authService.currentUser;
    if (!user) return;

    const panelRef = this.panelService.open<HolidayDialogComponent, HolidayDialogData, HolidayDialogResult>(
      HolidayDialogComponent,
      {
        width: '480px',
        data: { mode: 'edit', workerId: user.id, period: holiday }
      }
    );

    panelRef.afterClosed().subscribe(result => {
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
