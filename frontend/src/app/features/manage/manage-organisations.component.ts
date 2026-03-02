import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { NotificationService } from '../../shared/services/notification.service';
import { ManageOrgSettingsComponent } from './manage-org-settings.component';

interface OrgAdmin {
  id: string;
  firstName: string;
  particles: string | null;
  lastName: string;
}

interface Organisation {
  id: string;
  name: string;
  memberCount: number;
  teamCount: number;
  orgAdmins: OrgAdmin[];
}

interface AllMember {
  id: string;
  firstName: string;
  particles: string | null;
  lastName: string;
  role: string;
  organisationId: number | null;
}

const GET_ORGANISATIONS = gql`
  query Organisations {
    organisations {
      id
      name
      memberCount
      teamCount
      orgAdmins {
        id
        firstName
        particles
        lastName
      }
    }
  }
`;

const GET_ALL_MEMBERS = gql`
  query AllMembers {
    members {
      id
      firstName
      particles
      lastName
      role
      organisationId
    }
  }
`;

const CREATE_ORGANISATION = gql`
  mutation CreateOrganisation($name: String!) {
    createOrganisation(name: $name) {
      id
      name
      memberCount
      teamCount
      orgAdmins { id firstName particles lastName }
    }
  }
`;

const UPDATE_ORGANISATION = gql`
  mutation UpdateOrganisation($id: ID!, $name: String!) {
    updateOrganisation(id: $id, name: $name) {
      id
      name
      memberCount
      teamCount
      orgAdmins { id firstName particles lastName }
    }
  }
`;

const DELETE_ORGANISATION = gql`
  mutation DeleteOrganisation($id: ID!) {
    deleteOrganisation(id: $id) {
      success
      message
    }
  }
`;

const ASSIGN_ORG_ADMIN = gql`
  mutation AssignOrgAdmin($memberId: String!, $orgId: ID) {
    assignOrgAdmin(memberId: $memberId, orgId: $orgId)
  }
`;

const REMOVE_ORG_ADMIN = gql`
  mutation RemoveOrgAdmin($memberId: String!, $orgId: ID) {
    removeOrgAdmin(memberId: $memberId, orgId: $orgId)
  }
`;

