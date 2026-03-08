import { Component, Input, OnInit, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NotificationService } from '../../shared/services/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { AuthService } from '../../shared/services/auth.service';
import { SlideInPanelService } from '../../shared/services/slide-in-panel.service';
import { UserPreferencesService } from '../../shared/services/user-preferences.service';
import { AddTeamDialogComponent } from '../../shell/add-team-dialog.component';
import { ManageOrgSettingsComponent } from './manage-org-settings.component';

interface MemberRef {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
}

interface Team {
  id: string;
  name: string;
  teamAdmins: MemberRef[];
  members: MemberRef[];
}

const GET_ORG_DATA = gql`
  query GetOrgManagementData($orgId: ID) {
    organisation(orgId: $orgId) {
      id name
    }
    orgAdmins(orgId: $orgId) {
      id firstName lastName particles
    }
    teams(orgId: $orgId) {
      id name
      teamAdmins { id firstName lastName particles }
      members { id firstName lastName particles }
    }
    members(orgId: $orgId) {
      id firstName lastName particles
    }
  }
`;

const GET_ORG_LIST = gql`
  query GetOrgList {
    organisations { id name }
  }
`;

const GET_ORG_SETTINGS_FOR_EXPORT = gql`
  query GetOrgSettingsForExport($orgId: ID) {
    orgSettings(orgId: $orgId) {
      workingDays weekStartDay scheduleStartDate scheduleEndDate
      nonWorkingDayColorLight nonWorkingDayColorDark
      holidayColorLight holidayColorDark
      scheduledDayOffColorLight scheduledDayOffColorDark
      noContractColorLight noContractColorDark
    }
  }
`;

const SAVE_ORG_SETTINGS = gql`
  mutation SaveOrgSettings($settings: OrgSettingsInput!, $orgId: ID) {
    saveOrgSettings(settings: $settings, orgId: $orgId) {
      workingDays weekStartDay
    }
  }
`;

const IMPORT_TEAM_MEMBERSHIPS = gql`
  mutation ImportTeamMemberships($teams: [TeamMembershipImportInput!]!, $orgId: ID) {
    importTeamMemberships(teams: $teams, orgId: $orgId) {
      success message importedCount skippedCount
    }
  }
`;

const ASSIGN_ORG_ADMIN = gql`mutation AssignOrgAdmin($memberId: String!, $orgId: ID) { assignOrgAdmin(memberId: $memberId, orgId: $orgId) }`;
const REMOVE_ORG_ADMIN = gql`mutation RemoveOrgAdmin($memberId: String!, $orgId: ID) { removeOrgAdmin(memberId: $memberId, orgId: $orgId) }`;
const ASSIGN_TEAM_ADMIN = gql`mutation AssignTeamAdmin($memberId: String!, $teamId: Int!, $orgId: ID) { assignTeamAdmin(memberId: $memberId, teamId: $teamId, orgId: $orgId) }`;
const REMOVE_TEAM_ADMIN = gql`mutation RemoveTeamAdmin($memberId: String!, $teamId: Int!) { removeTeamAdmin(memberId: $memberId, teamId: $teamId) }`;
const ADD_MEMBER_TO_TEAM = gql`
  mutation AddMemberToTeam($teamId: ID!, $memberId: ID!) {
    addMemberToTeam(teamId: $teamId, memberId: $memberId) { id name }
  }
`;
const REMOVE_MEMBER_FROM_TEAM = gql`
  mutation RemoveMemberFromTeam($teamId: ID!, $memberId: ID!) {
    removeMemberFromTeam(teamId: $teamId, memberId: $memberId) { id name }
  }
`;
const UPDATE_TEAM = gql`
  mutation UpdateTeam($id: ID!, $name: String!) {
    updateTeam(id: $id, name: $name) { id name }
  }
`;

