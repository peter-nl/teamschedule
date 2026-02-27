import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';

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

const UPDATE_MEMBER_ROLE = gql`
  mutation UpdateMemberRole($memberId: String!, $role: String!) {
    updateMemberRole(memberId: $memberId, role: $role) {
      id
      role
    }
  }
`;

@Component({
  selector: 'app-manage-organisations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    TranslateModule,
  ],
  template: `
    <div class="orgs-container">
      <mat-card class="orgs-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>business</mat-icon>
          <mat-card-title>{{ 'organisations.title' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>

          <!-- Loading -->
          <div *ngIf="loading" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <!-- Org list -->
          <div *ngIf="!loading" class="orgs-list">
            <div *ngFor="let org of organisations" class="org-row">

              <!-- Display mode -->
              <div *ngIf="editingId !== org.id" class="org-display">
                <div class="org-info">
                  <span class="org-name">{{ org.name }}</span>
                  <span class="org-meta">
                    {{ org.memberCount }} {{ 'organisations.members' | translate }} &middot;
                    {{ org.teamCount }} {{ 'organisations.teams' | translate }}
                  </span>

                  <!-- Org admins -->
                  <div class="admins-row">
                    <span class="admins-label">{{ 'organisations.admins' | translate }}:</span>
                    <div class="admin-chips">
                      <span *ngFor="let admin of (org.orgAdmins || [])" class="admin-chip">
                        {{ admin.firstName }} {{ admin.particles ? admin.particles + ' ' : '' }}{{ admin.lastName }}
                        <button class="chip-remove"
                                [matTooltip]="'organisations.removeAdmin' | translate"
                                (click)="removeAdmin(org, admin)">
                          <mat-icon>close</mat-icon>
                        </button>
                      </span>
                      <span *ngIf="(org.orgAdmins || []).length === 0 && addingAdminForOrgId !== org.id" class="no-admins">{{ 'organisations.noAdmins' | translate }}</span>

                      <!-- Add admin inline picker -->
                      <ng-container *ngIf="addingAdminForOrgId !== org.id">
                        <button class="add-admin-btn"
                                [matTooltip]="'organisations.addAdmin' | translate"
                                (click)="startAddAdmin(org)">
                          <mat-icon>person_add</mat-icon>
                        </button>
                      </ng-container>
                      <ng-container *ngIf="addingAdminForOrgId === org.id">
                        <select class="admin-select" [(ngModel)]="selectedMemberId">
                          <option value="" disabled>{{ 'organisations.selectMember' | translate }}</option>
                          <option *ngFor="let m of getNonAdminMembers(org)" [value]="m.id">
                            {{ m.firstName }} {{ m.particles ? m.particles + ' ' : '' }}{{ m.lastName }}
                          </option>
                        </select>
                        <button mat-icon-button color="primary"
                                [disabled]="!selectedMemberId"
                                (click)="confirmAddAdmin(org)">
                          <mat-icon>check</mat-icon>
                        </button>
                        <button mat-icon-button (click)="cancelAddAdmin()">
                          <mat-icon>close</mat-icon>
                        </button>
                      </ng-container>
                    </div>
                  </div>
                </div>

                <div class="org-actions">
                  <button mat-icon-button
                          [matTooltip]="'common.edit' | translate"
                          (click)="startEdit(org)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button
                          color="warn"
                          [matTooltip]="'common.delete' | translate"
                          [disabled]="org.memberCount > 0 || org.teamCount > 0"
                          (click)="deleteOrg(org)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>

              <!-- Edit mode -->
              <div *ngIf="editingId === org.id" class="org-edit">
                <mat-form-field appearance="outline" class="edit-field">
                  <mat-label>{{ 'organisations.name' | translate }}</mat-label>
                  <input matInput [(ngModel)]="editName" (keydown.enter)="saveEdit(org)" (keydown.escape)="cancelEdit()">
                </mat-form-field>
                <div class="edit-actions">
                  <button mat-icon-button color="primary" (click)="saveEdit(org)" [disabled]="!editName.trim()">
                    <mat-icon>check</mat-icon>
                  </button>
                  <button mat-icon-button (click)="cancelEdit()">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
            </div>

            <div *ngIf="organisations.length === 0 && !loading" class="empty-state">
              {{ 'organisations.empty' | translate }}
            </div>

            <mat-divider *ngIf="organisations.length > 0"></mat-divider>
          </div>

          <!-- Add new org -->
          <div class="add-org-row" *ngIf="!loading">
            <mat-form-field appearance="outline" class="add-field">
              <mat-label>{{ 'organisations.newName' | translate }}</mat-label>
              <input matInput [(ngModel)]="newName" (keydown.enter)="createOrg()" placeholder="{{ 'organisations.newNamePlaceholder' | translate }}">
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="createOrg()" [disabled]="!newName.trim() || saving">
              <mat-icon>add</mat-icon>
              {{ 'organisations.create' | translate }}
            </button>
          </div>

        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .orgs-container {
      width: 480px;
      max-width: 100%;
    }

    .orgs-card {
      width: 100%;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 32px;
    }

    .orgs-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 16px;
    }

    .org-row {
      padding: 4px 0;
    }

    .org-display {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 8px 4px;
      border-radius: 8px;
    }

    .org-display:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .org-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .org-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .org-meta {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .admins-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }

    .admins-label {
      font-size: 12px;
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

    .chip-remove:hover {
      background: var(--mat-sys-outline-variant);
    }

    .chip-remove mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

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

    .add-admin-btn:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .add-admin-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
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
      max-width: 160px;
    }

    .admin-select:focus {
      outline: 2px solid var(--mat-sys-primary);
      border-color: transparent;
    }

    .org-actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }

    .org-edit {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .edit-field {
      flex: 1;
    }

    .edit-actions {
      display: flex;
      gap: 4px;
    }

    .empty-state {
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      padding: 24px;
      font-size: 14px;
    }

    .add-org-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }

    .add-field {
      flex: 1;
    }
  `]
})
export class ManageOrganisationsComponent implements OnInit {
  organisations: Organisation[] = [];
  allMembers: AllMember[] = [];
  loading = false;
  saving = false;
  newName = '';
  editingId: string | null = null;
  editName = '';
  addingAdminForOrgId: string | null = null;
  selectedMemberId = '';