@Component({
  selector: 'app-manage-organisations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatDividerModule,
    MatTableModule,
    TranslateModule,
    ManageOrgSettingsComponent,
  ],
  template: `
    <div class="orgs-layout">

      <!-- LEFT: org list -->
      <div class="orgs-list-pane">
        <div class="list-header">
          <h3 class="list-title">{{ 'organisations.title' | translate }}</h3>
        </div>

        <div *ngIf="loading" class="list-loading">
          <mat-spinner diameter="32"></mat-spinner>
        </div>

        <div class="org-list" *ngIf="!loading">
          <mat-table [dataSource]="organisations" class="orgs-mat-table">

            <ng-container matColumnDef="name">
              <mat-header-cell *matHeaderCellDef>{{ 'organisations.title' | translate }}</mat-header-cell>
              <mat-cell *matCellDef="let org">
                <mat-icon class="org-item-icon">corporate_fare</mat-icon>
                <div class="org-item-info">
                  <span class="org-item-name">{{ org.name }}</span>
                  <span class="org-item-meta">{{ org.memberCount }} · {{ org.teamCount }}</span>
                </div>
              </mat-cell>
            </ng-container>

            <ng-container matColumnDef="admins">
              <mat-header-cell *matHeaderCellDef>{{ 'organisations.admins' | translate }}</mat-header-cell>
              <mat-cell *matCellDef="let org" class="admins-cell">
                <span *ngFor="let a of (org.orgAdmins || [])" class="admin-chip-sm">
                  {{ a.firstName }} {{ a.particles ? a.particles + ' ' : '' }}{{ a.lastName }}
                </span>
                <span *ngIf="(org.orgAdmins || []).length === 0" class="no-admins">—</span>
              </mat-cell>
            </ng-container>

            <mat-header-row *matHeaderRowDef="orgTableColumns; sticky: true"></mat-header-row>
            <mat-row *matRowDef="let row; columns: orgTableColumns;"
                     [class.selected]="selectedOrg?.id === row.id"
                     (click)="selectOrg(row)">
            </mat-row>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell" colspan="2">
                <div class="empty-list">{{ 'organisations.empty' | translate }}</div>
              </td>
            </tr>
          </mat-table>
        </div>

        <!-- Add new org -->
        <div class="add-org-form" *ngIf="!loading">
          <mat-form-field appearance="outline" class="add-field">
            <mat-label>{{ 'organisations.newName' | translate }}</mat-label>
            <input matInput [(ngModel)]="newName" (keydown.enter)="createOrg()"
                   [placeholder]="'organisations.newNamePlaceholder' | translate">
          </mat-form-field>
          <button mat-icon-button color="primary"
                  (click)="createOrg()"
                  [disabled]="!newName.trim() || saving"
                  [matTooltip]="'organisations.create' | translate">
            <mat-icon>add</mat-icon>
          </button>
        </div>
      </div>

      <!-- RIGHT: org detail -->
      <div class="org-detail-pane">

        <!-- No selection placeholder -->
        <div *ngIf="!selectedOrg" class="no-selection">
          <mat-icon class="no-sel-icon">corporate_fare</mat-icon>
          <p>{{ 'organisations.selectPrompt' | translate }}</p>
        </div>

        <ng-container *ngIf="selectedOrg">
          <!-- Org name bar -->
          <div class="detail-name-bar">
            <ng-container *ngIf="!editingName">
              <mat-icon class="detail-org-icon">corporate_fare</mat-icon>
              <h2 class="detail-org-name">{{ selectedOrg.name }}</h2>
              <button mat-icon-button [matTooltip]="'common.edit' | translate" (click)="startEditName()">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn"
                      [matTooltip]="'common.delete' | translate"
                      [disabled]="selectedOrg.memberCount > 0 || selectedOrg.teamCount > 0"
                      (click)="deleteOrg(selectedOrg)">
                <mat-icon>delete</mat-icon>
              </button>
            </ng-container>
            <ng-container *ngIf="editingName">
              <mat-form-field appearance="outline" class="name-edit-field">
                <input matInput [(ngModel)]="editName"
                       (keydown.enter)="saveEditName()"
                       (keydown.escape)="cancelEditName()">
              </mat-form-field>
              <button mat-icon-button color="primary" (click)="saveEditName()" [disabled]="!editName.trim()">
                <mat-icon>check</mat-icon>
              </button>
              <button mat-icon-button (click)="cancelEditName()">
                <mat-icon>close</mat-icon>
              </button>
            </ng-container>
          </div>

          <div class="detail-scroll">
            <!-- Org meta -->
            <p class="org-meta-line">
              {{ selectedOrg.memberCount }} {{ 'organisations.members' | translate }} &middot;
              {{ selectedOrg.teamCount }} {{ 'organisations.teams' | translate }}
            </p>

            <!-- Org admins -->
            <div class="admins-section">
              <span class="admins-label">{{ 'organisations.admins' | translate }}</span>
              <div class="admin-chips">
                <span *ngFor="let admin of (selectedOrg.orgAdmins || [])" class="admin-chip">
                  {{ admin.firstName }} {{ admin.particles ? admin.particles + ' ' : '' }}{{ admin.lastName }}
                  <button class="chip-remove" [matTooltip]="'organisations.removeAdmin' | translate"
                          (click)="removeAdmin(selectedOrg, admin)">
                    <mat-icon>close</mat-icon>
                  </button>
                </span>
                <span *ngIf="(selectedOrg.orgAdmins || []).length === 0 && !addingAdmin" class="no-admins">
                  {{ 'organisations.noAdmins' | translate }}
                </span>

                <ng-container *ngIf="!addingAdmin">
                  <button class="add-admin-btn" [matTooltip]="'organisations.addAdmin' | translate"
                          (click)="startAddAdmin()">
                    <mat-icon>person_add</mat-icon>
                  </button>
                </ng-container>
                <ng-container *ngIf="addingAdmin">
                  <select class="admin-select" [(ngModel)]="selectedMemberId">
                    <option value="" disabled>{{ 'organisations.selectMember' | translate }}</option>
                    <option *ngFor="let m of nonAdminMembers" [value]="m.id">
                      {{ m.firstName }} {{ m.particles ? m.particles + ' ' : '' }}{{ m.lastName }}
                    </option>
                  </select>
                  <button mat-icon-button color="primary"
                          [disabled]="!selectedMemberId" (click)="confirmAddAdmin()">
                    <mat-icon>check</mat-icon>
                  </button>
                  <button mat-icon-button (click)="cancelAddAdmin()">
                    <mat-icon>close</mat-icon>
                  </button>
                </ng-container>
              </div>
            </div>

            <mat-divider></mat-divider>

            <!-- Settings sub-component -->
            <app-manage-org-settings [orgId]="selectedOrg.id"></app-manage-org-settings>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      overflow: hidden;
      height: 100%;
    }

    .orgs-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* LEFT PANE */
    .orgs-list-pane {
      width: 260px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--mat-sys-outline-variant);
      overflow: hidden;
    }

    .list-header {
      padding: 16px 16px 8px;
      flex-shrink: 0;
    }

    .list-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mat-sys-on-surface-variant);
    }

    .list-loading {
      display: flex;
      justify-content: center;
      padding: 32px;
    }

    .org-list {
      flex: 1;
      overflow-y: auto;
    }

    .orgs-mat-table {
      width: 100%;
      background: transparent;
    }

    .orgs-mat-table .mat-mdc-header-cell {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container-low);
      padding: 0 8px;
    }

    .orgs-mat-table .mat-mdc-cell {
      font-size: 13px;
      padding: 0 8px;
    }

    .orgs-mat-table .mat-mdc-row {
      cursor: pointer;
      min-height: 44px;
    }

    .orgs-mat-table .mat-mdc-row:hover .mat-mdc-cell {
      background: var(--mat-sys-surface-container);
    }

    .orgs-mat-table .mat-mdc-row.selected .mat-mdc-cell {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }

    .org-item-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      opacity: 0.6;
      flex-shrink: 0;
      margin-right: 8px;
    }

    .org-item-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .org-item-name {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .org-item-meta {
      font-size: 11px;
      color: var(--mat-sys-on-surface-variant);
    }

    .admins-cell {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding-top: 4px;
      padding-bottom: 4px;
    }

    .admin-chip-sm {
      font-size: 11px;
      background: var(--mat-sys-surface-container-highest);
      border-radius: 10px;
      padding: 1px 8px;
      white-space: nowrap;
    }

    .no-admins {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .empty-list {
      padding: 16px;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
    }

    .add-org-form {
      padding: 8px 8px 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }

    .add-field { flex: 1; }

    /* RIGHT PANE */
    .org-detail-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .no-selection {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .no-sel-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.3;
    }

    .no-selection p {
      font-size: 14px;
      margin: 0;
    }

    /* Detail name bar */
    .detail-name-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      flex-shrink: 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .detail-org-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: var(--mat-sys-primary);
      flex-shrink: 0;
    }

    .detail-org-name {
      flex: 1;
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .name-edit-field {
      flex: 1;
    }

    /* Detail scroll area */
    .detail-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 0 16px 24px;
    }

    .org-meta-line {
      margin: 12px 0 8px;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    /* Admins */
    .admins-section {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .admins-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
    }

    .admin-chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .admin-chip {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      border-radius: 16px;
      padding: 2px 4px 2px 10px;
      font-size: 12px;
      font-weight: 500;
    }

    .chip-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--mat-sys-on-secondary-container);
      padding: 0;
      border-radius: 50%;
      width: 20px;
      height: 20px;
    }

    .chip-remove:hover { background: var(--mat-sys-outline-variant); }
    .chip-remove mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .no-admins {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
    }

    .add-admin-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: 1px dashed var(--mat-sys-outline-variant);
      cursor: pointer;
      color: var(--mat-sys-primary);
      border-radius: 50%;
      width: 24px;
      height: 24px;
      padding: 0;
    }

    .add-admin-btn:hover { background: var(--mat-sys-surface-container-highest); }
    .add-admin-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .admin-select {
      font-size: 13px;
      height: 28px;
      padding: 0 6px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 6px;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
      cursor: pointer;
      max-width: 160px;
    }

    .admin-select:focus {
      outline: 2px solid var(--mat-sys-primary);
      border-color: transparent;
    }
  `]
})
export class ManageOrganisationsComponent implements OnInit {
  organisations: Organisation[] = [];
  allMembers: AllMember[] = [];
  orgTableColumns = ['name', 'admins'];
  loading = false;
  saving = false;
  newName = '';
  selectedOrg: Organisation | null = null;

