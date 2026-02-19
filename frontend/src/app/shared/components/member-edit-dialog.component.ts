import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService } from '../services/auth.service';
import { SlideInPanelRef, SLIDE_IN_PANEL_DATA, SlideInPanelService } from '../services/slide-in-panel.service';
import { DaySchedule } from '../models/member.model';
import { ScheduleService } from '../../features/schedule/services/schedule.service';
import { MemberHolidayService, MemberHolidayPeriod } from '../../core/services/member-holiday.service';
import { HolidayDialogComponent, HolidayDialogData, HolidayDialogResult } from './holiday-dialog.component';
import { UserPreferencesService } from '../services/user-preferences.service';

export interface MemberEditDialogData {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    particles: string | null;
    email: string | null;
    role: string;
    teams: { id: string; name: string }[];
  };
  allTeams: { id: string; name: string }[];
  isSelf: boolean;
  isManager: boolean;
}

const UPDATE_MEMBER_MUTATION = gql`
  mutation UpdateMemberProfile($id: String!, $firstName: String!, $lastName: String!, $particles: String, $email: String) {
    updateMemberProfile(id: $id, firstName: $firstName, lastName: $lastName, particles: $particles, email: $email) {
      id firstName lastName particles email role
    }
  }
`;

const ADD_MEMBER_TO_TEAM_MUTATION = gql`
  mutation AddMemberToTeam($teamId: ID!, $memberId: ID!) {
    addMemberToTeam(teamId: $teamId, memberId: $memberId) { id }
  }
`;

const REMOVE_MEMBER_FROM_TEAM_MUTATION = gql`
  mutation RemoveMemberFromTeam($teamId: ID!, $memberId: ID!) {
    removeMemberFromTeam(teamId: $teamId, memberId: $memberId) { id }
  }
`;

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($memberId: String!, $newPassword: String!) {
    resetPassword(memberId: $memberId, newPassword: $newPassword) {
      success
      message
    }
  }
