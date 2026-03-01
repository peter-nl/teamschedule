import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { NotificationService } from '../../shared/services/notification.service';

const GET_DEMO_ORGS = gql`
  query GetDemoOrgs {
    demoOrgs {
      id
      name
      demoEmail
      createdAt
      demoExpiresAt
      memberCount
    }
  }
`;

const TERMINATE_DEMO = gql`
  mutation TerminateDemo($orgId: ID!) {
    terminateDemo(orgId: $orgId) {
      success
      message
    }
  }
`;

interface DemoOrg {
  id: string;
  name: string;
  demoEmail: string | null;
  createdAt: string | null;
  demoExpiresAt: string | null;
  memberCount: number;
}

@Component({
  selector: 'app-manage-demos',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  template: `
    <div class="demos-wrap">
      <div class="demos-header">
        <div>
          <h3>{{ 'demos.title' | translate }}</h3>
          <p class="demos-desc">{{ 'demos.description' | translate }}</p>
        </div>
        <button mat-icon-button (click)="load()" [disabled]="loading" title="Refresh">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <div *ngIf="loading" class="loading-center">
        <mat-progress-spinner mode="indeterminate" diameter="32"></mat-progress-spinner>
      </div>

      <div *ngIf="!loading && orgs.length === 0" class="empty-state">
        <mat-icon>science</mat-icon>
        <span>{{ 'demos.noData' | translate }}</span>
      </div>

      <table *ngIf="!loading && orgs.length > 0" class="demos-table">
        <thead>
          <tr>
            <th>{{ 'demos.colName' | translate }}</th>
            <th>{{ 'demos.colEmail' | translate }}</th>
            <th>{{ 'demos.colCreated' | translate }}</th>
            <th>{{ 'demos.colExpires' | translate }}</th>
            <th class="center">{{ 'demos.colMembers' | translate }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let org of orgs">
            <td>{{ org.name }}</td>
            <td>{{ org.demoEmail || '–' }}</td>
            <td>{{ org.createdAt | date:'dd-MM-yyyy HH:mm' }}</td>
            <td [class.expired]="isExpired(org.demoExpiresAt)">
              {{ org.demoExpiresAt | date:'dd-MM-yyyy HH:mm' }}
            </td>
            <td class="center">{{ org.memberCount }}</td>
            <td class="action-cell">
              <ng-container *ngIf="confirmingId !== org.id">
                <button mat-stroked-button color="warn" (click)="startConfirm(org.id)"
                        [disabled]="terminatingId === org.id">
                  <mat-icon>delete_forever</mat-icon>
                  {{ 'demos.terminateBtn' | translate }}
                </button>
              </ng-container>
              <ng-container *ngIf="confirmingId === org.id">
                <button mat-flat-button color="warn" (click)="doTerminate(org)"
                        [disabled]="terminatingId === org.id">
                  <mat-spinner *ngIf="terminatingId === org.id" diameter="16"></mat-spinner>
                  <mat-icon *ngIf="terminatingId !== org.id">warning</mat-icon>
                  {{ 'demos.confirmTerminate' | translate }}
                </button>
                <button mat-button (click)="cancelConfirm()" [disabled]="terminatingId === org.id">
                  {{ 'demos.cancelTerminate' | translate }}
                </button>
              </ng-container>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    .demos-wrap {
      padding: 24px;
    }

    .demos-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .demos-header h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .demos-desc {
      margin: 0;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    .loading-center {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .empty-state {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 48px 0;
      justify-content: center;
      color: var(--mat-sys-on-surface-variant);
    }

    .demos-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .demos-table th {
      text-align: left;
      padding: 8px 12px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      white-space: nowrap;
    }

    .demos-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      color: var(--mat-sys-on-surface);
    }

    .demos-table tr:last-child td {
      border-bottom: none;
    }

    .center {
      text-align: center;
    }

    .expired {
      color: var(--mat-sys-error);
    }

    .action-cell {
      white-space: nowrap;
      display: flex;
      gap: 8px;
      align-items: center;
    }
  `]
})
export class ManageDemosComponent implements OnInit {
  loading = true;
  orgs: DemoOrg[] = [];
  confirmingId: string | null = null;
  terminatingId: string | null = null;

  constructor(
    private notificationService: NotificationService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    apolloClient.query({ query: GET_DEMO_ORGS, fetchPolicy: 'network-only' })
      .then((result: any) => {
        this.orgs = result.data?.demoOrgs ?? [];
      })
      .catch(() => {
        this.notificationService.error(this.translate.instant('common.error'));
      })
      .finally(() => { this.loading = false; });
  }

  isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  startConfirm(orgId: string): void {
    this.confirmingId = orgId;
  }

  cancelConfirm(): void {
    this.confirmingId = null;
  }

  async doTerminate(org: DemoOrg): Promise<void> {
    this.terminatingId = org.id;
    try {
      const result: any = await apolloClient.mutate({
        mutation: TERMINATE_DEMO,
        variables: { orgId: org.id }
      });
      const r = result.data.terminateDemo;
      if (r.success) {
        this.orgs = this.orgs.filter(o => o.id !== org.id);
        this.notificationService.success(this.translate.instant('demos.terminated', { name: org.name }));
      } else {
        this.notificationService.error(r.message);
      }
    } catch (e: any) {
      this.notificationService.error(e.message || this.translate.instant('common.error'));
    } finally {
      this.terminatingId = null;
      this.confirmingId = null;
    }
  }
}
