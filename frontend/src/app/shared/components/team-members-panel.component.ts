import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SlideInPanelRef, SlideInPanelService, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';
import { UserPreferencesService } from '../services/user-preferences.service';
import { TeamEditDialogComponent, TeamEditDialogData } from './team-edit-dialog.component';

export interface TeamMembersPanelData {
  teamId: string;
  teamName: string;
  members: Member[];
  allMembers: Member[];
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
}

@Component({
  selector: 'app-team-members-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatDividerModule,
    TranslateModule
  ],
  template: `
    <div class="panel-container">
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
        <mat-table [dataSource]="sortedMembers" class="members-table" *ngIf="data.members.length > 0">
          <ng-container matColumnDef="name">
            <mat-header-cell *matHeaderCellDef>{{ 'members.name' | translate }}</mat-header-cell>
            <mat-cell *matCellDef="let m">
              {{ m.firstName }} {{ m.particles ? m.particles + ' ' : '' }}{{ m.lastName }}
            </mat-cell>
          </ng-container>

          <mat-header-row *matHeaderRowDef="['name']; sticky: true"></mat-header-row>
          <mat-row *matRowDef="let row; columns: ['name'];"></mat-row>
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

    .panel-container {
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
      padding: 0 20px;
    }

    .members-table .mat-mdc-cell {
      font-size: 14px;
      color: var(--mat-sys-on-surface);
      padding: 0 20px;
    }

    .members-table .mat-mdc-row {
      min-height: 44px;
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
export class TeamMembersPanelComponent {
  constructor(
    @Inject(SLIDE_IN_PANEL_DATA) public data: TeamMembersPanelData,
    public panelRef: SlideInPanelRef<boolean>,
    private panelService: SlideInPanelService,
    private userPreferencesService: UserPreferencesService,
    private translate: TranslateService
  ) {}

  get sortedMembers(): Member[] {
    return [...this.data.members].sort((a, b) =>
      a.lastName.localeCompare(b.lastName)
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