`;

@Component({
  selector: 'app-member-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    TranslateModule,
    HolidayDialogComponent
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon>edit</mat-icon>
          {{ 'editMember.title' | translate }}
        </h2>
        <button class="panel-close" (click)="panelRef.close()" [disabled]="saving">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">
        <div class="form-content">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.memberId' | translate }}</mat-label>
            <input matInput [value]="data.member.id" disabled>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.firstName' | translate }}</mat-label>
            <input matInput [(ngModel)]="editForm.firstName" name="firstName">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.particles' | translate }}</mat-label>
            <input matInput [(ngModel)]="editForm.particles" name="particles"
                   [placeholder]="'editMember.particlesPlaceholder' | translate">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.lastName' | translate }}</mat-label>
            <input matInput [(ngModel)]="editForm.lastName" name="lastName">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.email' | translate }}</mat-label>
            <input matInput [(ngModel)]="editForm.email" name="email" type="email"
                   [placeholder]="'editMember.emailPlaceholder' | translate">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.role' | translate }}</mat-label>
            <mat-select [(ngModel)]="editForm.role" name="role"
                        [disabled]="!canEditRole">
              <mat-option value="user">{{ 'common.user' | translate }}</mat-option>
              <mat-option value="manager">{{ 'common.manager' | translate }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'editMember.teamsLabel' | translate }}</mat-label>
            <mat-select [(ngModel)]="editForm.teamIds" name="teams" multiple
                        [disabled]="!canEditTeams">
              <mat-option *ngFor="let team of data.allTeams" [value]="team.id">
                {{ team.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Work Schedule Section -->
          <mat-divider style="margin: 16px 0;"></mat-divider>

          <h4 style="margin: 0 0 8px 0; color: var(--mat-sys-primary); display: flex; align-items: center; gap: 8px;">
            <mat-icon>schedule</mat-icon>
            {{ 'memberSchedule.title' | translate }}
          </h4>

          <div class="schedule-info">
            {{ 'memberSchedule.alternationStart' | translate }}: {{ referenceDate }}
          </div>

          <div *ngFor="let weekLabel of ['weekA', 'weekB']; let wi = index" class="schedule-week">
            <div class="week-label">{{ 'memberSchedule.' + weekLabel | translate }}</div>
            <div class="schedule-grid">
              <div *ngFor="let key of dayLabelKeys" class="sg-day-header">{{ key | translate }}</div>
              <div *ngFor="let d of getWeek(wi); let di = index"
                   class="sg-cell"
                   [class.day-off]="d.morning === 0 && d.afternoon === 0"
                   [class.half-day]="(d.morning === 0) !== (d.afternoon === 0)"
                   (click)="cycleDay(wi, di)"
                   tabindex="0" role="button"
                   (keydown.enter)="cycleDay(wi, di)"
                   (keydown.space)="cycleDay(wi, di); $event.preventDefault()">
                {{ dayToString(d) }}
              </div>
            </div>
          </div>

          <!-- Holidays Section -->
          <mat-divider style="margin: 16px 0;"></mat-divider>

          <div class="section-header">
            <h4 style="margin: 0; color: var(--mat-sys-primary); display: flex; align-items: center; gap: 8px;">
              <mat-icon>event_busy</mat-icon>
              {{ 'profile.holidays.title' | translate }}
            </h4>
            <button mat-icon-button type="button" (click)="openAddHoliday()"
                    [matTooltip]="'profile.holidays.addHoliday' | translate">
              <mat-icon>add</mat-icon>
            </button>
          </div>

          <div *ngIf="holidaysLoading" style="display:flex; justify-content:center; padding:12px;">
            <mat-spinner diameter="24"></mat-spinner>
          </div>

          <div *ngIf="!holidaysLoading">
            <div *ngIf="holidays.length === 0" class="holidays-empty">
              {{ 'profile.holidays.empty' | translate }}
            </div>
            <div *ngFor="let h of holidays" class="holiday-item" (click)="openEditHoliday(h)">
              <div class="holiday-type-dot" *ngIf="h.holidayType"
                   [style.background]="isDark ? h.holidayType.colorDark : h.holidayType.colorLight"></div>
              <div class="holiday-info">
                <span class="holiday-date">{{ formatHolidayPeriod(h) }}</span>
                <span *ngIf="h.description" class="holiday-desc">{{ h.description }}</span>
              </div>
              <button mat-icon-button type="button" color="warn"
                      (click)="removeHoliday(h, $event)"
                      [disabled]="removingHolidayId === h.id">
                <mat-spinner *ngIf="removingHolidayId === h.id" diameter="16"></mat-spinner>
                <mat-icon *ngIf="removingHolidayId !== h.id">delete</mat-icon>
              </button>
            </div>
          </div>

          <!-- Reset Password Section (managers only, for other members) -->
          <ng-container *ngIf="canResetPassword">
            <mat-divider style="margin: 16px 0;"></mat-divider>

            <h4 style="margin: 0 0 12px 0; color: var(--mat-sys-primary); display: flex; align-items: center; gap: 8px;">
              <mat-icon>lock_reset</mat-icon>
              {{ 'editMember.resetPassword' | translate }}
            </h4>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'editMember.newPassword' | translate }}</mat-label>
              <input matInput
                     [(ngModel)]="resetPasswordForm.newPassword"
                     name="newPassword"
                     [type]="hideNewPassword ? 'password' : 'text'">
              <button mat-icon-button matSuffix type="button" (click)="hideNewPassword = !hideNewPassword">
                <mat-icon>{{ hideNewPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'editMember.confirmPassword' | translate }}</mat-label>
              <input matInput
                     [(ngModel)]="resetPasswordForm.confirmPassword"
                     name="confirmNewPassword"
                     [type]="hideConfirmPassword ? 'password' : 'text'">
              <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword">
                <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <button mat-stroked-button
                    color="primary"
                    type="button"
                    (click)="onResetPassword()"
                    [disabled]="resettingPassword || !isPasswordFormValid"
                    style="margin-top: 8px;">
              <mat-spinner *ngIf="resettingPassword" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!resettingPassword">lock_reset</mat-icon>
              <span *ngIf="!resettingPassword">{{ 'editMember.resetButton' | translate }}</span>
            </button>
          </ng-container>
        </div>
      </div>

      <div class="panel-actions">
        <span class="spacer"></span>
        <button mat-icon-button (click)="panelRef.close()" [disabled]="saving" [matTooltip]="'common.cancel' | translate">
          <mat-icon>close</mat-icon>
        </button>
        <button mat-icon-button color="primary"
                (click)="onSave()"
                [disabled]="saving || !isFormValid"
                [matTooltip]="'common.save' | translate">
          <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
          <mat-icon *ngIf="!saving">check</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .form-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
    }

    .full-width {
      width: 100%;
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 4px;
    }

    .schedule-info {
      margin: 10px 0 6px;
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .schedule-week {
      margin: 8px 0;
    }

    .week-label {
      font-weight: 500;
      font-size: 13px;
      margin-bottom: 4px;
      color: var(--mat-sys-on-surface);
    }

    .schedule-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 8px;
      overflow: hidden;
    }

    .sg-day-header {
      text-align: center;
      padding: 4px 2px;
      font-size: 11px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container);
      border-right: 1px solid var(--mat-sys-outline-variant);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .sg-day-header:last-of-type {
      border-right: none;
    }

    .sg-cell {
      text-align: center;
      padding: 6px 2px;
      font-size: 13px;
      border-right: 1px solid var(--mat-sys-outline-variant);
      cursor: pointer;
      user-select: none;
      transition: background 0.1s;
    }

    .sg-cell:last-child {
      border-right: none;
    }

    .sg-cell:hover, .sg-cell:focus {
      background: var(--mat-sys-surface-container-high);
      outline: none;
    }

    .sg-cell.day-off {
      color: var(--mat-sys-on-surface-variant);
    }

    .sg-cell.half-day {
      color: var(--mat-sys-primary);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .holidays-empty {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
      padding: 4px 0 8px;
    }

    .holiday-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 4px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.1s;
    }

    .holiday-item:hover {
      background: var(--mat-sys-surface-container);
    }

    .holiday-type-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .holiday-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .holiday-date {
      font-size: 13px;
      color: var(--mat-sys-on-surface);
    }

    .holiday-desc {
      font-size: 11px;
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class MemberEditDialogComponent {
  editForm: {
    firstName: string;
    lastName: string;
    particles: string;
    email: string;
    role: string;
    teamIds: string[];
  };

  resetPasswordForm = {
    newPassword: '',
    confirmPassword: ''
  };
  hideNewPassword = true;
  hideConfirmPassword = true;
  resettingPassword = false;
  saving = false;

  // Schedule fields
  referenceDate = '';
  scheduleWeek1: DaySchedule[] = [];
  scheduleWeek2: DaySchedule[] = [];
  dayLabelKeys = ['days.abbr.mo', 'days.abbr.tu', 'days.abbr.we', 'days.abbr.th', 'days.abbr.fr'];
  readonly dayValues: DaySchedule[] = [
    { morning: 4, afternoon: 4 },
    { morning: 4, afternoon: 0 },
    { morning: 0, afternoon: 4 },
    { morning: 0, afternoon: 0 }
  ];

  // Holiday fields
  holidays: MemberHolidayPeriod[] = [];
  holidaysLoading = false;
  removingHolidayId: string | null = null;
  isDark = false;

  constructor(
    public panelRef: SlideInPanelRef<MemberEditDialogComponent, boolean>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: MemberEditDialogData,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private scheduleService: ScheduleService,
    private holidayService: MemberHolidayService,
    private panelService: SlideInPanelService,
    private userPrefsService: UserPreferencesService
  ) {
    this.editForm = {
      firstName: data.member.firstName,
      lastName: data.member.lastName,
      particles: data.member.particles || '',
      email: data.member.email || '',
      role: data.member.role,
      teamIds: data.member.teams.map(t => t.id)
    };

    this.userPrefsService.isDarkTheme$.subscribe(dark => { this.isDark = dark; });

    // Load existing schedule or initialise with defaults
    const existing = this.scheduleService.getMemberSchedule(data.member.id);
    if (existing) {
      this.referenceDate = existing.referenceDate;
      this.scheduleWeek1 = existing.week1.map(d => ({ ...d }));
      this.scheduleWeek2 = existing.week2.map(d => ({ ...d }));
    } else {
      this.initEmptySchedule();
    }

    this.loadHolidays();
  }

  get canEditRole(): boolean {
    return this.data.isManager && !this.data.isSelf;
  }

  get canEditTeams(): boolean {
    return this.data.isManager;
  }

  get canResetPassword(): boolean {
    return this.data.isManager && !this.data.isSelf;
  }

  get isFormValid(): boolean {
    return !!(this.editForm.firstName && this.editForm.lastName);
  }

  get isPasswordFormValid(): boolean {
    return !!(
      this.resetPasswordForm.newPassword &&
      this.resetPasswordForm.newPassword === this.resetPasswordForm.confirmPassword
    );
  }

  async onSave(): Promise<void> {
    this.saving = true;
    try {
      // Update profile
      await apolloClient.mutate({
        mutation: UPDATE_MEMBER_MUTATION,
        variables: {
          id: this.data.member.id,
          firstName: this.editForm.firstName,
          lastName: this.editForm.lastName,
          particles: this.editForm.particles || null,
          email: this.editForm.email || null
        }
      });

      // Update role if changed (only for other members)
      if (this.canEditRole && this.editForm.role !== this.data.member.role) {
        await new Promise<void>((resolve, reject) => {
          this.authService.updateRole(
            this.data.member.id,
            this.editForm.role as 'user' | 'manager'
          ).subscribe({ next: () => resolve(), error: (e) => reject(e) });
        });
      }

      // Update team assignments (managers only)
      if (this.canEditTeams) {
        const currentTeamIds = this.data.member.teams.map(t => t.id);
        const newTeamIds = this.editForm.teamIds;

        for (const teamId of currentTeamIds) {
          if (!newTeamIds.includes(teamId)) {
            await apolloClient.mutate({
              mutation: REMOVE_MEMBER_FROM_TEAM_MUTATION,
              variables: { teamId, memberId: this.data.member.id }
            });
          }
        }

        for (const teamId of newTeamIds) {
          if (!currentTeamIds.includes(teamId)) {
            await apolloClient.mutate({
              mutation: ADD_MEMBER_TO_TEAM_MUTATION,
              variables: { teamId, memberId: this.data.member.id }
            });
          }
        }
      }

      // Always save the member schedule
      await new Promise<void>((resolve, reject) => {
        this.scheduleService.saveMemberSchedule(
          this.data.member.id,
          this.referenceDate,
          this.scheduleWeek1,
          this.scheduleWeek2
        ).subscribe({ next: () => resolve(), error: (e) => reject(e) });
      });

      // If user edited their own profile, update the stored auth user
      if (this.data.isSelf) {
        this.authService.updateProfile(
          this.editForm.firstName,
          this.editForm.lastName,
          this.editForm.particles || null,
          this.editForm.email || null
        ).subscribe();
      }

      this.snackBar.open(this.translate.instant('editMember.messages.updated'), this.translate.instant('common.close'), { duration: 3000 });
      this.panelRef.close(true);
    } catch (error: any) {
      console.error('Failed to update member:', error);
      this.snackBar.open(error.message || this.translate.instant('editMember.messages.updateFailed'), this.translate.instant('common.close'), { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }

  private initEmptySchedule(): void {
    const defaultDay: DaySchedule = { morning: 4, afternoon: 4 };
    this.scheduleWeek1 = Array.from({ length: 5 }, () => ({ ...defaultDay }));
    this.scheduleWeek2 = Array.from({ length: 5 }, () => ({ ...defaultDay }));
    this.referenceDate = this.getFirstMondayOfYear();
  }

  private getFirstMondayOfYear(): string {
    const year = new Date().getFullYear();
    const jan1 = new Date(year, 0, 1);
    const day = jan1.getDay();
    const daysToMonday = day === 0 ? 1 : (day === 1 ? 0 : 8 - day);
    const firstMonday = new Date(year, 0, 1 + daysToMonday);
    return firstMonday.toISOString().split('T')[0];
  }

  getWeek(index: number): DaySchedule[] {
    return index === 0 ? this.scheduleWeek1 : this.scheduleWeek2;
  }

  dayToString(d: DaySchedule): string {
    if (d.morning === 0 && d.afternoon === 0) return '0';
    if (d.morning === 4 && d.afternoon === 4) return '8';
    return `${d.morning}/${d.afternoon}`;
  }

  cycleDay(weekIndex: number, dayIndex: number): void {
    const week = this.getWeek(weekIndex);
    const current = week[dayIndex];
    const idx = this.dayValues.findIndex(v => v.morning === current.morning && v.afternoon === current.afternoon);
    week[dayIndex] = { ...this.dayValues[(idx + 1) % this.dayValues.length] };
  }

  loadHolidays(): void {
    this.holidaysLoading = true;
    this.holidayService.loadMemberHolidays(this.data.member.id).subscribe({
      next: h => { this.holidays = h; this.holidaysLoading = false; },
      error: () => { this.holidaysLoading = false; }
    });
  }

  openAddHoliday(): void {
    this.panelService.open<HolidayDialogComponent, HolidayDialogData, HolidayDialogResult>(
      HolidayDialogComponent,
      { data: { mode: 'add', memberId: this.data.member.id } }
    ).afterClosed().subscribe(r => { if (r) this.loadHolidays(); });
  }

  openEditHoliday(period: MemberHolidayPeriod): void {
    this.panelService.open<HolidayDialogComponent, HolidayDialogData, HolidayDialogResult>(
      HolidayDialogComponent,
      { data: { mode: 'edit', memberId: this.data.member.id, period } }
    ).afterClosed().subscribe(r => { if (r) this.loadHolidays(); });
  }

  removeHoliday(period: MemberHolidayPeriod, event: Event): void {
    event.stopPropagation();
    this.removingHolidayId = period.id;
    this.holidayService.removeHoliday(period.id).subscribe({
      next: () => { this.removingHolidayId = null; this.loadHolidays(); },
      error: () => { this.removingHolidayId = null; }
    });
  }

  formatHolidayPeriod(period: MemberHolidayPeriod): string {
    const locale = this.translate.currentLang === 'nl' ? 'nl-NL' : 'en-US';
    const start = new Date(period.startDate + 'T00:00:00');
    if (period.startDate === period.endDate) {
      return start.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
    }
    const end = new Date(period.endDate + 'T00:00:00');
    return `${start.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`;
  }

  async onResetPassword(): Promise<void> {
    if (!this.isPasswordFormValid) return;

    this.resettingPassword = true;
    try {
      const result: any = await apolloClient.mutate({
        mutation: RESET_PASSWORD_MUTATION,
        variables: {
          memberId: this.data.member.id,
          newPassword: this.resetPasswordForm.newPassword
        }
      });

      if (result.data.resetPassword.success) {
        this.snackBar.open(this.translate.instant('editMember.messages.passwordReset'), this.translate.instant('common.close'), { duration: 3000 });
        this.resetPasswordForm = { newPassword: '', confirmPassword: '' };
      } else {
        this.snackBar.open(result.data.resetPassword.message || this.translate.instant('editMember.messages.passwordResetFailed'), this.translate.instant('common.close'), { duration: 5000 });
      }
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      this.snackBar.open(error.message || this.translate.instant('editMember.messages.passwordResetFailed'), this.translate.instant('common.close'), { duration: 5000 });
    } finally {
      this.resettingPassword = false;
    }
  }
}
