import { Component, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SlideInPanelRef, SlideInPanelService, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';
import { UserPreferencesService } from '../services/user-preferences.service';
import { TeamEditDialogComponent, TeamEditDialogData } from './team-edit-dialog.component';
import { MemberDetailDialogComponent, MemberDetailDialogData } from './member-detail-dialog.component';

export interface TeamMembersPanelData {
  teamId: string;
  teamName: string;
  members: Member[];
  allMembers: Member[];
}

interface Member {
  id: string;
  memberNo: number;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
  username: string;
  role: string;
  avatarUrl: string | null;
}

@Component({
  selector: 'app-team-members-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatTooltipModule,
    MatDividerModule,
    TranslateModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <div class="header-title-group">
          <span class="panel-title">{{ data.teamName }}</span>
          <span class="member-count">{{ data.members.length }} {{ 'teams.members' | translate }}</span>
        </div>
        <button mat-icon-button (click)="openEdit()" [matTooltip]="'common.edit' | translate">
          <mat-icon>edit</mat-icon>
        </button>
        <button mat-icon-button (click)="panelRef.close(false)" [matTooltip]="'common.close' | translate">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-divider></mat-divider>

      <div class="table-scroll">
        <mat-table [dataSource]="dataSource" matSort class="members-table" *ngIf="data.members.length > 0">

          <ng-container matColumnDef="avatar">
            <mat-header-cell *matHeaderCellDef class="avatar-col"></mat-header-cell>
            <mat-cell *matCellDef="let m" class="avatar-col">
              <img *ngIf="m.avatarUrl" [src]="m.avatarUrl" class="list-avatar" alt="">
              <mat-icon *ngIf="!m.avatarUrl" class="list-avatar-icon">account_circle</mat-icon>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="no">
            <mat-header-cell *matHeaderCellDef mat-sort-header class="no-col">{{ 'members.memberNo' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let m" class="no-col secondary-cell">#{{ m.memberNo }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="name">
            <mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'members.name' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let m">
              {{ m.firstName }} {{ m.particles ? m.particles + ' ' : '' }}{{ m.lastName }}
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="username">
            <mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'members.username' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let m" class="secondary-cell">{{ m.username }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="email">
            <mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'members.email' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let m" class="secondary-cell">{{ m.email }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="role">
            <mat-header-cell *matHeaderCellDef class="role-col">{{ 'members.role' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let m" class="role-col">
              <mat-icon *ngIf="m.role === 'orgadmin'" [matTooltip]="'members.roles.orgAdmin' | translate" class="role-icon">shield</mat-icon>
              <mat-icon *ngIf="m.role === 'teamadmin'" [matTooltip]="'members.roles.teamAdmin' | translate" class="role-icon">manage_accounts</mat-icon>
            </mat-cell>
          </ng-container>

          <mat-header-row *matHeaderRowDef="tableColumns; sticky: true"></mat-header-row>
          <mat-row *matRowDef="let row; columns: tableColumns;" (dblclick)="openMemberDetail(row)" class="member-row"></mat-row>
        </mat-table>

        <div *ngIf="data.members.length === 0" class="empty-state">
          <mat-icon>person_off</mat-icon>
          <span>{{ 'teams.noMembersAssigned' | translate }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .slide-in-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 8px 12px 20px;
      flex-shrink: 0;
    }

    .header-title-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .panel-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      line-height: 1.2;
    }

    .member-count {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .table-scroll {
      flex: 1;
      overflow-y: auto;
    }

    .members-table {
      width: 100%;
      background: transparent;
    }

    .members-table .mat-mdc-header-cell {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container);
      padding: 0 8px;
      text-align: left;
      justify-content: flex-start;
    }

    .members-table .mat-mdc-cell {
      font-size: 14px;
      color: var(--mat-sys-on-surface);
      padding: 0 8px;
      text-align: left;
      justify-content: flex-start;
    }

    .members-table .mat-mdc-row {
      min-height: 44px;
    }

    .member-row {
      cursor: pointer;
    }

    .avatar-col {
      width: 44px;
      min-width: 44px;
      max-width: 44px;
      padding: 0 4px 0 12px !important;
    }

    .no-col {
      width: 60px;
      min-width: 60px;
      max-width: 60px;
    }

    .role-col {
      width: 56px;
      min-width: 56px;
      max-width: 56px;
    }

    .secondary-cell {
      color: var(--mat-sys-on-surface-variant) !important;
      font-size: 13px !important;
    }

    .role-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--mat-sys-primary);
    }

    .list-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
    }

    .list-avatar-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--mat-sys-on-surface-variant);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 24px;
      gap: 12px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 14px;
    }

    .empty-state mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }
  `]
})
export class TeamMembersPanelComponent implements AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;

  tableColumns = ['avatar', 'no', 'name', 'username', 'email', 'role'];
  dataSource = new MatTableDataSource<Member>([]);

  constructor(
    @Inject(SLIDE_IN_PANEL_DATA) public data: TeamMembersPanelData,
    public panelRef: SlideInPanelRef<boolean>,
    private panelService: SlideInPanelService,
    private userPreferencesService: UserPreferencesService,
    private translate: TranslateService
  ) {
    this.dataSource.data = [...data.members];
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'name': return item.lastName + ' ' + (item.particles ?? '') + ' ' + item.firstName;
        case 'no':   return item.memberNo;
        default:     return (item as any)[property] ?? '';
      }
    };
  }

  openMemberDetail(member: Member): void {
    const isNarrow = window.innerWidth < 768;
    const navExpanded = this.userPreferencesService.preferences.navigationExpanded;
    const railWidth = isNarrow ? 0 : (navExpanded ? 220 : 80);
    const leftOffset = railWidth > 0 ? `${railWidth}px` : undefined;

    this.panelService.open<MemberDetailDialogComponent, MemberDetailDialogData>(
      MemberDetailDialogComponent,
      { leftOffset, data: { memberId: member.id, leftOffset } }
    );
  }

  openEdit(): void {
    const isNarrow = window.innerWidth < 768;
    const navExpanded = this.userPreferencesService.preferences.navigationExpanded;
    const railWidth = isNarrow ? 0 : (navExpanded ? 220 : 80);
    const leftOffset = railWidth > 0 ? `${railWidth}px` : undefined;

    const editRef = this.panelService.open<TeamEditDialogComponent, TeamEditDialogData, boolean>(
      TeamEditDialogComponent,
      {
        leftOffset,
        data: {
          team: {
            id: this.data.teamId,
            name: this.data.teamName,
            memberIds: this.data.members.map(m => m.id)
          },
          allMembers: this.data.allMembers
        }
      }
    );

    editRef.afterClosed().subscribe(saved => {
      if (saved) {
        this.panelRef.close(true);
      }
    });
  }
}
