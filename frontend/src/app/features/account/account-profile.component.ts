import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-account-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  template: `
    <mat-card class="profile-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>account_circle</mat-icon>
        <mat-card-title>My Account</mat-card-title>
        <mat-card-subtitle>Worker ID: {{ authService.currentUser?.id }}</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <form (ngSubmit)="onUpdateProfile()" class="profile-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>First Name</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.firstName"
                   name="firstName"
                   required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Particles (prefix)</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.particles"
                   name="particles"
                   placeholder="e.g., van, de, von">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Last Name</mat-label>
            <input matInput
                   [(ngModel)]="profileForm.lastName"
                   name="lastName"
                   required>
          </mat-form-field>

          <button mat-raised-button
                  color="primary"
                  type="submit"
                  [disabled]="profileLoading">
            <mat-spinner *ngIf="profileLoading" diameter="20"></mat-spinner>
            <span *ngIf="!profileLoading">Save Changes</span>
          </button>
        </form>

        <mat-divider class="section-divider"></mat-divider>

        <h3 class="section-title">Role</h3>
        <div class="role-section">
          <div class="role-display">
            <mat-icon>{{ authService.currentUser?.role === 'manager' ? 'admin_panel_settings' : 'person' }}</mat-icon>
            <span class="role-label">{{ authService.currentUser?.role === 'manager' ? 'Manager' : 'User' }}</span>
          </div>
          <div *ngIf="authService.isManager" class="role-edit">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Change Role</mat-label>
              <mat-select [(ngModel)]="selectedRole" name="role">
                <mat-option value="user">User</mat-option>
                <mat-option value="manager">Manager</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-raised-button
                    (click)="onUpdateRole()"
                    [disabled]="roleLoading || selectedRole === authService.currentUser?.role">
              <mat-spinner *ngIf="roleLoading" diameter="20"></mat-spinner>
              <span *ngIf="!roleLoading">Update Role</span>
            </button>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .profile-card {
      border-radius: 16px;
    }

    mat-card-header {
      margin-bottom: 24px;
    }

    mat-card-header mat-icon[mat-card-avatar] {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--mat-sys-primary);
    }

    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .full-width {
      width: 100%;
    }

    .section-divider {
      margin: 32px 0;
    }

    .section-title {
      font-size: 16px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
      margin-bottom: 16px;
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    .role-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .role-display {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--mat-sys-surface-container);
      border-radius: 12px;
    }

    .role-display mat-icon {
      color: var(--mat-sys-primary);
    }

    .role-label {
      font-size: 16px;
      font-weight: 500;
      text-transform: capitalize;
    }

    .role-edit {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  `]
})
export class AccountProfileComponent {
  profileForm = {
    firstName: '',
    lastName: '',
    particles: ''
  };
  profileLoading = false;

  selectedRole: 'user' | 'manager' = 'user';
  roleLoading = false;

  constructor(
    public authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.profileForm = {
          firstName: user.firstName,
          lastName: user.lastName,
          particles: user.particles || ''
        };
        this.selectedRole = user.role;
      }
    });
  }

  onUpdateProfile(): void {
    if (!this.profileForm.firstName || !this.profileForm.lastName) {
      this.snackBar.open('First name and last name are required', 'Close', { duration: 3000 });
      return;
    }

    this.profileLoading = true;

    this.authService.updateProfile(
      this.profileForm.firstName,
      this.profileForm.lastName,
      this.profileForm.particles || null
    ).subscribe({
      next: () => {
        this.profileLoading = false;
        this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.profileLoading = false;
        this.snackBar.open('Failed to update profile', 'Close', { duration: 3000 });
        console.error('Update profile error:', error);
      }
    });
  }

  onUpdateRole(): void {
    const user = this.authService.currentUser;
    if (!user) return;

    this.roleLoading = true;

    this.authService.updateRole(user.id, this.selectedRole).subscribe({
      next: () => {
        this.roleLoading = false;
        this.snackBar.open('Role updated successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.roleLoading = false;
        this.snackBar.open(error.message || 'Failed to update role', 'Close', { duration: 3000 });
        console.error('Update role error:', error);
      }
    });
  }
}