@Component({
  selector: 'app-manage-org',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    TranslateModule,
    ManageOrgSettingsComponent,
  ],
  template: `
    <!-- Sysadmin org picker -->
    <div *ngIf="authService.isSysadmin" class="org-picker-bar">
      <mat-icon class="org-picker-icon">admin_panel_settings</mat-icon>
      <select class="org-picker-select" [(ngModel)]="selectedOrgId" (ngModelChange)="onOrgSelected()">
        <option value="">{{ 'sysadmin.selectOrg' | translate }}</option>
        <option *ngFor="let org of orgList" [value]="org.id">{{ org.name }}</option>
      </select>
    </div>

    <!-- Nothing selected yet (sysadmin only) -->
    <div *ngIf="authService.isSysadmin && !selectedOrgId" class="no-org-selected">
      <mat-icon>corporate_fare</mat-icon>
      <p>{{ 'sysadmin.selectOrgPrompt' | translate }}</p>
    </div>

    <ng-container *ngIf="!authService.isSysadmin || selectedOrgId">
    <ng-container *ngIf="!loading; else loadingTpl">
      <div class="org-layout">

        <!-- ORG VIEW: org name bar + scrollable content (admins + settings) -->
        <ng-container *ngIf="view === 'org'">
          <!-- Fixed org name bar -->
          <div class="org-name-bar" *ngIf="organisation">
            <mat-icon class="org-icon">corporate_fare</mat-icon>
            <h2 class="org-name">{{ organisation.name }}</h2>
          </div>
          <!-- Scrollable content area -->
          <div class="org-view-scroll">
            <!-- Org admins section -->
            <div class="section-block" *ngIf="canManageOrgAdmins">
              <div class="section-row">
                <span class="section-label">{{ 'org.admins' | translate }}</span>
                <div class="chips-row">
                  <span *ngFor="let a of orgAdmins" class="chip">
                    <span class="chip-label">{{ fullName(a) }}</span>
                    <button class="chip-remove" (click)="removeOrgAdmin(a)">
                      <mat-icon>close</mat-icon>
                    </button>
                  </span>
                  <button *ngIf="!showAddOrgAdmin" mat-icon-button class="add-chip-btn"
                          (click)="showAddOrgAdmin = true"
                          [matTooltip]="'org.addAdmin' | translate">
                    <mat-icon>person_add</mat-icon>
                  </button>
                </div>
                <div *ngIf="showAddOrgAdmin" class="inline-add">
                  <select class="member-select" [(ngModel)]="selectedOrgAdminId">
                    <option value="">{{ 'common.select' | translate }}…</option>
                    <option *ngFor="let m of nonAdminMembers" [value]="m.id">{{ fullName(m) }}</option>
                  </select>
                  <button mat-flat-button (click)="addOrgAdmin()" [disabled]="!selectedOrgAdminId">{{ 'common.add' | translate }}</button>
                  <button mat-button (click)="showAddOrgAdmin = false; selectedOrgAdminId = ''">{{ 'common.cancel' | translate }}</button>
                </div>
              </div>
            </div>
            <mat-divider *ngIf="canManageOrgAdmins"></mat-divider>
            <!-- Organisation settings (date range, holidays, working days, colors, holiday types) -->
            <app-manage-org-settings></app-manage-org-settings>

            <mat-divider></mat-divider>

            <!-- Import / Export -->
            <div class="settings-section ie-section">
              <div class="ie-header">
                <mat-icon class="ie-icon">import_export</mat-icon>
                <div>
                  <h3 class="ie-title">{{ 'importExport.title' | translate }}</h3>
                  <p class="ie-desc">{{ 'importExport.orgSubtitle' | translate }}</p>
                </div>
              </div>

              <!-- Export -->
              <div class="ie-block">
                <h4 class="ie-block-title">{{ 'importExport.export.title' | translate }}</h4>
                <p class="ie-block-desc">{{ 'importExport.export.orgDescription' | translate }}</p>
                <button mat-flat-button (click)="exportOrgData()" [disabled]="exporting">
                  <mat-progress-spinner *ngIf="exporting" mode="indeterminate" diameter="16"></mat-progress-spinner>
                  <mat-icon *ngIf="!exporting">download</mat-icon>
                  {{ 'importExport.export.button' | translate }}
                </button>
              </div>

              <mat-divider></mat-divider>

              <!-- Import -->
              <div class="ie-block">
                <h4 class="ie-block-title">{{ 'importExport.import.title' | translate }}</h4>
                <p class="ie-block-desc">{{ 'importExport.import.orgDescription' | translate }}</p>

                <div class="ie-file-row">
                  <input type="file" #ieFileInput accept=".json"
                         (change)="onImportFileSelected($event)"
                         style="display: none">
                  <button mat-stroked-button (click)="ieFileInput.click()" [disabled]="importing">
                    <mat-icon>upload_file</mat-icon>
                    {{ 'importExport.import.selectFile' | translate }}
                  </button>
                  <span *ngIf="importFileName" class="ie-file-name">{{ importFileName }}</span>
                </div>

                <ng-container *ngIf="importFile">
                  <!-- What to import -->
                  <div class="ie-options">
                    <mat-checkbox [(ngModel)]="importOrgSettings">
                      {{ 'importExport.import.orgSettings' | translate }}
                    </mat-checkbox>
                    <mat-checkbox [(ngModel)]="importTeams">
                      {{ 'importExport.import.teamMemberships' | translate }}
                    </mat-checkbox>
                    <div *ngIf="importTeams" class="ie-team-picker">
                      <label class="ie-option-label">{{ 'importExport.import.whichTeams' | translate }}</label>
                      <div class="ie-radio-row">
                        <label class="ie-radio">
                          <input type="radio" [(ngModel)]="importTeamScope" value="all">
                          {{ 'importExport.import.allTeams' | translate }}
                          <span class="ie-team-count">({{ importFile.teams?.length || 0 }})</span>
                        </label>
                        <label class="ie-radio">
                          <input type="radio" [(ngModel)]="importTeamScope" value="specific">
                          {{ 'importExport.import.specificTeam' | translate }}
                        </label>
                      </div>
                      <select *ngIf="importTeamScope === 'specific'" class="member-select"
                              [(ngModel)]="importSpecificTeamName">
                        <option value="">{{ 'common.select' | translate }}…</option>
                        <option *ngFor="let t of importFile.teams" [value]="t.name">{{ t.name }}</option>
                      </select>
                    </div>
                  </div>

                  <button mat-flat-button color="primary"
                          (click)="runImport()"
                          [disabled]="importing || (!importOrgSettings && !importTeams)
                                      || (importTeams && importTeamScope === 'specific' && !importSpecificTeamName)"
                          class="ie-import-btn">
                    <mat-progress-spinner *ngIf="importing" mode="indeterminate" diameter="16"></mat-progress-spinner>
                    {{ 'importExport.import.importButton' | translate }}
                  </button>
                </ng-container>

                <div *ngIf="importResultMessage" class="ie-result"
                     [class.ie-result-success]="importResultSuccess"
                     [class.ie-result-error]="!importResultSuccess">
                  <mat-icon>{{ importResultSuccess ? 'check_circle' : 'error' }}</mat-icon>
                  {{ importResultMessage }}
                </div>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- MAIN BODY -->
        <div class="org-body" *ngIf="view === 'teams'">

          <!-- LEFT: team list -->
          <div class="list-pane">
            <div class="list-header">
              <button *ngIf="canCreateTeam" mat-icon-button
                      (click)="openAddTeam()"
                      [matTooltip]="'teams.addTeam' | translate">
                <mat-icon>group_add</mat-icon>
              </button>
              <input class="search-input"
                     [(ngModel)]="searchText"
                     (ngModelChange)="filterTeams()"
                     [placeholder]="'teams.searchTeams' | translate" />
              <button *ngIf="showMyTeamsToggle" mat-icon-button
                      (click)="toggleMyTeams()"
                      [class.active-toggle]="myTeamsFilter"
                      [matTooltip]="'org.myTeamsOnly' | translate">
                <mat-icon>{{ myTeamsFilter ? 'filter_alt' : 'filter_alt_off' }}</mat-icon>
              </button>
            </div>

            <div class="name-cols-header">
              <button class="col-header" (click)="toggleTeamSort()">
                <span>{{ 'teams.name' | translate }}</span>
                <mat-icon class="sort-icon">{{ teamSortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </button>
            </div>

            <div class="list-scroll">
              <div *ngFor="let team of filteredTeams"
                   class="list-item"
                   [class.selected]="selectedTeam?.id === team.id"
                   [class.my-team]="isMyTeam(team)"
                   (click)="selectTeam(team)">
                <span class="list-item-name">{{ team.name }}</span>
                <mat-icon *ngIf="isMyTeam(team)" class="my-team-icon">star</mat-icon>
              </div>
              <div *ngIf="filteredTeams.length === 0" class="list-empty">
                <mat-icon>group_off</mat-icon>
                <span>{{ 'teams.noTeamsFound' | translate }}</span>
              </div>
            </div>
          </div>

          <!-- RIGHT: team detail -->
          <div class="detail-pane">
            <div *ngIf="!selectedTeam" class="detail-empty">
              <mat-icon>groups</mat-icon>
              <p>{{ 'teams.selectPrompt' | translate }}</p>
            </div>

            <div *ngIf="selectedTeam" class="detail-content">

              <!-- Team header -->
              <div class="detail-header">
                <ng-container *ngIf="!editingTeamName; else teamNameEdit">
                  <span class="detail-name">{{ selectedTeam.name }}</span>
                  <button *ngIf="canEditSelectedTeam" mat-icon-button
                          (click)="startEditTeamName()"
                          [matTooltip]="'common.edit' | translate">
                    <mat-icon>edit</mat-icon>
                  </button>
                </ng-container>
                <ng-template #teamNameEdit>
                  <input class="team-name-input" [(ngModel)]="teamNameDraft" (keydown.enter)="saveTeamName()" />
                  <button mat-flat-button (click)="saveTeamName()">{{ 'common.save' | translate }}</button>
                  <button mat-button (click)="editingTeamName = false">{{ 'common.cancel' | translate }}</button>
                </ng-template>
              </div>

              <mat-divider></mat-divider>

              <!-- Team admins section (orgadmin only) -->
              <div class="section-block" *ngIf="canManageOrgAdmins">
                <div class="section-row">
                  <span class="section-label">{{ 'org.teamAdmins' | translate }}</span>
                  <div class="chips-row">
                    <span *ngFor="let a of selectedTeam.teamAdmins" class="chip">
                      <span class="chip-label">{{ fullName(a) }}</span>
                      <button class="chip-remove" (click)="removeTeamAdmin(a)">
                        <mat-icon>close</mat-icon>
                      </button>
                    </span>
                    <button *ngIf="!showAddTeamAdmin" mat-icon-button class="add-chip-btn"
                            (click)="showAddTeamAdmin = true"
                            [matTooltip]="'org.addTeamAdmin' | translate">
                      <mat-icon>person_add</mat-icon>
                    </button>
                  </div>
                  <!-- inline add team admin -->
                  <div *ngIf="showAddTeamAdmin" class="inline-add">
                    <select class="member-select" [(ngModel)]="selectedTeamAdminId">
                      <option value="">{{ 'common.select' | translate }}…</option>
                      <option *ngFor="let m of nonTeamAdminMembers" [value]="m.id">{{ fullName(m) }}</option>
                    </select>
                    <button mat-flat-button (click)="addTeamAdmin()" [disabled]="!selectedTeamAdminId">{{ 'common.add' | translate }}</button>
                    <button mat-button (click)="showAddTeamAdmin = false; selectedTeamAdminId = ''">{{ 'common.cancel' | translate }}</button>
                  </div>
                </div>
              </div>

              <mat-divider *ngIf="canManageOrgAdmins"></mat-divider>

              <!-- Members section -->
              <div class="members-section">
                <div class="members-header">
                  <span class="section-label">
                    {{ 'teams.members' | translate }} ({{ selectedTeam.members.length }})
                  </span>
                  <div *ngIf="canEditSelectedTeam" class="member-actions">
                    <button *ngIf="!showAddMember" mat-icon-button
                            (click)="showAddMember = true"
                            [matTooltip]="'teams.addMember' | translate">
                      <mat-icon>person_add</mat-icon>
                    </button>
                  </div>
                </div>

                <!-- inline add member -->
                <div *ngIf="showAddMember && canEditSelectedTeam" class="inline-add inline-add-member">
                  <select class="member-select" [(ngModel)]="selectedNewMemberId">
                    <option value="">{{ 'common.select' | translate }}…</option>
                    <option *ngFor="let m of nonTeamMembers" [value]="m.id">{{ fullName(m) }}</option>
                  </select>
                  <button mat-flat-button (click)="addMemberToTeam()" [disabled]="!selectedNewMemberId">{{ 'common.add' | translate }}</button>
                  <button mat-button (click)="showAddMember = false; selectedNewMemberId = ''">{{ 'common.cancel' | translate }}</button>
                </div>

                <div class="member-scroll">
                  <table class="member-table" *ngIf="selectedTeam.members.length > 0">
                    <thead>
                      <tr cdkDropList cdkDropListOrientation="horizontal" (cdkDropListDropped)="dropNameColumn($event)">
                        <th *ngFor="let col of nameColumns"
                            cdkDrag class="member-th"
                            [class.sort-active]="memberSortCol === col"
                            (click)="setMemberSort(col)">
                          <span>{{ columnLabel(col) | translate }}</span>
                          <mat-icon class="th-icon" *ngIf="memberSortCol === col">
                            {{ memberSortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                          </mat-icon>
                          <mat-icon class="th-icon drag-icon" *ngIf="memberSortCol !== col">drag_indicator</mat-icon>
                        </th>
                        <th class="member-th role-col"></th>
                        <th *ngIf="canEditSelectedTeam" class="member-th action-col"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let m of sortedMembers()">
                        <td *ngFor="let col of nameColumns" class="member-td">{{ getNamePart(m, col) }}</td>
                        <td class="member-td role-td">
                          <span *ngIf="memberRole(m) === 'orgAdmin'" class="role-badge role-org">{{ 'common.roleOrgAdmin' | translate }}</span>
                          <span *ngIf="memberRole(m) === 'teamAdmin'" class="role-badge role-team">{{ 'common.roleTeamAdmin' | translate }}</span>
                        </td>
                        <td *ngIf="canEditSelectedTeam" class="member-td action-td">
                          <button mat-icon-button class="remove-btn"
                                  (click)="removeMemberFromTeam(m)"
                                  [matTooltip]="'teams.removeMember' | translate">
                            <mat-icon>person_remove</mat-icon>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div *ngIf="selectedTeam.members.length === 0" class="member-empty">
                    <span>{{ 'teams.noMembersAssigned' | translate }}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </ng-container>
    </ng-container>

    <ng-template #loadingTpl>
      <div class="loading">
        <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
      </div>
    </ng-template>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
    }

    .org-picker-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--mat-sys-surface-container-low);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      flex-shrink: 0;
    }

    .org-picker-icon {
      color: var(--mat-sys-primary);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .org-picker-select {
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 14px;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      outline: none;
      cursor: pointer;
      flex: 1;
    }

    .no-org-selected {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--mat-sys-on-surface-variant);
      gap: 12px;
    }

    .no-org-selected mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .org-layout {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    /* Org view */
    .org-name-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--mat-sys-surface-container-low);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      flex-shrink: 0;
    }

    .org-view-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 0 16px 24px;
    }

    .org-icon {
      color: var(--mat-sys-primary);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .org-name {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    /* Shared section rows */
    .section-block {
      padding: 8px 16px;
    }

    .section-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--mat-sys-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 4px 8px 4px 10px;
      border-radius: 16px;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      font-size: 13px;
    }

    .chip-label {
      white-space: nowrap;
    }

    .chip-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: var(--mat-sys-on-secondary-container);
      cursor: pointer;
      padding: 0;
    }

    .chip-remove mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .add-chip-btn {
      width: 32px;
      height: 32px;
    }

    .active-toggle {
      color: var(--mat-sys-primary) !important;
    }

    /* Inline add form */
    .inline-add {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .inline-add-member {
      padding: 4px 0 8px;
    }

    .member-select {
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 14px;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      outline: none;
      cursor: pointer;
      min-width: 160px;
    }

    /* Main body */
    .org-body {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /* LEFT PANE */
    .list-pane {
      flex: 0 0 auto;
      min-width: 140px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container-low);
      overflow: hidden;
    }

    .list-header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 8px 4px 8px;
    }

    .search-input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      color: var(--mat-sys-on-surface);
      font-size: 14px;
      padding: 4px;
    }

    .search-input::placeholder {
      color: var(--mat-sys-on-surface-variant);
    }

    .name-cols-header {
      display: flex;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container);
    }

    .col-header {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 6px 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--mat-sys-on-surface-variant);
      background: none;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
    }

    .sort-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .list-scroll {
      flex: 1;
      overflow-y: auto;
    }

    .list-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 14px;
      white-space: nowrap;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      transition: background 100ms;
      gap: 6px;
    }

    .list-item:hover { background: var(--mat-sys-surface-container); }

    .list-item.selected {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }

    .list-item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; }

    .my-team-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: var(--mat-sys-primary);
      opacity: 0.7;
    }

    .list-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 16px;
      color: var(--mat-sys-on-surface-variant);
      gap: 8px;
      font-size: 14px;
    }

    /* RIGHT PANE */
    .detail-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .detail-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--mat-sys-on-surface-variant);
      gap: 12px;
    }

    .detail-empty mat-icon { font-size: 48px; width: 48px; height: 48px; }

    .detail-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .detail-header {
      display: flex;
      align-items: center;
      padding: 12px 16px 8px;
      gap: 8px;
      flex-shrink: 0;
    }

    .detail-name {
      flex: 1;
      font-size: 18px;
      font-weight: 500;
    }

    .team-name-input {
      flex: 1;
      border: 1px solid var(--mat-sys-outline);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 16px;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      outline: none;
    }

    /* Members section */
    .members-section {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
      padding: 8px 0 0;
    }

    .members-header {
      display: flex;
      align-items: center;
      padding: 0 16px 6px;
    }

    .members-header .section-label { flex: 1; }

    .member-actions { display: flex; gap: 4px; }

    .member-scroll {
      flex: 1;
      overflow-y: auto;
      margin: 0 16px 16px;
    }

    .member-table {
      border-collapse: collapse;
      white-space: nowrap;
      width: 100%;
    }

    .member-th {
      text-align: left;
      padding: 6px 16px 6px 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container);
      border-bottom: 2px solid var(--mat-sys-outline-variant);
      cursor: pointer;
      user-select: none;
    }

    .member-th.sort-active { color: var(--mat-sys-primary); }

    .member-th .th-icon {
      font-size: 14px; width: 14px; height: 14px;
      vertical-align: middle; margin-left: 2px;
    }

    .member-th .drag-icon { opacity: 0.4; }

    .role-col { width: 1px; white-space: nowrap; }

    .role-td { padding: 4px 8px; white-space: nowrap; }

    .role-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
    }

    .role-org {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }

    .role-team {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }

    .action-col { width: 40px; }

    .member-th.cdk-drag-placeholder { display: table-cell; opacity: 0.4; }

    .member-td {
      padding: 7px 16px 7px 8px;
      font-size: 14px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    tr:last-child .member-td { border-bottom: none; }

    .action-td { padding: 2px 4px; }

    .remove-btn { width: 32px; height: 32px; }

    .remove-btn mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--mat-sys-error); }

    .member-empty {
      padding: 16px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 14px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .cdk-drag-preview {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      background: var(--mat-sys-surface-container-high);
      border-radius: 6px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      font-size: 12px;
      font-weight: 600;
    }

    .cdk-drag-placeholder { opacity: 0.3; }

    /* Import / Export */
    .ie-section {
      padding: 20px 0 12px;
    }

    .ie-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }

    .ie-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--mat-sys-primary);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .ie-title {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .ie-desc {
      margin: 0;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    .ie-block {
      padding: 16px 0 8px;
    }

    .ie-block-title {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .ie-block-desc {
      margin: 0 0 12px 0;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    .ie-file-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .ie-file-name {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    .ie-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }

    .ie-team-picker {
      margin-left: 28px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ie-option-label {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .ie-radio-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .ie-radio {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      cursor: pointer;
    }

    .ie-team-count {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .ie-import-btn {
      margin-top: 4px;
    }

    .ie-result {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      margin-top: 12px;
      font-size: 13px;
    }

    .ie-result mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .ie-result-success {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }

    .ie-result-error {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }

    button mat-progress-spinner {
      display: inline-block;
      margin-right: 6px;
    }
  `]
})
export class ManageOrgComponent implements OnInit, OnChanges {
  @Input() myTeamsOnly = false;
  @Input() view: 'org' | 'teams' = 'teams';

