import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';

const EXPORT_WORKER_HOLIDAYS = gql`
  query ExportWorkerHolidays {
    exportWorkerHolidays {
      workerId workerName startDate endDate startDayPart endDayPart description holidayTypeName
    }
  }
`;

const IMPORT_WORKER_HOLIDAYS = gql`
  mutation ImportWorkerHolidays($holidays: [WorkerHolidayImportInput!]!) {
    importWorkerHolidays(holidays: $holidays) {
      success message importedCount skippedCount
    }
  }
`;

@Component({
  selector: 'app-manage-import-export',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="ie-container">
      <mat-card class="ie-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>import_export</mat-icon>
          <mat-card-title>Import / Export</mat-card-title>
          <mat-card-subtitle>Import and export worker holiday data</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>

          <!-- Export Section -->
          <div class="ie-section">
            <div class="section-header">
              <div>
                <h3>Export Worker Holidays</h3>
                <p class="section-description">Download all worker holiday periods as a JSON file. This includes worker IDs, names, dates, day parts, descriptions, and holiday types.</p>
              </div>
            </div>

            <button mat-raised-button color="primary"
                    (click)="exportHolidays()"
                    [disabled]="exporting">
              <mat-spinner *ngIf="exporting" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!exporting">download</mat-icon>
              Export to JSON
            </button>

            <div *ngIf="exportMessage" class="status-message"
                 [class.success]="exportSuccess" [class.error]="!exportSuccess">
              <mat-icon>{{ exportSuccess ? 'check_circle' : 'error' }}</mat-icon>
              {{ exportMessage }}
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Import Section -->
          <div class="ie-section">
            <div class="section-header">
              <div>
                <h3>Import Worker Holidays</h3>
                <p class="section-description">Import worker holiday periods from a JSON file. The file must match the export format. Holidays are added to existing data (not replaced). Workers must already exist in the system.</p>
              </div>
            </div>

            <input type="file"
                   #fileInput
                   accept=".json"
                   (change)="onFileSelected($event)"
                   style="display: none">

            <div class="import-actions">
              <button mat-raised-button
                      (click)="fileInput.click()"
                      [disabled]="importing">
                <mat-icon>upload_file</mat-icon>
                Select JSON File
              </button>
              <span *ngIf="selectedFileName" class="file-name">{{ selectedFileName }}</span>
            </div>

            <button *ngIf="importData"
                    mat-raised-button color="primary"
                    (click)="importHolidays()"
                    [disabled]="importing"
                    class="import-button">
              <mat-spinner *ngIf="importing" diameter="18"></mat-spinner>
              Import {{ importData.length }} holiday period(s)
            </button>

            <div *ngIf="importMessage" class="status-message"
                 [class.success]="importSuccess" [class.error]="!importSuccess">
              <mat-icon>{{ importSuccess ? 'check_circle' : 'error' }}</mat-icon>
              {{ importMessage }}
            </div>
          </div>

        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .ie-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .ie-card {
      border-radius: 16px;
    }

    mat-card-header {
      margin-bottom: 16px;
    }

    mat-card-header mat-icon[mat-card-avatar] {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--mat-sys-primary);
    }

    .ie-section {
      padding: 16px 0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .ie-section h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .section-description {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
    }

    .import-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .file-name {
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
    }

    .import-button {
      margin-top: 12px;
    }

    .status-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 8px;
      margin-top: 12px;
      font-size: 14px;
    }

    .status-message.success {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }

    .status-message.error {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `]
})
export class ManageImportExportComponent {
  exporting = false;
  exportMessage: string | null = null;
  exportSuccess = false;

  importing = false;
  importMessage: string | null = null;
  importSuccess = false;
  importData: any[] | null = null;
  selectedFileName: string | null = null;

  constructor(private snackBar: MatSnackBar) {}

  async exportHolidays(): Promise<void> {
    this.exporting = true;
    this.exportMessage = null;
    try {
      const result = await apolloClient.query({
        query: EXPORT_WORKER_HOLIDAYS,
        fetchPolicy: 'network-only'
      });
      const holidays = (result.data as any).exportWorkerHolidays;
      const json = JSON.stringify(holidays, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `worker-holidays-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.exportSuccess = true;
      this.exportMessage = `Exported ${holidays.length} holiday period(s).`;
    } catch (err: any) {
      this.exportSuccess = false;
      this.exportMessage = `Export failed: ${err.message}`;
    } finally {
      this.exporting = false;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedFileName = file.name;
    this.importMessage = null;
    this.importData = null;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!Array.isArray(data)) {
          this.importMessage = 'Invalid file: expected a JSON array.';
          this.importSuccess = false;
          return;
        }
        this.importData = data;
      } catch {
        this.importMessage = 'Invalid JSON file.';
        this.importSuccess = false;
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be selected again
    input.value = '';
  }

  async importHolidays(): Promise<void> {
    if (!this.importData) return;
    this.importing = true;
    this.importMessage = null;
    try {
      const result = await apolloClient.mutate({
        mutation: IMPORT_WORKER_HOLIDAYS,
        variables: {
          holidays: this.importData.map(h => ({
            workerId: h.workerId,
            startDate: h.startDate,
            endDate: h.endDate,
            startDayPart: h.startDayPart || 'full',
            endDayPart: h.endDayPart || 'full',
            description: h.description || null,
            holidayTypeName: h.holidayTypeName || null,
          }))
        }
      });
      const res = (result.data as any).importWorkerHolidays;
      this.importSuccess = res.success;
      this.importMessage = res.message;
      this.importData = null;
      this.selectedFileName = null;
    } catch (err: any) {
      this.importSuccess = false;
      this.importMessage = `Import failed: ${err.message}`;
    } finally {
      this.importing = false;
    }
  }
}
