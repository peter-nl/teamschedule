import { Component, Inject, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { NotificationService } from '../services/notification.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService } from '../services/auth.service';
import { UserPreferencesService } from '../services/user-preferences.service';
import { SlideInPanelRef, SlideInPanelService, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';
import { UiEventService } from '../services/ui-event.service';
import { MemberSchedule } from '../models/member.model';
import { ScheduleService } from '../../features/schedule/services/schedule.service';
import { MemberHolidayService, MemberHolidayPeriod } from '../../core/services/member-holiday.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { MemberEditDialogComponent, MemberEditDialogData } from './member-edit-dialog.component';

interface MemberFull {
  id: string;
  memberNo: number;
  username: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
  role: string;
  scheduleDisabled: boolean;
  isOrgAdmin: boolean;
  adminOfTeams: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  phone: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
}

export interface MemberDetailDialogData {
  memberId: string;
  leftOffset?: string;
}

export interface MemberDetailDialogResult {
  action: 'saved' | 'deleted';
}

const GET_MEMBER_QUERY = gql`
  query GetMemberDetail($id: String!) {
    memberProfile(id: $id) {
      id
      memberNo
      username
      firstName
      lastName
      particles
      email
      role
      scheduleDisabled
      isOrgAdmin
      adminOfTeams { id name }
      teams { id name }
      phone
      dateOfBirth
      avatarUrl
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

const UPDATE_USERNAME_MUTATION = gql`
  mutation UpdateUsername($id: String!, $username: String!) {
    updateUsername(id: $id, username: $username) { id username }
  }
`;

const UPDATE_EXTENDED_MUTATION = gql`
  mutation UpdateMemberExtended(
    $id: String!, $firstName: String!, $lastName: String!,
    $particles: String, $email: String, $phone: String, $dateOfBirth: String
  ) {
    updateMemberProfile(id: $id, firstName: $firstName, lastName: $lastName,
      particles: $particles, email: $email, phone: $phone, dateOfBirth: $dateOfBirth) {
      id phone dateOfBirth
    }
  }
`;

const UPDATE_AVATAR_MUTATION = gql`
  mutation UpdateMemberAvatar($id: String!, $firstName: String!, $lastName: String!, $avatarUrl: String) {
    updateMemberProfile(id: $id, firstName: $firstName, lastName: $lastName, avatarUrl: $avatarUrl) {
      id avatarUrl
    }
  }
`;

@Component({
  selector: 'app-member-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatTooltipModule,
    MatChipsModule,
    TranslateModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <div class="header-avatar-section" *ngIf="member">
          <div class="avatar-wrapper"
               [class.clickable]="canEdit"
               (click)="canEdit ? triggerAvatarUpload() : null"
               [matTooltip]="canEdit ? ('profile.uploadAvatar' | translate) : ''">
            <img *ngIf="safeAvatarUrl" [src]="safeAvatarUrl" class="avatar-img" alt="">
            <mat-icon *ngIf="!safeAvatarUrl" class="avatar-icon">account_circle</mat-icon>
            <div class="avatar-overlay" *ngIf="canEdit">
              <mat-icon class="camera-icon">photo_camera</mat-icon>
            </div>
          </div>
          <input #avatarFileInput type="file" accept="image/*" style="display:none"
                 (change)="onAvatarFileSelected($event)">
          <div class="header-info">
            <span class="member-name">{{ memberDisplayName }}</span>
            <div class="member-meta">
              <span class="member-no-badge" *ngIf="member.memberNo">#{{ member.memberNo }}</span>
              <span class="member-username">{{ member.username }}</span>
            </div>
          </div>
        </div>
        <div class="header-avatar-section" *ngIf="!member && !loadingData">
          <mat-icon class="avatar-icon">account_circle</mat-icon>
        </div>
        <span class="header-spacer"></span>
        <button class="panel-close" (click)="panelRef.close(hasChanges ? { action: 'saved' } : undefined)">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-divider></mat-divider>

      <div class="panel-content">
        <div *ngIf="loadingData" class="loading">
          <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
        </div>

        <div *ngIf="!loadingData && member" class="detail-content">

          <!-- Email -->
          <div class="detail-row">
            <span class="detail-label">{{ 'memberDetail.email' | translate }}</span>
            <span class="detail-value" [class.muted]="!member.email">{{ member.email || ('memberDetail.notSet' | translate) }}</span>
          </div>

          <!-- Username – editable for canEdit -->
          <div class="detail-row" *ngIf="canEdit">
            <span class="detail-label">{{ 'members.username' | translate }}</span>
            <mat-form-field appearance="outline" class="inline-field">
              <input matInput [(ngModel)]="editUsername" (blur)="onUsernameBlur()">
            </mat-form-field>
          </div>
          <div class="detail-row" *ngIf="!canEdit">
            <span class="detail-label">{{ 'members.username' | translate }}</span>
            <span class="detail-value">{{ member.username }}</span>
          </div>

          <!-- Phone – editable for canEdit -->
          <div class="detail-row" *ngIf="canEdit">
            <span class="detail-label">{{ 'profile.phone' | translate }}</span>
            <mat-form-field appearance="outline" class="inline-field">
              <input matInput type="tel" [(ngModel)]="editPhone" (blur)="onExtendedBlur()">
            </mat-form-field>
          </div>
          <div class="detail-row" *ngIf="!canEdit && member.phone">
            <span class="detail-label">{{ 'profile.phone' | translate }}</span>
            <span class="detail-value">{{ member.phone }}</span>
          </div>

          <!-- Date of birth – editable for canEdit -->
          <div class="detail-row" *ngIf="canEdit">
            <span class="detail-label">{{ 'profile.dateOfBirth' | translate }}</span>
            <mat-form-field appearance="outline" class="inline-field">
              <input matInput type="date" [(ngModel)]="editDateOfBirth" (blur)="onExtendedBlur()">
            </mat-form-field>
          </div>
          <div class="detail-row" *ngIf="!canEdit && member.dateOfBirth">
            <span class="detail-label">{{ 'profile.dateOfBirth' | translate }}</span>
            <span class="detail-value">{{ member.dateOfBirth }}</span>
          </div>

          <!-- Teams -->
          <div class="detail-row">
            <span class="detail-label">{{ 'memberDetail.teams' | translate }}</span>
            <div class="teams-list" *ngIf="member.teams.length > 0">
              <mat-chip-set>
                <mat-chip *ngFor="let team of member.teams">{{ team.name }}</mat-chip>
              </mat-chip-set>
            </div>
            <span class="detail-value muted" *ngIf="member.teams.length === 0">{{ 'memberDetail.noTeams' | translate }}</span>
          </div>

          <!-- Work schedule -->
          <div class="detail-row" *ngIf="memberSchedule">
            <span class="detail-label">{{ 'memberSchedule.title' | translate }}</span>
            <div style="flex:1">
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
          </div>

          <!-- Schedule disabled toggle (self only, non-sysadmin) -->
          <div class="detail-row" *ngIf="isSelf && !authService.isSysadmin">
            <span class="detail-label">{{ 'account.scheduleDisabled' | translate }}</span>
            <div class="detail-value toggle-row">
              <mat-slide-toggle
                [checked]="member.scheduleDisabled"
                [disabled]="scheduleDisabledLoading"
                (change)="onScheduleDisabledChange($event.checked)">
              </mat-slide-toggle>
              <span class="toggle-hint">{{ 'account.scheduleDisabledHint' | translate }}</span>
            </div>
          </div>

          <!-- Holidays -->
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
        <button mat-button *ngIf="isSelf" (click)="openChangePassword()" class="change-pw-btn">
          <mat-icon>lock</mat-icon>
          {{ 'shell.account.changePassword' | translate }}
        </button>
        <span class="spacer"></span>
        <button mat-icon-button (click)="panelRef.close(hasChanges ? { action: 'saved' } : undefined)"
                [disabled]="deleting"
                [matTooltip]="'common.close' | translate">
          <mat-icon>close</mat-icon>
        </button>
        <button *ngIf="canEdit" mat-icon-button color="primary" (click)="openEdit()"
                [matTooltip]="'common.edit' | translate">
          <mat-icon>edit</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .panel-header {
      display: flex;
      align-items: center;
      padding: 16px 8px 16px 20px;
      gap: 8px;
      flex-shrink: 0;
    }

    .header-avatar-section {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      min-width: 0;
    }

    .avatar-wrapper {
      position: relative;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
    }

    .avatar-wrapper.clickable {
      cursor: pointer;
    }

    .avatar-img {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    .avatar-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: var(--mat-sys-on-surface-variant);
    }

    .avatar-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.45);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.15s;
    }

    .avatar-wrapper.clickable:hover .avatar-overlay {
      opacity: 1;
    }

    .camera-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: #fff;
    }

    .header-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .member-name {
      font-size: 18px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .member-meta {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .member-no-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container);
      border-radius: 10px;
      padding: 1px 7px;
    }

    .member-username {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    .header-spacer {
      flex: 1;
    }

    .panel-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      color: var(--mat-sys-on-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .panel-close:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 8px 20px 8px 20px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 0;
      width: 100%;
    }

    .detail-row {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 16px;
      padding: 8px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      width: 130px;
      min-width: 130px;
      flex-shrink: 0;
      padding-top: 10px;
    }

    .detail-value {
      font-size: 14px;
      color: var(--mat-sys-on-surface);
      flex: 1;
      padding-top: 8px;
    }

    .detail-value.muted {
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
    }

    .inline-field {
      flex: 1;
      font-size: 14px;
    }

    .inline-field .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .teams-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      flex: 1;
      padding-top: 4px;
    }

    .toggle-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-top: 4px !important;
    }

    .toggle-hint {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .schedule-week-display {
      margin: 4px 0;
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
      flex: 1;
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

    .panel-actions {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      gap: 4px;
      border-top: 1px solid var(--mat-sys-outline-variant);
      flex-shrink: 0;
    }

    .spacer {
      flex: 1;
    }

    .change-pw-btn {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    button mat-spinner {
      display: inline-block;
    }
  `]
})
export class MemberDetailDialogComponent implements OnInit {
  @ViewChild('avatarFileInput') avatarFileInput!: ElementRef<HTMLInputElement>;

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
  scheduleDisabledLoading = false;

