import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../shared/services/auth.service';
import { WorkerHolidayService, WorkerHolidayPeriod } from '../../core/services/worker-holiday.service';
import { UserPreferencesService } from '../../shared/services/user-preferences.service';
import { HolidayDialogComponent, HolidayDialogData, HolidayDialogResult } from '../../shared/components/holiday-dialog.component';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatDialogModule
  ],
  template: `
    <div class="account-container">
      <!-- Login Form (when not logged in) -->
      <mat-card *ngIf="!authService.isLoggedIn" class="login-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>login</mat-icon>
          <mat-card-title>Login</mat-card-title>
          <mat-card-subtitle>Sign in with your worker ID</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form (ngSubmit)="onLogin()" class="login-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Worker ID</mat-label>
              <input matInput
                     [(ngModel)]="loginForm.workerId"
                     name="workerId"
                     required
                     placeholder="Enter your worker ID">
              <mat-icon matSuffix>badge</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput
                     [(ngModel)]="loginForm.password"
                     name="password"
                     [type]="hidePassword ? 'password' : 'text'"
                     required
                     placeholder="Enter your password">
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <div *ngIf="loginError" class="error-message">
              <mat-icon>error</mat-icon>
              {{ loginError }}
            </div>

            <button mat-raised-button
                    color="primary"
                    type="submit"
                    class="full-width"
                    [disabled]="loginLoading">
              <mat-spinner *ngIf="loginLoading" diameter="20"></mat-spinner>
              <span *ngIf="!loginLoading">Sign In</span>
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Profile View (when logged in) -->
      <mat-card *ngIf="authService.isLoggedIn" class="profile-card">
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
            <div *ngIf="authService.isManager" class="role-edit">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Change Role</mat-label>
                <mat-select [(ngModel)]="selectedRole" name="role">
                  <mat-option value="user">User</mat-option>
                  <mat-option value="manager">Manager</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-raised-button
                      (click)="onUpdateRole()"
                      [disabled]="roleLoading || selectedRole === authService.currentUser?.role">
                <mat-spinner *ngIf="roleLoading" diameter="20"></mat-spinner>
                <span *ngIf="!roleLoading">Update Role</span>
              </button>
            </div>
          </div>

          <mat-divider class="section-divider"></mat-divider>

          <h3 class="section-title">Change Password</h3>
          <form (ngSubmit)="onChangePassword()" class="password-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Current Password</mat-label>
              <input matInput
                     [(ngModel)]="passwordForm.currentPassword"
                     name="currentPassword"
                     [type]="hideCurrentPassword ? 'password' : 'text'"
                     required>
              <button mat-icon-button matSuffix type="button" (click)="hideCurrentPassword = !hideCurrentPassword">
                <mat-icon>{{ hideCurrentPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>New Password</mat-label>
              <input matInput
                     [(ngModel)]="passwordForm.newPassword"
                     name="newPassword"
                     [type]="hideNewPassword ? 'password' : 'text'"
                     required>
              <button mat-icon-button matSuffix type="button" (click)="hideNewPassword = !hideNewPassword">
                <mat-icon>{{ hideNewPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm New Password</mat-label>
              <input matInput
                     [(ngModel)]="passwordForm.confirmPassword"
                     name="confirmPassword"
                     [type]="hideConfirmPassword ? 'password' : 'text'"
                     required>
              <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword">
                <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <button mat-raised-button
                    type="submit"
                    [disabled]="passwordLoading">
              <mat-spinner *ngIf="passwordLoading" diameter="20"></mat-spinner>
              <span *ngIf="!passwordLoading">Change Password</span>
            </button>
          </form>

          <mat-divider class="section-divider"></mat-divider>

          <h3 class="section-title">My Personal Holidays</h3>
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

          <mat-divider class="section-divider"></mat-divider>

          <button mat-stroked-button
                  color="warn"
                  (click)="onLogout()"
                  class="logout-button">
            <mat-icon>logout</mat-icon>
            Sign Out
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .account-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 24px;
    }

    .login-card,
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

    .login-form,
    .profile-form,
    .password-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .full-width {
      width: 100%;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 8px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      margin-bottom: 16px;
    }

    .error-message mat-icon {
      flex-shrink: 0;
    }

    .section-divider {
      margin: 32px 0;
    }

    .section-title {
      font-size: 16px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
      margin-bottom: 16px;
    }

    .logout-button {
      width: 100%;
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    button[type="submit"] {
      height: 48px;
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

    .role-edit {
      display: flex;
      flex-direction: column;
      gap: 8px;
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
    }

    .day-part-label {
      font-size: 12px;
      font-weight: 400;
      color: var(--mat-sys-on-surface-variant);
    }
  `]
})
export class AccountComponent {
  // Login form
  loginForm = {
    workerId: '',
    password: ''
  };
  loginLoading = false;
  loginError: string | null = null;
  hidePassword = true;

