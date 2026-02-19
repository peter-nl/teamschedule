import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService } from '../services/auth.service';
import { UserPreferencesService } from '../services/user-preferences.service';
import { SlideInPanelRef, SlideInPanelService, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';
import { MemberSchedule } from '../models/member.model';
import { ScheduleService } from '../../features/schedule/services/schedule.service';
import { MemberHolidayService, MemberHolidayPeriod } from '../../core/services/member-holiday.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { MemberEditDialogComponent, MemberEditDialogData } from './member-edit-dialog.component';

interface MemberFull {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
  role: string;
  teams: { id: string; name: string }[];
}

export interface MemberDetailDialogData {
  memberId: string;
  leftOffset?: string;
}

export interface MemberDetailDialogResult {
  action: 'saved' | 'deleted';
}

const GET_MEMBERS_QUERY = gql`
  query GetMembers {
    members {
      id
      firstName
      lastName
      particles
      email
      role
      teams { id, name }
    }
  }
`;

const GET_TEAMS_QUERY = gql`
  query GetTeams {
    teams { id, name }
  }
`;

const DELETE_MEMBER_MUTATION = gql`
  mutation DeleteMember($id: ID!) {
    deleteMember(id: $id)
  }
`;

@Component({
  selector: 'app-member-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    TranslateModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon>person</mat-icon>
          {{ 'memberDetail.title' | translate }}
        </h2>
        <button class="panel-close" (click)="panelRef.close(hasChanges ? { action: 'saved' } : undefined)">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">
        <div *ngIf="loadingData" class="loading">
          <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
        </div>

        <div *ngIf="!loadingData && member" class="detail-content">
          <div class="detail-row">
            <span class="detail-label">{{ 'memberDetail.memberId' | translate }}</span>
            <span class="detail-value">{{ member.id }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">{{ 'memberDetail.name' | translate }}</span>
            <span class="detail-value">{{ memberDisplayName }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">{{ 'memberDetail.email' | translate }}</span>
            <span class="detail-value" [class.muted]="!member.email">{{ member.email || ('memberDetail.notSet' | translate) }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">{{ 'memberDetail.role' | translate }}</span>
            <span class="detail-value role-badge" [class.manager]="member.role === 'manager'">
              <mat-icon>{{ member.role === 'manager' ? 'admin_panel_settings' : 'person' }}</mat-icon>
              {{ (member.role === 'manager' ? 'common.manager' : 'common.user') | translate }}
            </span>
          </div>

          <div class="detail-row" *ngIf="member.teams.length > 0">
            <span class="detail-label">{{ 'memberDetail.teams' | translate }}</span>
            <div class="teams-list">
              <mat-chip-set>
                <mat-chip *ngFor="let team of member.teams">{{ team.name }}</mat-chip>
              </mat-chip-set>
            </div>
          </div>

          <div class="detail-row" *ngIf="member.teams.length === 0">
            <span class="detail-label">{{ 'memberDetail.teams' | translate }}</span>
            <span class="detail-value muted">{{ 'memberDetail.noTeams' | translate }}</span>
          </div>

          <div class="detail-row" *ngIf="memberSchedule">
            <span class="detail-label">{{ 'memberSchedule.title' | translate }}</span>
            <div *ngFor="let weekLabel of ['weekA', 'weekB']; let wi = index" class="schedule-week-display">
              <div class="week-label-display">{{ 'memberSchedule.' + weekLabel | translate }}</div>
              <div class="schedule-grid-display">
                <div class="sgd-day-header" *ngFor="let key of dayLabelKeys">{{ key | translate }}</div>
                <div class="sgd-cell" *ngFor="let d of (wi === 0 ? memberSchedule.week1 : memberSchedule.week2)"
                     [class.off]="d.morning === 0 && d.afternoon === 0"
                     [class.half-day]="(d.morning === 0) !== (d.afternoon === 0)">{{ dayToString(d) }}</div>
              </div>
            </div>
          </div>

          <div class="detail-row">
            <span class="detail-label">{{ 'profile.holidays.title' | translate }}</span>
            <div *ngIf="holidaysLoading" style="display:flex; align-items:center; gap:8px; padding:4px 0;">
              <mat-spinner diameter="16"></mat-spinner>
            </div>
            <div *ngIf="!holidaysLoading && holidays.length === 0" class="holidays-empty">
              {{ 'profile.holidays.empty' | translate }}
            </div>
            <div *ngIf="!holidaysLoading && holidays.length > 0" class="holidays-list-ro">
              <div *ngFor="let h of holidays" class="holiday-item-ro">
                <div class="holiday-type-dot" *ngIf="h.holidayType"
                     [style.background]="isDark ? h.holidayType.colorDark : h.holidayType.colorLight"></div>
                <div class="holiday-info-ro">
                  <span class="holiday-date-ro">{{ formatHolidayPeriod(h) }}</span>
                  <span *ngIf="h.description" class="holiday-desc-ro">{{ h.description }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-actions" *ngIf="!loadingData && member">
        <button mat-icon-button color="warn"
                *ngIf="canDelete"
                (click)="onDelete()"
                [disabled]="deleting"
                [matTooltip]="'common.delete' | translate">
          <mat-spinner *ngIf="deleting" diameter="18"></mat-spinner>
          <mat-icon *ngIf="!deleting">delete</mat-icon>
        </button>
        <span class="spacer"></span>
        <button mat-icon-button (click)="panelRef.close(hasChanges ? { action: 'saved' } : undefined)" [disabled]="deleting" [matTooltip]="'common.close' | translate">
          <mat-icon>close</mat-icon>
        </button>
        <button *ngIf="canEdit" mat-icon-button color="primary" (click)="openEdit()" [matTooltip]="'common.edit' | translate">
          <mat-icon>edit</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-value {
      font-size: 16px;
      color: var(--mat-sys-on-surface);
    }

    .detail-value.muted {
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .role-badge mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--mat-sys-on-surface-variant);
    }

    .role-badge.manager mat-icon {
      color: var(--mat-sys-primary);
    }

    .teams-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .delete-button {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 4px;
    }

    .schedule-week-display {
      margin: 8px 0;
    }

    .week-label-display {
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--mat-sys-on-surface-variant);
    }

    .schedule-grid-display {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 8px;
      overflow: hidden;
      font-size: 13px;
    }

    .sgd-day-header {
      text-align: center;
      padding: 4px 2px;
      font-size: 11px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container);
      border-right: 1px solid var(--mat-sys-outline-variant);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .sgd-day-header:last-of-type {
      border-right: none;
    }

    .sgd-cell {
      text-align: center;
      padding: 4px 2px;
      border-right: 1px solid var(--mat-sys-outline-variant);
    }

    .sgd-cell:last-child {
      border-right: none;
    }

    .sgd-cell.off {
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
    }

    .sgd-cell.half-day {
      color: var(--mat-sys-primary);
    }

    .holidays-empty {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
      padding: 4px 0;
    }

    .holidays-list-ro {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .holiday-item-ro {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
    }

    .holiday-type-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .holiday-info-ro {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .holiday-date-ro {
      font-size: 13px;
      color: var(--mat-sys-on-surface);
    }

    .holiday-desc-ro {
      font-size: 11px;
      color: var(--mat-sys-on-surface-variant);
    }

  `]
})
export class MemberDetailDialogComponent implements OnInit {
  member: MemberFull | null = null;
  allTeams: { id: string; name: string }[] = [];
  loadingData = true;
  deleting = false;
  hasChanges = false;
  memberSchedule: MemberSchedule | null = null;
  dayLabelKeys = ['days.abbr.mo', 'days.abbr.tu', 'days.abbr.we', 'days.abbr.th', 'days.abbr.fr'];
  holidays: MemberHolidayPeriod[] = [];
  holidaysLoading = false;
  isDark = false;
  private managementModeEnabled = false;

  constructor(
    public panelRef: SlideInPanelRef<MemberDetailDialogComponent, MemberDetailDialogResult>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: MemberDetailDialogData,
    private authService: AuthService,
    private userPreferencesService: UserPreferencesService,
    private snackBar: MatSnackBar,
    private panelService: SlideInPanelService,
    private translate: TranslateService,
    private scheduleService: ScheduleService,
    private holidayService: MemberHolidayService
  ) {
    this.managementModeEnabled = this.userPreferencesService.preferences.managementMode;
    this.userPreferencesService.preferences$.subscribe(prefs => {
      this.managementModeEnabled = prefs.managementMode;
    });
    this.userPreferencesService.isDarkTheme$.subscribe(dark => { this.isDark = dark; });
  }

  ngOnInit(): void {
    this.loadData();
  }

  get memberDisplayName(): string {
    if (!this.member) return '';
    const parts = [this.member.firstName];
    if (this.member.particles) parts.push(this.member.particles);
    parts.push(this.member.lastName);
    return parts.join(' ');
  }

  private get isSelf(): boolean {
    return this.member?.id === this.authService.currentUser?.id;
  }

  private get isManager(): boolean {
    return this.authService.isManager && this.managementModeEnabled;
  }

  get canEdit(): boolean {
    return this.isSelf || this.isManager;
  }

  get canDelete(): boolean {
    return this.isManager && !this.isSelf;
  }

  private async loadData(): Promise<void> {
    this.loadingData = true;
    try {
      const [membersResult, teamsResult]: any[] = await Promise.all([
        apolloClient.query({ query: GET_MEMBERS_QUERY, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GET_TEAMS_QUERY, fetchPolicy: 'network-only' })
      ]);

      this.allTeams = teamsResult.data.teams;
      const members: MemberFull[] = membersResult.data.members;
      this.member = members.find(m => m.id === this.data.memberId) || null;
      this.memberSchedule = this.scheduleService.getMemberSchedule(this.data.memberId) || null;
      this.loadHolidays();
    } catch (error) {
      console.error('Failed to load member data:', error);
      this.snackBar.open(this.translate.instant('memberDetail.messages.loadFailed'), this.translate.instant('common.close'), { duration: 3000 });
    } finally {
      this.loadingData = false;
    }
  }

  dayToString(d: { morning: number; afternoon: number }): string {
    if (d.morning === 0 && d.afternoon === 0) return '0';
    if (d.morning === 4 && d.afternoon === 4) return '8';
    return `${d.morning}/${d.afternoon}`;
  }

  private loadHolidays(): void {
    this.holidaysLoading = true;
    this.holidayService.loadMemberHolidays(this.data.memberId).subscribe({
      next: h => { this.holidays = h; this.holidaysLoading = false; },
      error: () => { this.holidaysLoading = false; }
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

  openEdit(): void {
    if (!this.member) return;

    const editRef = this.panelService.open<MemberEditDialogComponent, MemberEditDialogData, boolean>(
      MemberEditDialogComponent,
      {
        leftOffset: this.data.leftOffset,
        data: {
          member: { ...this.member, teams: [...this.member.teams] },
          allTeams: this.allTeams,
          isSelf: this.isSelf,
          isManager: this.isManager
        }
      }
    );

    editRef.afterClosed().subscribe(saved => {
      if (saved) {
        this.hasChanges = true;
        this.loadData();
      }
    });
  }

  onDelete(): void {
    if (!this.member) return;

    const confirmRef = this.panelService.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: this.translate.instant('memberDetail.deleteTitle'),
        message: this.translate.instant('memberDetail.deleteMessage', { name: this.memberDisplayName }),
        confirmText: this.translate.instant('common.delete'),
        confirmColor: 'warn'
      }
    });

    confirmRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteMember();
      }
    });
  }

  private async deleteMember(): Promise<void> {
    if (!this.member) return;

    this.deleting = true;
    try {
      await apolloClient.mutate({
        mutation: DELETE_MEMBER_MUTATION,
        variables: { id: this.member.id }
      });

      this.snackBar.open(this.translate.instant('memberDetail.messages.deleted'), this.translate.instant('common.close'), { duration: 3000 });
      this.panelRef.close({ action: 'deleted' });
    } catch (error: any) {
      console.error('Failed to delete member:', error);
      this.snackBar.open(error.message || this.translate.instant('memberDetail.messages.deleteFailed'), this.translate.instant('common.close'), { duration: 5000 });
    } finally {
      this.deleting = false;
    }
  }
}
