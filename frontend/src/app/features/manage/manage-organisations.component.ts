import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { NotificationService } from '../../shared/services/notification.service';
import { SlideInPanelService } from '../../shared/services/slide-in-panel.service';
import { UserPreferencesService } from '../../shared/services/user-preferences.service';
import { OrgDetailPanelComponent, OrgDetailPanelData, OrgDetailOrg } from '../../shared/components/org-detail-panel.component';

interface OrgAdmin {
  id: string;
  firstName: string;
  particles: string | null;
  lastName: string;
}

interface Organisation extends OrgDetailOrg {}

const GET_ORGANISATIONS = gql`
  query Organisations {
    organisations {
      id
      name
      memberCount
      teamCount
      orgAdmins { id firstName particles lastName }
      isDemo
      demoExpiresAt
      demoEmail
      createdAt
    }
  }
`;

const CREATE_ORGANISATION = gql`
  mutation CreateOrganisation($name: String!) {
    createOrganisation(name: $name) {
      id name memberCount teamCount
      orgAdmins { id firstName particles lastName }
      isDemo demoExpiresAt demoEmail createdAt
    }
  }
`;

@Component({
  selector: 'app-manage-organisations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    TranslateModule,
  ],
  template: `
    <div class="orgs-view" *ngIf="!loading; else loadingTpl">

      <!-- Toolbar -->
      <div class="view-header">
        <button mat-icon-button
                (click)="toggleCreateForm()"
                [matTooltip]="'organisations.create' | translate">
          <mat-icon>add_business</mat-icon>
        </button>
        <input class="search-input"
               [(ngModel)]="searchText"
               (ngModelChange)="applyFilter()"
               [placeholder]="'organisations.search' | translate">
      </div>

      <!-- Inline create form -->
      <div class="create-form" *ngIf="showCreateForm">
        <mat-form-field appearance="outline" class="create-field">
          <mat-label>{{ 'organisations.newName' | translate }}</mat-label>
          <input matInput [(ngModel)]="newName"
                 (keydown.enter)="createOrg()"
                 (keydown.escape)="toggleCreateForm()"
                 [placeholder]="'organisations.newNamePlaceholder' | translate">
        </mat-form-field>
        <button mat-icon-button color="primary"
                [disabled]="!newName.trim() || saving"
                (click)="createOrg()"
                [matTooltip]="'organisations.create' | translate">
          <mat-icon>check</mat-icon>
        </button>
        <button mat-icon-button (click)="toggleCreateForm()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Table -->
      <div class="table-scroll">
        <mat-table [dataSource]="dataSource" matSort class="orgs-table">

          <ng-container matColumnDef="name">
            <mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'organisations.name' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let org">
              <mat-icon class="row-icon">corporate_fare</mat-icon>
              <span class="org-name">{{ org.name }}</span>
              <span *ngIf="org.isDemo" class="demo-badge">DEMO</span>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="admins">
            <mat-header-cell *matHeaderCellDef>{{ 'organisations.admins' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let org" class="admins-cell">
              <span *ngIf="(org.orgAdmins || []).length > 0">{{ formatAdmins(org.orgAdmins) }}</span>
              <span *ngIf="(org.orgAdmins || []).length === 0" class="no-value">—</span>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="memberCount">
            <mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'organisations.membersColumn' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let org">{{ org.memberCount }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="teamCount">
            <mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'organisations.teamsColumn' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let org">{{ org.teamCount }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'organisations.createdAt' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let org">
              <span *ngIf="org.createdAt">{{ org.createdAt | date:'dd MMM yyyy' }}</span>
              <span *ngIf="!org.createdAt" class="no-value">—</span>
            </mat-cell>
          </ng-container>

          <mat-header-row *matHeaderRowDef="tableColumns; sticky: true"></mat-header-row>
          <mat-row *matRowDef="let row; columns: tableColumns;" (dblclick)="openDetail(row)"></mat-row>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" [attr.colspan]="tableColumns.length">
              <div class="empty-state">
                <mat-icon>corporate_fare</mat-icon>
                <span>{{ 'organisations.empty' | translate }}</span>
              </div>
            </td>
          </tr>
        </mat-table>
      </div>
    </div>

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

    .orgs-view {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    .view-header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 8px 4px 8px;
      flex-shrink: 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      color: var(--mat-sys-on-surface);
      font-size: 14px;
      padding: 4px;
    }
    .search-input::placeholder { color: var(--mat-sys-on-surface-variant); }

    .create-form {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      background: var(--mat-sys-surface-container-low);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      flex-shrink: 0;
    }
    .create-field { flex: 1; }

    .table-scroll {
      flex: 1;
      overflow-y: auto;
    }

    .orgs-table {
      width: 100%;
      background: transparent;
    }

    .orgs-table .mat-mdc-header-cell {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container);
      padding: 0 16px;
    }

    .orgs-table .mat-mdc-cell {
      font-size: 14px;
      padding: 0 16px;
    }

    .orgs-table .mat-mdc-row {
      cursor: pointer;
      min-height: 44px;
    }

    .orgs-table .mat-mdc-row:hover .mat-mdc-cell {
      background: var(--mat-sys-surface-container);
    }

    /* Name column */
    .row-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      opacity: 0.5;
      flex-shrink: 0;
      margin-right: 10px;
    }

    .org-name {
      font-weight: 500;
    }

    .demo-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
      border-radius: 4px;
      padding: 2px 6px;
      margin-left: 8px;
      flex-shrink: 0;
    }

    /* Column widths and alignment via mat-column-* (applies to both header and cell) */
    .orgs-table .mat-column-name {
      flex: 2 1 160px;
      min-width: 120px;
    }

    .orgs-table .mat-column-admins {
      flex: 2 1 140px;
      min-width: 100px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13px;
    }

    .orgs-table .mat-column-memberCount,
    .orgs-table .mat-column-teamCount {
      flex: 0 0 72px;
      justify-content: flex-end;
      text-align: right;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13px;
    }

    .orgs-table .mat-column-createdAt {
      flex: 0 0 120px;
      justify-content: flex-end;
      text-align: right;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13px;
    }

    .no-value {
      color: var(--mat-sys-on-surface-variant);
      opacity: 0.5;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 16px;
      color: var(--mat-sys-on-surface-variant);
      gap: 12px;
      font-size: 14px;
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 1;
      padding: 48px;
    }
  `]
})
export class ManageOrganisationsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<Organisation>([]);
  tableColumns = ['name', 'admins', 'memberCount', 'teamCount', 'createdAt'];
  loading = false;
  saving = false;
  newName = '';
  searchText = '';
  showCreateForm = false;

  constructor(
    private notificationService: NotificationService,
    private translate: TranslateService,
    private panelService: SlideInPanelService,
    private userPreferencesService: UserPreferencesService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      const result = await apolloClient.query({ query: GET_ORGANISATIONS, fetchPolicy: 'network-only' }) as any;
      this.dataSource.data = result.data.organisations;
    } catch (e: any) {
      this.notificationService.error(e.message || 'Error loading organisations');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  applyFilter(): void {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) this.newName = '';
    this.cdr.markForCheck();
  }

  formatAdmins(admins: OrgAdmin[]): string {
    return admins.map(a =>
      [a.firstName, a.particles, a.lastName].filter(Boolean).join(' ')
    ).join(', ');
  }

  openDetail(org: Organisation): void {
    const leftOffset = this.userPreferencesService.getManagementPanelLeftOffset();

    const panelRef = this.panelService.open<OrgDetailPanelComponent, OrgDetailPanelData, boolean>(
      OrgDetailPanelComponent,
      { leftOffset, data: { org } }
    );

    panelRef.afterClosed().subscribe(changed => {
      if (changed) this.loadData();
    });
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
      const created = result.data.createOrganisation;
      this.dataSource.data = [...this.dataSource.data, created];
      this.newName = '';
      this.showCreateForm = false;
      this.notificationService.success(this.translate.instant('organisations.created'));
      this.cdr.markForCheck();
      this.openDetail(created);
    } catch (e: any) {
      this.notificationService.error(e.message || 'Error creating organisation');
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }
}