  editingName = false;
  editName = '';

  addingAdmin = false;
  selectedMemberId = '';

  constructor(
    private notificationService: NotificationService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    try {
      const [orgsResult, membersResult] = await Promise.all([
        apolloClient.query({ query: GET_ORGANISATIONS, fetchPolicy: 'network-only' }) as Promise<any>,
        apolloClient.query({ query: GET_ALL_MEMBERS, fetchPolicy: 'network-only' }) as Promise<any>,
      ]);
      this.organisations = orgsResult.data.organisations;
      this.allMembers = membersResult.data.members;
    } catch (e: any) {
      this.notificationService.error(e.message || 'Error loading data');
    } finally {
      this.loading = false;
    }
  }

  selectOrg(org: Organisation): void {
    this.cancelEditName();
    this.cancelAddAdmin();
    this.selectedOrg = org;
  }

  get nonAdminMembers(): AllMember[] {
    if (!this.selectedOrg) return [];
    const adminIds = new Set((this.selectedOrg.orgAdmins || []).map(a => a.id));
    return this.allMembers.filter(m =>
      Number(m.organisationId) === Number(this.selectedOrg!.id) &&
      !adminIds.has(m.id) &&
      m.role !== 'sysadmin'
    );
  }

  // Name edit
  startEditName(): void {
    this.editingName = true;
    this.editName = this.selectedOrg?.name ?? '';
  }

