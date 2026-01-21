import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule
  ],
  template: `
    <div class="preferences-container">
      <div class="header">
        <h1>Preferences</h1>
      </div>

      <mat-card class="preferences-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>tune</mat-icon>
          <mat-card-title>User Preferences</mat-card-title>
          <mat-card-subtitle>Customize your experience</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="user-info">
            <p><strong>Logged in as:</strong> {{ authService.currentUser?.firstName }} {{ authService.currentUser?.lastName }}</p>
          </div>
          <p class="placeholder-text">Preference options will be added here.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .preferences-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .header {
      margin-bottom: 24px;
    }

    h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 400;
      color: var(--mat-sys-on-surface);
    }

    .preferences-card {
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

    .user-info {
      margin-bottom: 16px;
      padding: 12px;
      background: var(--mat-sys-surface-container);
      border-radius: 8px;
    }

    .user-info p {
      margin: 0;
    }

    .placeholder-text {
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
    }
  `]
})
export class PreferencesComponent {
  constructor(public authService: AuthService) {}
}