  // Sysadmin org picker
  orgList: { id: string; name: string }[] = [];
  selectedOrgId: string = '';

  loading = true;
  organisation: { id: string; name: string } | null = null;
  orgAdmins: MemberRef[] = [];
  teams: Team[] = [];
  allMembers: MemberRef[] = [];
  filteredTeams: Team[] = [];
  selectedTeam: Team | null = null;

  searchText = '';
  teamSortDir: 'asc' | 'desc' = 'asc';
  myTeamsFilter = false;

  nameColumns = ['firstName', 'particles', 'lastName'];
  memberSortCol = 'lastName';
  memberSortDir: 'asc' | 'desc' = 'asc';

  // Add org admin
  showAddOrgAdmin = false;
  selectedOrgAdminId = '';

  // Add team admin
  showAddTeamAdmin = false;
  selectedTeamAdminId = '';

  // Add member
  showAddMember = false;
  selectedNewMemberId = '';

  // Team name editing
  editingTeamName = false;
  teamNameDraft = '';

  // Import / Export
  exporting = false;
  importing = false;
  importFileName: string | null = null;
  importFile: { organisation?: any; teams?: { name: string; memberIds: string[] }[]; members?: any[] } | null = null;
  importOrgSettings = true;
  importTeams = true;
  importTeamScope: 'all' | 'specific' = 'all';
  importSpecificTeamName = '';
  importResultMessage: string | null = null;
  importResultSuccess = false;