  cancelEditName(): void {
    this.editingName = false;
    this.editName = '';
  }

  async saveEditName(): Promise<void> {
    if (!this.selectedOrg || !this.editName.trim()) return;
    try {
      const result = await apolloClient.mutate({
        mutation: UPDATE_ORGANISATION,
        variables: { id: this.selectedOrg.id, name: this.editName.trim() }
      }) as any;
      const updated = result.data.updateOrganisation;
      this.organisations = this.organisations.map(o => o.id === updated.id ? updated : o);
      this.selectedOrg = updated;
      this.cancelEditName();
      this.notificationService.success(this.translate.instant('organisations.updated'));
    } catch (e: any) {
      this.notificationService.error(e.message || 'Error updating organisation');
    }
  }

  // Admin management
  startAddAdmin(): void {
    this.addingAdmin = true;
    this.selectedMemberId = '';
  }

  cancelAddAdmin(): void {
    this.addingAdmin = false;
    this.selectedMemberId = '';
  }

  async confirmAddAdmin(): Promise<void> {
    if (!this.selectedMemberId || !this.selectedOrg) return;
    try {
      await apolloClient.mutate({
        mutation: ASSIGN_ORG_ADMIN,
        variables: { memberId: this.selectedMemberId, orgId: this.selectedOrg.id }
      });
      const member = this.allMembers.find(m => m.id === this.selectedMemberId);
      if (member) {
        const newAdmin = { id: member.id, firstName: member.firstName, particles: member.particles, lastName: member.lastName };
        const updated = { ...this.selectedOrg, orgAdmins: [...this.selectedOrg.orgAdmins, newAdmin] };
        this.organisations = this.organisations.map(o => o.id === updated.id ? updated : o);
        this.selectedOrg = updated;
      }
      this.cancelAddAdmin();
      this.notificationService.success(this.translate.instant('organisations.adminAdded'));
    } catch (e: any) {
      this.notificationService.error(e.message || 'Error adding admin');
    }
  }

  async removeAdmin(org: Organisation, admin: OrgAdmin): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: REMOVE_ORG_ADMIN,
        variables: { memberId: admin.id, orgId: org.id }
      });
      const updated = { ...org, orgAdmins: org.orgAdmins.filter(a => a.id !== admin.id) };
      this.organisations = this.organisations.map(o => o.id === updated.id ? updated : o);
      this.selectedOrg = updated;
      this.notificationService.success(this.translate.instant('organisations.adminRemoved'));
    } catch (e: any) {
      this.notificationService.error(e.message || 'Error removing admin');
    }
  }

  // Create / delete org
  async createOrg(): Promise<void> {
    const name = this.newName.trim();
    if (!name) return;
    this.saving = true;
    try {
      const result = await apolloClient.mutate({
        mutation: CREATE_ORGANISATION,
        variables: { name }
      }) as any;
      const created = result.data.createOrganisation;
      this.organisations = [...this.organisations, created];
      this.newName = '';
      this.selectedOrg = created;
      this.notificationService.success(this.translate.instant('organisations.created'));
    } catch (e: any) {
      this.notificationService.error(e.message || 'Error creating organisation');
    } finally {
      this.saving = false;
    }
  }

  async deleteOrg(org: Organisation): Promise<void> {
    if (!confirm(this.translate.instant('organisations.confirmDelete', { name: org.name }))) return;
    try {
      await apolloClient.mutate({
        mutation: DELETE_ORGANISATION,
        variables: { id: org.id }
      });
      this.organisations = this.organisations.filter(o => o.id !== org.id);
      this.selectedOrg = null;
      this.notificationService.success(this.translate.instant('organisations.deleted'));
    } catch (e: any) {
      this.notificationService.error(e.message || 'Error deleting organisation');
    }
  }
}
