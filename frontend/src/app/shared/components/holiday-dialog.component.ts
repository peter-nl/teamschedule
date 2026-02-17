import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MemberHolidayService, MemberHolidayPeriod, MemberHolidayInput, DayPart } from '../../core/services/member-holiday.service';
import { HolidayTypeService, HolidayType } from '../../core/services/holiday-type.service';
import { UserPreferencesService } from '../services/user-preferences.service';
import { SlideInPanelRef, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface HolidayDialogData {
  mode: 'add' | 'edit';
  memberId: string;
  period?: MemberHolidayPeriod;
  initialDate?: Date;
  memberName?: string; // Set when editing another member's data (manager mode)
}

export interface HolidayDialogResult {
  action: 'saved' | 'deleted';
}

@Component({
  selector: 'app-holiday-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon>{{ data.mode === 'add' ? 'add_circle' : 'edit' }}</mat-icon>
          {{ (data.mode === 'add' ? 'holidayDialog.addTitle' : 'holidayDialog.editTitle') | translate }}
        </h2>
        <button class="panel-close" (click)="panelRef.close()" [disabled]="saving || deleting">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-content">
        <div *ngIf="data.memberName" class="member-warning">
          <mat-icon>warning</mat-icon>
          <span [innerHTML]="'holidayDialog.editWarning' | translate:{ name: data.memberName }"></span>
        </div>
        <div class="form-content">
          <div class="date-row">
            <mat-form-field appearance="outline" class="date-field">
              <mat-label>{{ 'holidayDialog.startDate' | translate }}</mat-label>
              <input matInput
                     [matDatepicker]="startPicker"
                     [(ngModel)]="form.startDate"
                     name="startDate"
                     required>
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline" class="date-field">
              <mat-label>{{ 'holidayDialog.endDate' | translate }}</mat-label>
              <input matInput
                     [matDatepicker]="endPicker"
                     [(ngModel)]="form.endDate"
                     name="endDate"
                     [min]="form.startDate"
                     (ngModelChange)="onEndDateChange()">
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <div class="day-part-row">
            <!-- Single date: all 3 options -->
            <mat-form-field appearance="outline" class="day-part-field" *ngIf="!isDateRange">
              <mat-label>{{ 'holidayDialog.dayPart' | translate }}</mat-label>
              <mat-select [(ngModel)]="form.startDayPart" name="startDayPart">
                <mat-option value="full">{{ 'common.fullDay' | translate }}</mat-option>
                <mat-option value="morning">{{ 'common.morning' | translate }}</mat-option>
                <mat-option value="afternoon">{{ 'common.afternoon' | translate }}</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Range: first day -->
            <mat-form-field appearance="outline" class="day-part-field" *ngIf="isDateRange">
              <mat-label>{{ 'holidayDialog.firstDay' | translate }}</mat-label>
              <mat-select [(ngModel)]="form.startDayPart" name="startDayPartRange">
                <mat-option value="full">{{ 'common.fullDay' | translate }}</mat-option>
                <mat-option value="afternoon">{{ 'holidayDialog.afternoonOnly' | translate }}</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Range: last day -->
            <mat-form-field appearance="outline" class="day-part-field" *ngIf="isDateRange">
              <mat-label>{{ 'holidayDialog.lastDay' | translate }}</mat-label>
              <mat-select [(ngModel)]="form.endDayPart" name="endDayPart">
                <mat-option value="full">{{ 'common.fullDay' | translate }}</mat-option>
                <mat-option value="morning">{{ 'holidayDialog.morningOnly' | translate }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width" *ngIf="holidayTypes.length > 0">
            <mat-label>{{ 'holidayDialog.type' | translate }}</mat-label>
            <mat-select [(ngModel)]="form.holidayTypeId" name="holidayTypeId">
              <mat-option *ngFor="let type of holidayTypes" [value]="type.id">
                {{ type.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'holidayDialog.description' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="form.description"
                   name="description"
                   [placeholder]="'holidayDialog.descriptionPlaceholder' | translate">
          </mat-form-field>
        </div>
      </div>

      <div class="panel-actions">
        <button mat-icon-button
                color="warn"
                *ngIf="data.mode === 'edit'"
                (click)="onDelete()"
                [disabled]="saving || deleting"
                [matTooltip]="'common.delete' | translate">
          <mat-spinner *ngIf="deleting" diameter="18"></mat-spinner>
          <mat-icon *ngIf="!deleting">delete</mat-icon>
        </button>
        <span class="spacer"></span>
        <button mat-icon-button (click)="panelRef.close()" [disabled]="saving || deleting" [matTooltip]="'common.cancel' | translate">
          <mat-icon>close</mat-icon>
        </button>
        <button mat-icon-button
                color="primary"
                (click)="onSave()"
                [disabled]="saving || deleting || !form.startDate"
                [matTooltip]="(data.mode === 'add' ? 'common.add' : 'common.save') | translate">
          <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
          <mat-icon *ngIf="!saving">check</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .member-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      margin-bottom: 12px;
      border-radius: 8px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      font-size: 13px;
    }

    .member-warning mat-icon {
      flex-shrink: 0;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .form-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 320px;
    }

    .date-row {
      display: flex;
      gap: 8px;
    }

    .date-field {
      flex: 1;
    }

    .day-part-row {
      display: flex;
      gap: 8px;
    }

    .day-part-field {
      flex: 1;
    }

    .full-width {
      width: 100%;
    }

    .delete-button {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 4px;
    }
  `]
})
export class HolidayDialogComponent implements OnInit {
  form = {
    startDate: new Date() as Date | null,
    endDate: null as Date | null,
    startDayPart: 'full' as DayPart,
    endDayPart: 'full' as DayPart,
    description: '',
    holidayTypeId: ''
  };

  holidayTypes: HolidayType[] = [];
  isDark = false;
  saving = false;
  deleting = false;

  constructor(
    public panelRef: SlideInPanelRef<HolidayDialogComponent, HolidayDialogResult>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: HolidayDialogData,
    private memberHolidayService: MemberHolidayService,
    private holidayTypeService: HolidayTypeService,
    private userPreferencesService: UserPreferencesService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    // Load holiday types
    this.holidayTypeService.types$.subscribe(types => {
      this.holidayTypes = types;
      // Set default type if not already set (add mode)
      if (!this.form.holidayTypeId && types.length > 0 && this.data.mode === 'add') {
        this.form.holidayTypeId = types[0].id;
      }
    });
    this.holidayTypeService.ensureLoaded().subscribe();

    // Track dark theme
    this.userPreferencesService.isDarkTheme$.subscribe(isDark => {
      this.isDark = isDark;
    });

    // Pre-fill start date from initialDate (add mode)
    if (this.data.mode === 'add' && this.data.initialDate) {
      this.form.startDate = this.data.initialDate;
    }

    // Pre-fill form in edit mode
    if (this.data.mode === 'edit' && this.data.period) {
      const p = this.data.period;
      this.form.startDate = new Date(p.startDate + 'T00:00:00');
      this.form.endDate = p.startDate === p.endDate ? null : new Date(p.endDate + 'T00:00:00');
      this.form.startDayPart = p.startDayPart;
      this.form.endDayPart = p.endDayPart;
      this.form.description = p.description || '';
      this.form.holidayTypeId = p.holidayType?.id || '';
    }
  }

  get isDateRange(): boolean {
    if (!this.form.startDate || !this.form.endDate) return false;
    return this.form.endDate.getTime() !== this.form.startDate.getTime();
  }

  onEndDateChange(): void {
    if (this.isDateRange) {
      if (this.form.startDayPart === 'morning') {
        this.form.startDayPart = 'full';
      }
      if (this.form.endDayPart === 'afternoon') {
        this.form.endDayPart = 'full';
      }
    }
  }

  private formatDateISO(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private buildInput(): MemberHolidayInput {
    const startDate = this.formatDateISO(this.form.startDate!);
    const endDate = this.form.endDate ? this.formatDateISO(this.form.endDate) : startDate;

    return {
      startDate,
      endDate,
      startDayPart: this.form.startDayPart,
      endDayPart: startDate === endDate ? this.form.startDayPart : this.form.endDayPart,
      description: this.form.description || undefined,
      holidayTypeId: this.form.holidayTypeId || undefined,
    };
  }

  onSave(): void {
    if (!this.form.startDate) return;

    this.saving = true;
    const input = this.buildInput();

    if (this.data.mode === 'add') {
      this.memberHolidayService.addHoliday(this.data.memberId, input).subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open(this.translate.instant('holidayDialog.messages.added'), this.translate.instant('common.close'), { duration: 3000 });
          this.panelRef.close({ action: 'saved' });
        },
        error: (error) => {
          this.saving = false;
          this.snackBar.open(this.translate.instant('holidayDialog.messages.addFailed'), this.translate.instant('common.close'), { duration: 3000 });
          console.error('Add holiday error:', error);
        }
      });
    } else {
      this.memberHolidayService.updateHoliday(this.data.period!.id, input).subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open(this.translate.instant('holidayDialog.messages.updated'), this.translate.instant('common.close'), { duration: 3000 });
          this.panelRef.close({ action: 'saved' });
        },
        error: (error) => {
          this.saving = false;
          this.snackBar.open(this.translate.instant('holidayDialog.messages.updateFailed'), this.translate.instant('common.close'), { duration: 3000 });
          console.error('Update holiday error:', error);
        }
      });
    }
  }

  onDelete(): void {
    if (!this.data.period) return;

    this.deleting = true;
    this.memberHolidayService.removeHoliday(this.data.period.id).subscribe({
      next: () => {
        this.deleting = false;
        this.snackBar.open(this.translate.instant('holidayDialog.messages.removed'), this.translate.instant('common.close'), { duration: 3000 });
        this.panelRef.close({ action: 'deleted' });
      },
      error: (error) => {
        this.deleting = false;
        this.snackBar.open(this.translate.instant('holidayDialog.messages.removeFailed'), this.translate.instant('common.close'), { duration: 3000 });
        console.error('Remove holiday error:', error);
      }
    });
  }
}