  constructor(
    public authService: AuthService,
    private notificationService: NotificationService,
    private panelService: SlideInPanelService,
    private userPreferencesService: UserPreferencesService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    this.myTeamsFilter = this.myTeamsOnly || this.authService.isTeamAdmin;
    if (this.authService.isSysadmin) {
      await this.loadOrgList();
    } else {
      this.loadData();
    }
  }

  async loadOrgList(): Promise<void> {
    try {
      const result: any = await apolloClient.query({ query: GET_ORG_LIST, fetchPolicy: 'network-only' });
      this.orgList = result.data.organisations;
    } catch (e) {
      console.error('Failed to load org list:', e);
    }
    this.cdr.detectChanges();
  }

  onOrgSelected(): void {
    if (this.selectedOrgId) {
      this.loadData();
    }
  }

  ngOnChanges(): void {
    this.myTeamsFilter = this.myTeamsOnly || this.authService.isTeamAdmin;
    this.filterTeams();
  }

  get canManageOrgAdmins(): boolean {
    return this.authService.isOrgAdmin;
  }

  get canCreateTeam(): boolean {
    return this.authService.isOrgAdmin;
  }

  get showMyTeamsToggle(): boolean {
    return !this.myTeamsOnly && this.authService.isTeamAdmin;
  }