  // Editable field models
  editUsername = '';
  editPhone = '';
  editDateOfBirth = '';
  private savedUsername = '';
  private savedPhone = '';
  private savedDateOfBirth = '';

  constructor(
    public panelRef: SlideInPanelRef<MemberDetailDialogComponent, MemberDetailDialogResult>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: MemberDetailDialogData,
    public authService: AuthService,
    private userPreferencesService: UserPreferencesService,
    private notificationService: NotificationService,
    private panelService: SlideInPanelService,
    private translate: TranslateService,
    private scheduleService: ScheduleService,
    private holidayService: MemberHolidayService,
    private uiEventService: UiEventService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {
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

  get safeAvatarUrl(): SafeUrl | null {
    if (!this.member?.avatarUrl) return null;
    return this.member.avatarUrl.startsWith('data:')
      ? this.sanitizer.bypassSecurityTrustUrl(this.member.avatarUrl)
      : this.member.avatarUrl;
  }

  get isSelf(): boolean {
    return this.member?.id === this.authService.currentUser?.id;
  }

  private get isManager(): boolean {
    return this.authService.isAnyAdmin || this.authService.isSysadmin;
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
      const [memberResult, teamsResult]: any[] = await Promise.all([
        apolloClient.query({ query: GET_MEMBER_QUERY, variables: { id: this.data.memberId }, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GET_TEAMS_QUERY, fetchPolicy: 'network-only' })
      ]);

      this.allTeams = teamsResult.data.teams;
      this.member = memberResult.data.memberProfile || null;
      if (this.member) {
        this.editUsername = this.member.username;
        this.savedUsername = this.member.username;
        this.editPhone = this.member.phone ?? '';
        this.savedPhone = this.member.phone ?? '';
        this.editDateOfBirth = this.member.dateOfBirth ?? '';
        this.savedDateOfBirth = this.member.dateOfBirth ?? '';
      }
      this.memberSchedule = this.scheduleService.getMemberSchedule(this.data.memberId) || null;
      this.loadHolidays();
    } catch (error) {
      console.error('Failed to load member data:', error);
      this.notificationService.error(this.translate.instant('memberDetail.messages.loadFailed'));
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

  triggerAvatarUpload(): void {
    this.avatarFileInput?.nativeElement.click();
  }

  onAvatarFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.member) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      apolloClient.mutate({
        mutation: UPDATE_AVATAR_MUTATION,
        variables: {
          id: this.member!.id,
          firstName: this.member!.firstName,
          lastName: this.member!.lastName,
          avatarUrl: dataUrl
        }
      }).then(() => {
        this.member!.avatarUrl = dataUrl;
        this.hasChanges = true;
        this.cdr.markForCheck();
      }).catch(() => {
        this.notificationService.error(this.translate.instant('profile.messages.updateFailed'));
      });
    };
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }

