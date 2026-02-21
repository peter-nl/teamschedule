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

interface Organisation {
  id: string;
  name: string;
  memberCount: number;
  teamCount: number;
}

const GET_ORGANISATIONS = gql`
  query Organisations {
    organisations {
      id
      name
      memberCount
      teamCount
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
              <div *ngIf="editingId !== org.id" class="org-display">
                <div class="org-info">
                  <span class="org-name">{{ org.name }}</span>
                  <span class="org-meta">
                    {{ org.memberCount }} {{ 'organisations.members' | translate }} &middot;
                    {{ org.teamCount }} {{ 'organisations.teams' | translate }}
                  </span>
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
      width: 400px;
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
      align-items: center;
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

    .org-actions {
      display: flex;
      gap: 4px;
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
  loading = false;
  saving = false;
  newName = '';
  editingId: string | null = null;
  editName = '';

  constructor(
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadOrganisations();
  }

  private async loadOrganisations(): Promise<void> {
    this.loading = true;
    try {
      const result = await apolloClient.query({
        query: GET_ORGANISATIONS,
        fetchPolicy: 'network-only'
      }) as any;
      this.organisations = result.data.organisations;
    } catch (e: any) {
      this.snackBar.open(e.message || 'Error loading organisations', this.translate.instant('common.close'), { duration: 4000 });
    } finally {
      this.loading = false;
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