  get canEditSelectedTeam(): boolean {
    if (!this.selectedTeam) return false;
    if (this.authService.isOrgAdmin) return true;
    return this.authService.teamAdminIds.includes(Number(this.selectedTeam.id));
  }

  isMyTeam(team: Team): boolean {
    return this.authService.teamAdminIds.includes(Number(team.id));
  }

  // Members not yet org admins (for the add-org-admin picker)
  get nonAdminMembers(): MemberRef[] {
    const adminIds = new Set(this.orgAdmins.map(a => a.id));
    return this.allMembers.filter(m => !adminIds.has(m.id));
  }

  // Members not yet team admin of selected team
  get nonTeamAdminMembers(): MemberRef[] {
    if (!this.selectedTeam) return [];
    const adminIds = new Set(this.selectedTeam.teamAdmins.map(a => a.id));
    return this.allMembers.filter(m => !adminIds.has(m.id));
  }

  // Members not yet in selected team
  get nonTeamMembers(): MemberRef[] {
    if (!this.selectedTeam) return [];
    const memberIds = new Set(this.selectedTeam.members.map(m => m.id));
    return this.allMembers.filter(m => !memberIds.has(m.id));
  }

  async loadData(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();
    const orgId = this.authService.isSysadmin ? this.selectedOrgId || undefined : undefined;
    try {
      const result: any = await apolloClient.query({ query: GET_ORG_DATA, variables: { orgId }, fetchPolicy: 'network-only' });
      this.organisation = result.data.organisation;
      this.orgAdmins = result.data.orgAdmins;
      this.teams = result.data.teams;
      this.allMembers = result.data.members;
      if (this.selectedTeam) {
        this.selectedTeam = this.teams.find(t => t.id === this.selectedTeam!.id) || null;
      }
      this.filterTeams();
    } catch (error) {
      console.error('Failed to load org data:', error);
      this.notificationService.error(this.translate.instant('teams.messages.loadFailed'));
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  filterTeams(): void {
    let list = this.teams;
    if (this.myTeamsFilter) {
      list = list.filter(t => this.isMyTeam(t));
    }
    if (this.searchText) {
      const term = this.searchText.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(term));
    }
    const dir = this.teamSortDir === 'asc' ? 1 : -1;
    this.filteredTeams = [...list].sort((a, b) => a.name.localeCompare(b.name) * dir);
  }

  toggleTeamSort(): void {
    this.teamSortDir = this.teamSortDir === 'asc' ? 'desc' : 'asc';
    this.filterTeams();
  }

  toggleMyTeams(): void {
    this.myTeamsFilter = !this.myTeamsFilter;
    this.filterTeams();
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
    this.showAddTeamAdmin = false;
    this.showAddMember = false;
    this.selectedTeamAdminId = '';
    this.selectedNewMemberId = '';
    this.editingTeamName = false;
  }

  sortedMembers(): MemberRef[] {
    if (!this.selectedTeam) return [];
    const dir = this.memberSortDir === 'asc' ? 1 : -1;
    return [...this.selectedTeam.members].sort((a, b) =>
      this.getNamePart(a, this.memberSortCol).localeCompare(this.getNamePart(b, this.memberSortCol)) * dir
    );
  }

  setMemberSort(col: string): void {
    if (this.memberSortCol === col) {
      this.memberSortDir = this.memberSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.memberSortCol = col;
      this.memberSortDir = 'asc';
    }
  }

  dropNameColumn(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.nameColumns, event.previousIndex, event.currentIndex);
  }