  constructor(
    private snackBar: MatSnackBar,
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
      this.snackBar.open(e.message || 'Error loading data', this.translate.instant('common.close'), { duration: 4000 });
    } finally {
      this.loading = false;
    }
  }

  getNonAdminMembers(org: Organisation): AllMember[] {
    const adminIds = new Set((org.orgAdmins || []).map(a => a.id));
    return this.allMembers.filter(m =>
      Number(m.organisationId) === Number(org.id) && !adminIds.has(m.id) && m.role !== 'sysadmin' && m.role !== 'orgadmin'
    );
  }

  startAddAdmin(org: Organisation): void {
    this.cancelEdit();
    this.addingAdminForOrgId = org.id;
    this.selectedMemberId = '';
  }

  cancelAddAdmin(): void {
    this.addingAdminForOrgId = null;
    this.selectedMemberId = '';
  }

  async confirmAddAdmin(org: Organisation): Promise<void> {
    if (!this.selectedMemberId) return;
    try {
      await apolloClient.mutate({
        mutation: UPDATE_MEMBER_ROLE,
        variables: { memberId: this.selectedMemberId, role: 'orgadmin' }
      });
      // Update local orgAdmins list
      const member = this.allMembers.find(m => m.id === this.selectedMemberId);
      if (member) {
        member.role = 'orgadmin';
        this.organisations = this.organisations.map(o =>
          o.id === org.id
            ? { ...o, orgAdmins: [...o.orgAdmins, { id: member.id, firstName: member.firstName, particles: member.particles, lastName: member.lastName }] }
            : o
        );
      }
      this.cancelAddAdmin();
      this.snackBar.open(this.translate.instant('organisations.adminAdded'), this.translate.instant('common.close'), { duration: 3000 });
    } catch (e: any) {
      this.snackBar.open(e.message || 'Error adding admin', this.translate.instant('common.close'), { duration: 4000 });
    }
  }

  async removeAdmin(org: Organisation, admin: OrgAdmin): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: UPDATE_MEMBER_ROLE,
        variables: { memberId: admin.id, role: 'member' }
      });
      // Update local state
      const member = this.allMembers.find(m => m.id === admin.id);
      if (member) member.role = 'member';
      this.organisations = this.organisations.map(o =>
        o.id === org.id
          ? { ...o, orgAdmins: o.orgAdmins.filter(a => a.id !== admin.id) }
          : o
      );
      this.snackBar.open(this.translate.instant('organisations.adminRemoved'), this.translate.instant('common.close'), { duration: 3000 });
    } catch (e: any) {
      this.snackBar.open(e.message || 'Error removing admin', this.translate.instant('common.close'), { duration: 4000 });
    }
  }

  async createOrg(): Promise<void> {
    const name = this.newName.trim();
    if (!name) return;
    this.saving = true;
    try {
      const result = await apolloClient.mutate({
        mutation: CREATE_ORGANISATION,
        variables: { name }
      }) as any;
      this.organisations = [...this.organisations, result.data.createOrganisation];
      this.newName = '';
      this.snackBar.open(this.translate.instant('organisations.created'), this.translate.instant('common.close'), { duration: 3000 });
    } catch (e: any) {
      this.snackBar.open(e.message || 'Error creating organisation', this.translate.instant('common.close'), { duration: 4000 });
    } finally {
      this.saving = false;
    }
  }

  startEdit(org: Organisation): void {
    this.cancelAddAdmin();
    this.editingId = org.id;
    this.editName = org.name;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editName = '';
  }

  async saveEdit(org: Organisation): Promise<void> {
    const name = this.editName.trim();
    if (!name) return;
    try {
      const result = await apolloClient.mutate({
        mutation: UPDATE_ORGANISATION,
        variables: { id: org.id, name }
      }) as any;
      const updated = result.data.updateOrganisation;
      this.organisations = this.organisations.map(o => o.id === updated.id ? updated : o);
      this.cancelEdit();
      this.snackBar.open(this.translate.instant('organisations.updated'), this.translate.instant('common.close'), { duration: 3000 });
    } catch (e: any) {
      this.snackBar.open(e.message || 'Error updating organisation', this.translate.instant('common.close'), { duration: 4000 });
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
      this.snackBar.open(this.translate.instant('organisations.deleted'), this.translate.instant('common.close'), { duration: 3000 });
    } catch (e: any) {
      this.snackBar.open(e.message || 'Error deleting organisation', this.translate.instant('common.close'), { duration: 4000 });
    }
  }
}
