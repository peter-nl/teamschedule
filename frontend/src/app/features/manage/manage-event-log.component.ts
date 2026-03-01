import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';
import { NotificationService } from '../../shared/services/notification.service';

const GET_EVENT_LOG = gql`
  query GetEventLog($limit: Int, $offset: Int, $eventType: String) {
    eventLog(limit: $limit, offset: $offset, eventType: $eventType) {
      id
      createdAt
      eventType
      actorId
      ipAddress
      details
    }
  }
`;

interface EventLogEntry {
  id: string;
  createdAt: string;
  eventType: string;
  actorId: string | null;
  ipAddress: string | null;
  details: string | null;
}

const PAGE_SIZE = 50;

const ALL_EVENT_TYPES = [
  'login_success',
  'login_failed',
  'demo_requested',
  'demo_claimed',
  'demo_terminated',
  'password_reset_requested',
  'password_reset_completed',
  'email_config_saved',
  'org_created',
  'org_deleted',
  'member_created',
  'member_deleted',
];

@Component({
  selector: 'app-manage-event-log',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  template: `
    <div class="log-wrap">
      <div class="log-header">
        <div>
          <h3>{{ 'eventLog.title' | translate }}</h3>
          <p class="log-desc">{{ 'eventLog.description' | translate }}</p>
        </div>
      </div>

      <div class="filter-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>{{ 'eventLog.filterLabel' | translate }}</mat-label>
          <mat-select [(ngModel)]="selectedType" (ngModelChange)="onFilterChange()">
            <mat-option value="">{{ 'eventLog.filterAll' | translate }}</mat-option>
            <mat-option *ngFor="let t of eventTypes" [value]="t">
              {{ 'eventLog.types.' + t | translate }}
            </mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-icon-button (click)="reload()" [disabled]="loading" title="Refresh">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <div *ngIf="loading && entries.length === 0" class="loading-center">
        <mat-progress-spinner mode="indeterminate" diameter="32"></mat-progress-spinner>
      </div>

      <div *ngIf="!loading && entries.length === 0" class="empty-state">
        <mat-icon>history</mat-icon>
        <span>{{ 'eventLog.noData' | translate }}</span>
      </div>

      <table *ngIf="entries.length > 0" class="log-table">
        <thead>
          <tr>
            <th>{{ 'eventLog.colTime' | translate }}</th>
            <th>{{ 'eventLog.colEvent' | translate }}</th>
            <th>{{ 'eventLog.colActor' | translate }}</th>
            <th>{{ 'eventLog.colIp' | translate }}</th>
            <th>{{ 'eventLog.colDetails' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let entry of entries">
            <td class="nowrap">{{ entry.createdAt | date:'dd-MM-yyyy HH:mm:ss' }}</td>
            <td><span class="event-badge" [class]="'evt-' + entry.eventType.replace('_', '-')">{{ 'eventLog.types.' + entry.eventType | translate }}</span></td>
            <td>{{ entry.actorId || '–' }}</td>
            <td class="nowrap">{{ entry.ipAddress || '–' }}</td>
            <td class="details-cell">{{ formatDetails(entry.details) }}</td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="entries.length > 0 && hasMore" class="load-more">
        <button mat-stroked-button (click)="loadMore()" [disabled]="loading">
          <mat-spinner *ngIf="loading" diameter="16"></mat-spinner>
          <mat-icon *ngIf="!loading">expand_more</mat-icon>
          {{ 'eventLog.loadMore' | translate }}
        </button>
      </div>
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

    .log-wrap {
      padding: 24px;
    }

    .log-header {
      margin-bottom: 16px;
    }

    .log-header h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .log-desc {
      margin: 0;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    .filter-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .filter-field {
      width: 260px;
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

    .log-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .log-table th {
      text-align: left;
      padding: 8px 10px;
      font-weight: 500;
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      white-space: nowrap;
    }

    .log-table td {
      padding: 7px 10px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      color: var(--mat-sys-on-surface);
      vertical-align: top;
    }

    .log-table tr:last-child td {
      border-bottom: none;
    }

    .nowrap {
      white-space: nowrap;
    }

    .event-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
      background: var(--mat-sys-surface-variant);
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
    }

    .details-cell {
      color: var(--mat-sys-on-surface-variant);
      max-width: 300px;
      word-break: break-word;
    }

    .load-more {
      display: flex;
      justify-content: center;
      padding: 16px 0;
    }
  `]
})
export class ManageEventLogComponent implements OnInit {
  loading = true;
  entries: EventLogEntry[] = [];
  selectedType = '';
  hasMore = false;
  readonly eventTypes = ALL_EVENT_TYPES;

  constructor(
    private notificationService: NotificationService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.entries = [];
    this.hasMore = false;
    this.fetch(0);
  }

  onFilterChange(): void {
    this.reload();
  }

  loadMore(): void {
    this.fetch(this.entries.length);
  }

  private fetch(offset: number): void {
    this.loading = true;
    apolloClient.query({
      query: GET_EVENT_LOG,
      fetchPolicy: 'network-only',
      variables: {
        limit: PAGE_SIZE,
        offset,
        eventType: this.selectedType || null
      }
    }).then((result: any) => {
      const rows: EventLogEntry[] = result.data?.eventLog ?? [];
      this.entries = [...this.entries, ...rows];
      this.hasMore = rows.length === PAGE_SIZE;
    }).catch(() => {
      this.notificationService.error(this.translate.instant('common.error'));
    }).finally(() => { this.loading = false; });
  }

  formatDetails(json: string | null): string {
    if (!json) return '';
    try {
      const obj = JSON.parse(json);
      return Object.entries(obj).map(([k, v]) => `${k}=${v}`).join('  ');
    } catch {
      return json;
    }
  }
}