  memberRole(m: MemberRef): 'orgAdmin' | 'teamAdmin' | null {
    if (this.orgAdmins.some(a => a.id === m.id)) return 'orgAdmin';
    if (this.selectedTeam?.teamAdmins.some(a => a.id === m.id)) return 'teamAdmin';
    return null;
  }

  fullName(m: MemberRef): string {
    return [m.firstName, m.particles, m.lastName].filter(Boolean).join(' ');
  }

  getNamePart(m: MemberRef, col: string): string {
    switch (col) {
      case 'firstName': return m.firstName || '';
      case 'particles': return m.particles || '';
      case 'lastName': return m.lastName || '';
      default: return '';
    }
  }

  columnLabel(col: string): string {
    switch (col) {
      case 'firstName': return 'members.firstName';
      case 'particles': return 'members.particles';
      case 'lastName': return 'members.lastName';
      default: return col;
    }
  }

  // Org admin management
  async addOrgAdmin(): Promise<void> {
    if (!this.selectedOrgAdminId) return;
    const orgId = this.authService.isSysadmin ? this.selectedOrgId || undefined : undefined;
    try {
      await apolloClient.mutate({ mutation: ASSIGN_ORG_ADMIN, variables: { memberId: this.selectedOrgAdminId, orgId } });
      this.showAddOrgAdmin = false;
      this.selectedOrgAdminId = '';
      await this.loadData();
    } catch (e) {
      this.notificationService.error(this.translate.instant('common.error'));
    }
  }