  // Profile form
  profileForm = {
    firstName: '',
    lastName: '',
    particles: ''
  };
  profileLoading = false;

  // Password form
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  passwordLoading = false;
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  // Role
  selectedRole: 'user' | 'manager' = 'user';
  roleLoading = false;

  // Personal holidays
  myHolidays: WorkerHolidayPeriod[] = [];
  holidaysLoading = false;
  removingHolidayId: string | null = null;
  isDark = false;

  constructor(
    public authService: AuthService,
    private snackBar: MatSnackBar,
    private workerHolidayService: WorkerHolidayService,
    private userPreferencesService: UserPreferencesService,
    private dialog: MatDialog
  ) {
    // Track dark theme
    this.userPreferencesService.isDarkTheme$.subscribe(isDark => {
      this.isDark = isDark;
    });
    // Initialize profile form when logged in
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.profileForm = {
          firstName: user.firstName,
          lastName: user.lastName,
          particles: user.particles || ''
        };
        this.selectedRole = user.role;
        this.loadMyHolidays(user.id);
      } else {
        this.myHolidays = [];
      }
    });
  }

  onLogin(): void {
    if (!this.loginForm.workerId || !this.loginForm.password) {
      this.loginError = 'Please enter both Worker ID and Password';
      return;
    }

    this.loginLoading = true;
    this.loginError = null;

    this.authService.login(this.loginForm.workerId, this.loginForm.password).subscribe({
      next: (result) => {
        this.loginLoading = false;
        if (result.success) {
          this.snackBar.open('Welcome back!', 'Close', { duration: 3000 });
          this.loginForm = { workerId: '', password: '' };
        } else {
          this.loginError = result.message || 'Login failed';
        }
      },
      error: (error) => {
        this.loginLoading = false;
        this.loginError = 'An error occurred. Please try again.';
        console.error('Login error:', error);
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
      this.profileForm.particles || null
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

  onChangePassword(): void {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
      this.snackBar.open('Please fill in all password fields', 'Close', { duration: 3000 });
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.snackBar.open('New passwords do not match', 'Close', { duration: 3000 });
      return;
    }

    this.passwordLoading = true;

    this.authService.changePassword(
      this.passwordForm.currentPassword,
      this.passwordForm.newPassword
    ).subscribe({
      next: (result) => {
        this.passwordLoading = false;
        if (result.success) {
          this.snackBar.open('Password changed successfully', 'Close', { duration: 3000 });
          this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
        } else {
          this.snackBar.open(result.message || 'Failed to change password', 'Close', { duration: 3000 });
        }
      },
      error: (error) => {
        this.passwordLoading = false;
        this.snackBar.open('Failed to change password', 'Close', { duration: 3000 });
        console.error('Change password error:', error);
      }
    });
  }

  onLogout(): void {
    this.authService.logout();
    this.snackBar.open('You have been signed out', 'Close', { duration: 3000 });
  }

  onUpdateRole(): void {
    const user = this.authService.currentUser;
    if (!user) return;

    this.roleLoading = true;

    this.authService.updateRole(user.id, this.selectedRole).subscribe({
      next: () => {
        this.roleLoading = false;
        this.snackBar.open('Role updated successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.roleLoading = false;
        this.snackBar.open(error.message || 'Failed to update role', 'Close', { duration: 3000 });
        console.error('Update role error:', error);
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
