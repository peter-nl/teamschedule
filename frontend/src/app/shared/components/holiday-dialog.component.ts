import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';
import { WorkerHolidayService, WorkerHolidayPeriod, WorkerHolidayInput, DayPart } from '../../core/services/worker-holiday.service';
import { HolidayTypeService, HolidayType } from '../../core/services/holiday-type.service';
import { UserPreferencesService } from '../services/user-preferences.service';

export interface HolidayDialogData {
  mode: 'add' | 'edit';
  workerId: string;
  period?: WorkerHolidayPeriod;
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
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.mode === 'add' ? 'add_circle' : 'edit' }}</mat-icon>
      {{ data.mode === 'add' ? 'Add Holiday' : 'Edit Holiday' }}
    </h2>

    <mat-dialog-content>
      <div class="form-content">
        <div class="date-row">
          <mat-form-field appearance="outline" class="date-field">
            <mat-label>Start Date</mat-label>
            <input matInput
                   [matDatepicker]="startPicker"
                   [(ngModel)]="form.startDate"
                   name="startDate"
                   required>
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" class="date-field">
            <mat-label>End Date</mat-label>
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
            <mat-label>Day Part</mat-label>
            <mat-select [(ngModel)]="form.startDayPart" name="startDayPart">
              <mat-option value="full">Full day</mat-option>
              <mat-option value="morning">Morning</mat-option>
              <mat-option value="afternoon">Afternoon</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Range: first day -->
          <mat-form-field appearance="outline" class="day-part-field" *ngIf="isDateRange">
            <mat-label>First day</mat-label>
            <mat-select [(ngModel)]="form.startDayPart" name="startDayPartRange">
              <mat-option value="full">Full day</mat-option>
              <mat-option value="afternoon">Afternoon only</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Range: last day -->
          <mat-form-field appearance="outline" class="day-part-field" *ngIf="isDateRange">
            <mat-label>Last day</mat-label>
            <mat-select [(ngModel)]="form.endDayPart" name="endDayPart">
              <mat-option value="full">Full day</mat-option>
              <mat-option value="morning">Morning only</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width" *ngIf="holidayTypes.length > 0">
          <mat-label>Type</mat-label>
          <mat-select [(ngModel)]="form.holidayTypeId" name="holidayTypeId">
            <mat-option *ngFor="let type of holidayTypes" [value]="type.id">
              {{ type.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description (optional)</mat-label>
          <input matInput
                 [(ngModel)]="form.description"
                 name="description"
                 placeholder="e.g., Vacation, Day off">
        </mat-form-field>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions>
      <button mat-button
              color="warn"
              *ngIf="data.mode === 'edit'"
              (click)="onDelete()"
              [disabled]="saving || deleting"
              class="delete-button">
        <mat-spinner *ngIf="deleting" diameter="18"></mat-spinner>
        <mat-icon *ngIf="!deleting">delete</mat-icon>
        <span *ngIf="!deleting">Delete</span>
      </button>
      <span class="spacer"></span>
      <button mat-button mat-dialog-close [disabled]="saving || deleting">Cancel</button>
      <button mat-raised-button
              color="primary"
              (click)="onSave()"
              [disabled]="saving || deleting || !form.startDate">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ data.mode === 'add' ? 'Add' : 'Save' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      padding: 16px 24px;
    }

    h2[mat-dialog-title] mat-icon {
      color: var(--mat-sys-primary);
    }

    mat-dialog-content {
      padding: 0 24px 16px;
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

    mat-dialog-actions {
      padding: 16px 24px;
      display: flex;
      align-items: center;
    }

    .delete-button {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .spacer {
      flex: 1;
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
    public dialogRef: MatDialogRef<HolidayDialogComponent, HolidayDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: HolidayDialogData,
    private workerHolidayService: WorkerHolidayService,
    private holidayTypeService: HolidayTypeService,
    private userPreferencesService: UserPreferencesService,
    private snackBar: MatSnackBar
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

  private buildInput(): WorkerHolidayInput {
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
      this.workerHolidayService.addHoliday(this.data.workerId, input).subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('Holiday added', 'Close', { duration: 3000 });
          this.dialogRef.close({ action: 'saved' });
        },
        error: (error) => {
          this.saving = false;
          this.snackBar.open('Failed to add holiday', 'Close', { duration: 3000 });
          console.error('Add holiday error:', error);
        }
      });
    } else {
      this.workerHolidayService.updateHoliday(this.data.period!.id, input).subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('Holiday updated', 'Close', { duration: 3000 });
          this.dialogRef.close({ action: 'saved' });
        },
        error: (error) => {
          this.saving = false;
          this.snackBar.open('Failed to update holiday', 'Close', { duration: 3000 });
          console.error('Update holiday error:', error);
        }
      });
    }
  }

  onDelete(): void {
    if (!this.data.period) return;

    this.deleting = true;
    this.workerHolidayService.removeHoliday(this.data.period.id).subscribe({
      next: () => {
        this.deleting = false;
        this.snackBar.open('Holiday removed', 'Close', { duration: 3000 });
        this.dialogRef.close({ action: 'deleted' });
      },
      error: (error) => {
        this.deleting = false;
        this.snackBar.open('Failed to remove holiday', 'Close', { duration: 3000 });
        console.error('Remove holiday error:', error);
      }
    });
  }
}