  async removeOrgAdmin(admin: MemberRef): Promise<void> {
    const orgId = this.authService.isSysadmin ? this.selectedOrgId || undefined : undefined;
    try {
      await apolloClient.mutate({ mutation: REMOVE_ORG_ADMIN, variables: { memberId: admin.id, orgId } });
      await this.loadData();
    } catch (e) {
      this.notificationService.error(this.translate.instant('common.error'));
    }
  }

  // Team admin management
  async addTeamAdmin(): Promise<void> {
    if (!this.selectedTeam || !this.selectedTeamAdminId) return;
    try {
      await apolloClient.mutate({
        mutation: ASSIGN_TEAM_ADMIN,
        variables: { memberId: this.selectedTeamAdminId, teamId: Number(this.selectedTeam.id), orgId: this.authService.isSysadmin ? this.selectedOrgId || undefined : undefined }
      });
      this.showAddTeamAdmin = false;
      this.selectedTeamAdminId = '';
      await this.loadData();
    } catch (e) {
      this.notificationService.error(this.translate.instant('common.error'));
    }
  }

  async removeTeamAdmin(admin: MemberRef): Promise<void> {
    if (!this.selectedTeam) return;
    try {
      await apolloClient.mutate({
        mutation: REMOVE_TEAM_ADMIN,
        variables: { memberId: admin.id, teamId: Number(this.selectedTeam.id) }
      });
      await this.loadData();
    } catch (e) {
      this.notificationService.error(this.translate.instant('common.error'));
    }
  }

  // Team member management
  async addMemberToTeam(): Promise<void> {
    if (!this.selectedTeam || !this.selectedNewMemberId) return;
    try {
      await apolloClient.mutate({
        mutation: ADD_MEMBER_TO_TEAM,
        variables: { teamId: this.selectedTeam.id, memberId: this.selectedNewMemberId }
      });
      this.showAddMember = false;
      this.selectedNewMemberId = '';
      await this.loadData();
    } catch (e) {
      this.notificationService.error(this.translate.instant('common.error'));
    }
  }