  onUsernameBlur(): void {
    const trimmed = this.editUsername.trim();
    if (!trimmed || trimmed === this.savedUsername) return;
    if (!this.member) return;
    apolloClient.mutate({
      mutation: UPDATE_USERNAME_MUTATION,
      variables: { id: this.member.id, username: trimmed }
    }).then(() => {
      this.savedUsername = trimmed;
      this.editUsername = trimmed;
      this.member!.username = trimmed;
      this.hasChanges = true;
      this.notificationService.success(this.translate.instant('profile.messages.updateSaved'));
    }).catch((err: any) => {
      this.editUsername = this.savedUsername;
      const msg = err?.graphQLErrors?.[0]?.message || this.translate.instant('profile.messages.updateFailed');
      this.notificationService.error(msg);
      this.cdr.markForCheck();
    });
  }

  onExtendedBlur(): void {
    if (!this.member) return;
    if (this.editPhone === this.savedPhone && this.editDateOfBirth === this.savedDateOfBirth) return;
    apolloClient.mutate({
      mutation: UPDATE_EXTENDED_MUTATION,
      variables: {
        id: this.member.id,
        firstName: this.member.firstName,
        lastName: this.member.lastName,
        particles: this.member.particles || null,
        email: this.member.email || null,
        phone: this.editPhone || null,
        dateOfBirth: this.editDateOfBirth || null
      }
    }).then(() => {
      this.savedPhone = this.editPhone;
      this.savedDateOfBirth = this.editDateOfBirth;
      this.member!.phone = this.editPhone || null;
      this.member!.dateOfBirth = this.editDateOfBirth || null;
      this.hasChanges = true;
    }).catch(() => {
      this.editPhone = this.savedPhone;
      this.editDateOfBirth = this.savedDateOfBirth;
      this.notificationService.error(this.translate.instant('profile.messages.updateFailed'));
      this.cdr.markForCheck();
    });
  }

