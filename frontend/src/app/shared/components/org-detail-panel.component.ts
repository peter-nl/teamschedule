import { Component, OnInit, Inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { NotificationService } from '../services/notification.service';
import { SlideInPanelRef, SlideInPanelService, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';
import { ManageOrgSettingsComponent } from '../../features/manage/manage-org-settings.component';

export interface OrgDetailOrg {
  id: string;
  name: string;
  memberCount: number;
  teamCount: number;
  orgAdmins: OrgAdmin[];
  isDemo: boolean;
  demoExpiresAt: string | null;
  demoEmail: string | null;
  createdAt: string | null;
}

export interface OrgDetailPanelData {
  org: OrgDetailOrg;
}

interface OrgAdmin {
  id: string;
  firstName: string;
  particles: string | null;
  lastName: string;
}

interface AllMember {
  id: string;
  firstName: string;
  particles: string | null;
  lastName: string;
  role: string;
  organisationId: number | null;
}

const UPDATE_ORGANISATION = gql`
  mutation UpdateOrg($id: ID!, $name: String!) {
    updateOrganisation(id: $id, name: $name) {
      id name memberCount teamCount
      orgAdmins { id firstName particles lastName }
      isDemo demoExpiresAt demoEmail createdAt
    }
  }
`;

const DELETE_ORGANISATION = gql`
  mutation DeleteOrg($id: ID!) {
    deleteOrganisation(id: $id) { success message }
  }
`;

const ASSIGN_ORG_ADMIN = gql`
  mutation AssignAdmin($memberId: String!, $orgId: ID) {
    assignOrgAdmin(memberId: $memberId, orgId: $orgId)
  }
`;

const REMOVE_ORG_ADMIN = gql`
  mutation RemoveAdmin($memberId: String!, $orgId: ID) {
    removeOrgAdmin(memberId: $memberId, orgId: $orgId)
  }
`;

const GET_ALL_MEMBERS = gql`
  query AllMembersForOrgPanel {
    members {
      id firstName particles lastName role organisationId
    }
  }
`;

@Component({
  selector: 'app-org-detail-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule,
    ManageOrgSettingsComponent,
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <mat-icon class="header-icon">corporate_fare</mat-icon>

        <ng-container *ngIf="!editingName">
          <h2 class="header-title">{{ org.name }}</h2>
          <span *ngIf="org.isDemo" class="demo-badge">DEMO</span>
          <span class="header-spacer"></span>
          <button mat-icon-button [matTooltip]="'common.edit' | translate" (click)="startEditName()">
            <mat-icon>edit</mat-icon>
          </button>
          <button mat-icon-button color="warn"
                  [matTooltip]="'common.delete' | translate"
                  [disabled]="org.memberCount > 0 || org.teamCount > 0"
                  (click)="deleteOrg()">
            <mat-icon>delete</mat-icon>
          </button>
        </ng-container>

        <ng-container *ngIf="editingName">
          <mat-form-field appearance="outline" class="name-field">
            <input matInput [(ngModel)]="editName"
                   (keydown.enter)="saveEditName()"
                   (keydown.escape)="cancelEditName()">
          </mat-form-field>
          <span class="header-spacer"></span>
          <button mat-icon-button color="primary" [disabled]="!editName.trim()" (click)="saveEditName()">
            <mat-icon>check</mat-icon>
          </button>
          <button mat-icon-button (click)="cancelEditName()">
            <mat-icon>close</mat-icon>
          </button>
        </ng-container>

        <button class="panel-close" (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">

        <!-- Meta info -->
        <div class="meta-grid">
          <mat-icon class="meta-icon">group</mat-icon>
          <span class="meta-value">{{ org.memberCount }} {{ 'organisations.members' | translate }}</span>
          <mat-icon class="meta-icon">folder_shared</mat-icon>
          <span class="meta-value">{{ org.teamCount }} {{ 'organisations.teams' | translate }}</span>
          <ng-container *ngIf="org.createdAt">
            <mat-icon class="meta-icon">calendar_today</mat-icon>
            <span class="meta-value">{{ org.createdAt | date:'dd MMM yyyy' }}</span>
          </ng-container>
          <ng-container *ngIf="org.isDemo && org.demoEmail">
            <mat-icon class="meta-icon">email</mat-icon>
            <span class="meta-value">{{ org.demoEmail }}</span>
          </ng-container>
          <ng-container *ngIf="org.demoExpiresAt">
            <mat-icon class="meta-icon">timer_off</mat-icon>
            <span class="meta-value">{{ 'organisations.demoExpires' | translate }}: {{ org.demoExpiresAt | date:'dd MMM yyyy' }}</span>
          </ng-container>
        </div>

        <mat-divider></mat-divider>

        <!-- Admins section -->
        <div class="section">
          <div class="section-header">
            <span class="section-label">{{ 'organisations.admins' | translate }}</span>
            <button *ngIf="!addingAdmin"
                    mat-icon-button
                    [matTooltip]="'organisations.addAdmin' | translate"
                    (click)="startAddAdmin()">
              <mat-icon>person_add</mat-icon>
            </button>
          </div>

          <div class="admin-chips">
            <span *ngIf="(org.orgAdmins || []).length === 0 && !addingAdmin" class="no-admins">
              {{ 'organisations.noAdmins' | translate }}
            </span>
            <span *ngFor="let admin of (org.orgAdmins || [])" class="admin-chip">
              {{ formatName(admin) }}
              <button class="chip-remove" [matTooltip]="'organisations.removeAdmin' | translate" (click)="removeAdmin(admin)">
                <mat-icon>close</mat-icon>
              </button>
            </span>

            <ng-container *ngIf="addingAdmin">
              <select class="admin-select" [(ngModel)]="selectedMemberId">
                <option value="" disabled>{{ 'organisations.selectMember' | translate }}</option>
                <option *ngFor="let m of nonAdminMembers" [value]="m.id">
                  {{ m.firstName }} {{ m.particles ? m.particles + ' ' : '' }}{{ m.lastName }}
                </option>
              </select>
              <button mat-icon-button color="primary" [disabled]="!selectedMemberId" (click)="confirmAddAdmin()">
                <mat-icon>check</mat-icon>
              </button>
              <button mat-icon-button (click)="cancelAddAdmin()">
                <mat-icon>close</mat-icon>
              </button>
            </ng-container>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Settings -->
        <app-manage-org-settings [orgId]="org.id"></app-manage-org-settings>

      </div>
    </div>
  `,
  styles: [`
    .header-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: var(--mat-sys-primary);
      flex-shrink: 0;
    }

    .header-title {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .demo-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
      border-radius: 4px;
      padding: 2px 6px;
      flex-shrink: 0;
    }

    .header-spacer { flex: 1; }

    .name-field {
      flex: 1;
      font-size: 14px;
    }

    /* Meta grid: icon + value pairs */
    .meta-grid {
      display: grid;
      grid-template-columns: 20px 1fr 20px 1fr;
      gap: 6px 10px;
      align-items: center;
      padding: 12px 0 16px;
    }

    .meta-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--mat-sys-on-surface-variant);
    }

    .meta-value {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    /* Admins section */
    .section {
      padding: 12px 0;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .section-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--mat-sys-on-surface-variant);
    }

    .admin-chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
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

    .admin-select {
      font-size: 13px;
      height: 28px;
      padding: 0 6px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 6px;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
      cursor: pointer;
      max-width: 180px;
    }
    .admin-select:focus {
      outline: 2px solid var(--mat-sys-primary);
      border-color: transparent;
    }
  `]
})
export class OrgDetailPanelComponent implements OnInit {
  org: OrgDetailOrg;
  allMembers: AllMember[] = [];

  editingName = false;
  editName = '';
  addingAdmin = false;
  selectedMemberId = '';
  changed = false;

  constructor(
    public panelRef: SlideInPanelRef<OrgDetailPanelComponent, boolean>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: OrgDetailPanelData,
    private panelService: SlideInPanelService,
    private notificationService: NotificationService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {
    this.org = { ...data.org };
  }

  ngOnInit(): void {
    this.loadMembers();
  }

  private async loadMembers(): Promise<void> {
    try {
      const result = await apolloClient.query({ query: GET_ALL_MEMBERS, fetchPolicy: 'network-only' }) as any;
      this.allMembers = result.data.members;
      this.cdr.markForCheck();
    } catch (e: any) {
      this.notificationService.error(e.message || 'Error loading members');
    }
  }

  close(): void {
    this.panelRef.close(this.changed);
  }

  get nonAdminMembers(): AllMember[] {
    const adminIds = new Set((this.org.orgAdmins || []).map(a => a.id));
    return this.allMembers.filter(m =>
      Number(m.organisationId) === Number(this.org.id) &&
      !adminIds.has(m.id) &&
      m.role !== 'sysadmin'
    );
  }

  formatName(m: OrgAdmin): string {
    return [m.firstName, m.particles, m.lastName].filter(Boolean).join(' ');
  }

  startEditName(): void { this.editingName = true; this.editName = this.org.name; }
  cancelEditName(): void { this.editingName = false; this.editName = ''; }

  async saveEditName(): Promise<void> {
    if (!this.editName.trim()) return;
    try {
      const result = await apolloClient.mutate({
        mutation: UPDATE_ORGANISATION,
        variables: { id: this.org.id, name: this.editName.trim() }
      }) as any;
      this.org = result.data.updateOrganisation;
      this.changed = true;
      this.cancelEditName();
      this.notificationService.success(this.translate.instant('organisations.updated'));
      this.cdr.markForCheck();
    } catch (e: any) {
      this.notificationService.error(e.message || 'Error updating organisation');
    }
  }

  startAddAdmin(): void { this.addingAdmin = true; this.selectedMemberId = ''; }
  cancelAddAdmin(): void { this.addingAdmin = false; this.selectedMemberId = ''; }

  async confirmAddAdmin(): Promise<void> {
    if (!this.selectedMemberId) return;
    try {
      await apolloClient.mutate({
        mutation: ASSIGN_ORG_ADMIN,
        variables: { memberId: this.selectedMemberId, orgId: this.org.id }
      });
      const member = this.allMembers.find(m => m.id === this.selectedMemberId);
      if (member) {
        const newAdmin: OrgAdmin = { id: member.id, firstName: member.firstName, particles: member.particles, lastName: member.lastName };
        this.org = { ...this.org, orgAdmins: [...this.org.orgAdmins, newAdmin] };
        this.changed = true;
      }
      this.cancelAddAdmin();
      this.notificationService.success(this.translate.instant('organisations.adminAdded'));
      this.cdr.markForCheck();
    } catch (e: any) {
      this.notificationService.error(e.message || 'Error adding admin');
    }
  }

  async removeAdmin(admin: OrgAdmin): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: REMOVE_ORG_ADMIN,
        variables: { memberId: admin.id, orgId: this.org.id }
      });
      this.org = { ...this.org, orgAdmins: this.org.orgAdmins.filter(a => a.id !== admin.id) };
      this.changed = true;
      this.notificationService.success(this.translate.instant('organisations.adminRemoved'));
      this.cdr.markForCheck();
    } catch (e: any) {
      this.notificationService.error(e.message || 'Error removing admin');
    }
  }

  async deleteOrg(): Promise<void> {
    const confirmRef = this.panelService.open<ConfirmDialogComponent, ConfirmDialogData>(
      ConfirmDialogComponent,
      {
        data: {
          title: this.translate.instant('common.delete'),
          message: this.translate.instant('organisations.confirmDelete', { name: this.org.name }),
          confirmText: this.translate.instant('common.delete'),
          confirmColor: 'warn',
        }
      }
    );
    confirmRef.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) return;
      try {
        await apolloClient.mutate({ mutation: DELETE_ORGANISATION, variables: { id: this.org.id } });
        this.notificationService.success(this.translate.instant('organisations.deleted'));
        this.panelRef.close(true);
      } catch (e: any) {
        this.notificationService.error(e.message || 'Error deleting organisation');
      }
    });
  }
}