  async removeMemberFromTeam(member: MemberRef): Promise<void> {
    if (!this.selectedTeam) return;
    try {
      await apolloClient.mutate({
        mutation: REMOVE_MEMBER_FROM_TEAM,
        variables: { teamId: this.selectedTeam.id, memberId: member.id }
      });
      await this.loadData();
    } catch (e) {
      this.notificationService.error(this.translate.instant('common.error'));
    }
  }

  // Team name editing
  startEditTeamName(): void {
    if (!this.selectedTeam) return;
    this.teamNameDraft = this.selectedTeam.name;
    this.editingTeamName = true;
  }

  async saveTeamName(): Promise<void> {
    if (!this.selectedTeam || !this.teamNameDraft.trim()) return;
    try {
      await apolloClient.mutate({
        mutation: UPDATE_TEAM,
        variables: { id: this.selectedTeam.id, name: this.teamNameDraft.trim() }
      });
      this.editingTeamName = false;
      await this.loadData();
    } catch (e) {
      this.notificationService.error(this.translate.instant('common.error'));
    }
  }

  async exportOrgData(): Promise<void> {
    this.exporting = true;
    try {
      const orgId = this.authService.isSysadmin ? this.selectedOrgId || undefined : undefined;
      const [orgResult, settingsResult] = await Promise.all([
        apolloClient.query({ query: GET_ORG_DATA, variables: { orgId }, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GET_ORG_SETTINGS_FOR_EXPORT, variables: { orgId }, fetchPolicy: 'network-only' }),
      ]);
      const data = (orgResult as any).data;
      const settings = (settingsResult as any).data.orgSettings;
      const exportObj = {
        format: 'teamschedule-org-v1',
        exportDate: new Date().toISOString().split('T')[0],
        organisation: {
          name: data.organisation?.name,
          settings,
        },
        teams: (data.teams as any[]).map((t: any) => ({
          name: t.name,
          memberIds: (t.members as any[]).map((m: any) => m.id),
        })),
        members: (data.members as any[]).map((m: any) => ({
          id: m.id,
          firstName: m.firstName,
          particles: m.particles,
          lastName: m.lastName,
        })),
      };
      const json = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(data.organisation?.name || 'org').replace(/\s+/g, '-').toLowerCase()}-${exportObj.exportDate}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      this.notificationService.error(this.translate.instant('importExport.export.failed', { error: err.message }));
    } finally {
      this.exporting = false;
      this.cdr.detectChanges();
    }
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importFileName = file.name;
    this.importFile = null;
    this.importResultMessage = null;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.format !== 'teamschedule-org-v1') {
          this.importResultMessage = this.translate.instant('importExport.import.invalidFormat');
          this.importResultSuccess = false;
          this.cdr.detectChanges();
          return;
        }
        this.importFile = data;
        this.importSpecificTeamName = '';
        this.cdr.detectChanges();
      } catch {
        this.importResultMessage = this.translate.instant('importExport.import.invalidJson');
        this.importResultSuccess = false;
        this.cdr.detectChanges();
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  async runImport(): Promise<void> {
    if (!this.importFile) return;
    this.importing = true;
    this.importResultMessage = null;
    const orgId = this.authService.isSysadmin ? this.selectedOrgId || undefined : undefined;
    const messages: string[] = [];
    try {
      if (this.importOrgSettings && this.importFile.organisation?.settings) {
        await apolloClient.mutate({
          mutation: SAVE_ORG_SETTINGS,
          variables: { settings: this.importFile.organisation.settings, orgId: orgId ?? null },
        });
        messages.push(this.translate.instant('importExport.import.settingsImported'));
      }
      if (this.importTeams && this.importFile.teams?.length) {
        const teams = this.importTeamScope === 'all'
          ? this.importFile.teams
          : this.importFile.teams.filter(t => t.name === this.importSpecificTeamName);
        const result: any = await apolloClient.mutate({
          mutation: IMPORT_TEAM_MEMBERSHIPS,
          variables: { teams, orgId: orgId ?? null },
        });
        messages.push(result.data.importTeamMemberships.message);
      }
      this.importResultSuccess = true;
      this.importResultMessage = messages.join(' ');
      await this.loadData();
    } catch (err: any) {
      this.importResultSuccess = false;
      this.importResultMessage = this.translate.instant('importExport.import.failed', { error: err.message });
    } finally {
      this.importing = false;
      this.cdr.detectChanges();
    }
  }

  openAddTeam(): void {
    const leftOffset = this.userPreferencesService.getManagementPanelLeftOffset();
    const orgId = this.authService.isSysadmin ? this.selectedOrgId || undefined : undefined;

    const ref = this.panelService.open<AddTeamDialogComponent, { orgId?: string } | undefined, boolean>(
      AddTeamDialogComponent,
      { leftOffset, data: orgId ? { orgId } : undefined }
    );
    ref.afterClosed().subscribe(saved => {
      if (saved) this.loadData();
    });
  }
}