  onScheduleDisabledChange(disabled: boolean): void {
    this.scheduleDisabledLoading = true;
    this.authService.updateScheduleDisabled(disabled).subscribe({
      next: () => {
        this.scheduleDisabledLoading = false;
        this.member!.scheduleDisabled = disabled;
        this.hasChanges = true;
        this.uiEventService.scheduleReload$.next();
      },
      error: () => {
        this.scheduleDisabledLoading = false;
        this.notificationService.error(this.translate.instant('common.error'));
      }
    });
  }

  openChangePassword(): void {
    // Lazy import to avoid circular deps
    import('./change-password-panel.component').then(m => {
      this.panelService.open(m.ChangePasswordPanelComponent, {
        leftOffset: this.data.leftOffset
      });
    });
  }

  openEdit(): void {
    if (!this.member) return;

    const editRef = this.panelService.open<MemberEditDialogComponent, MemberEditDialogData, boolean>(
      MemberEditDialogComponent,
      {
        leftOffset: this.data.leftOffset,
        data: {
          leftOffset: this.data.leftOffset,
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

      this.notificationService.success(this.translate.instant('memberDetail.messages.deleted'));
      this.panelRef.close({ action: 'deleted' });
    } catch (error: any) {
      console.error('Failed to delete member:', error);
      this.notificationService.error(error.message || this.translate.instant('memberDetail.messages.deleteFailed'));
    } finally {
      this.deleting = false;
    }
  }
}
