import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs/operators';
import { AuthService } from '../shared/services/auth.service';
import { UserPreferencesService } from '../shared/services/user-preferences.service';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="app-layout">
      <!-- Navigation Rail -->
      <nav class="nav-rail" [class.expanded]="isExpanded">
        <div class="nav-header">
          <button class="menu-button" (click)="toggleExpanded()" matTooltip="Menu" matTooltipPosition="right">
            <mat-icon>{{ isExpanded ? 'menu_open' : 'menu' }}</mat-icon>
          </button>
          <span *ngIf="isExpanded" class="app-title">TeamSchedule</span>
        </div>

        <div class="nav-items">
          <a *ngFor="let item of navItems"
             class="nav-item"
             [class.active]="isActive(item.path)"
             [routerLink]="item.path"
             [matTooltip]="isExpanded ? '' : item.label"
             matTooltipPosition="right">
            <mat-icon>{{ item.icon }}</mat-icon>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        </div>

        <!-- Management Section (managers only) -->
        <div *ngIf="authService.isManager" class="nav-section">
          <div class="section-header" *ngIf="isExpanded">Management</div>
          <div class="section-divider" *ngIf="!isExpanded"></div>
          <a class="nav-item"
             [class.active]="isActive('/manage/teams')"
             routerLink="/manage/teams"
             [matTooltip]="isExpanded ? '' : 'Teams'"
             matTooltipPosition="right">
            <mat-icon>group_work</mat-icon>
            <span class="nav-label">Teams</span>
          </a>
          <a class="nav-item"
             [class.active]="isActive('/manage/workers')"
             routerLink="/manage/workers"
             [matTooltip]="isExpanded ? '' : 'Workers'"
             matTooltipPosition="right">
            <mat-icon>manage_accounts</mat-icon>
            <span class="nav-label">Workers</span>
          </a>
          <a class="nav-item"
             [class.active]="isActive('/manage/settings')"
             routerLink="/manage/settings"
             [matTooltip]="isExpanded ? '' : 'Settings'"
             matTooltipPosition="right">
            <mat-icon>settings</mat-icon>
            <span class="nav-label">Settings</span>
          </a>
        </div>

        <div class="nav-spacer"></div>

        <!-- Bottom Menu Items -->
        <div class="nav-account">
          <a *ngIf="authService.isLoggedIn"
             class="nav-item"
             [class.active]="isActive('/preferences')"
             routerLink="/preferences"
             [matTooltip]="isExpanded ? '' : 'Preferences'"
             matTooltipPosition="right">
            <mat-icon>tune</mat-icon>
            <span class="nav-label">Preferences</span>
          </a>
          <a class="nav-item"
             [class.active]="isActive('/account')"
             routerLink="/account"
             [matTooltip]="isExpanded ? '' : (authService.isLoggedIn ? 'Account' : 'Login')"
             matTooltipPosition="right">
            <mat-icon>{{ authService.isLoggedIn ? 'account_circle' : 'login' }}</mat-icon>
            <span class="nav-label">{{ authService.isLoggedIn ? 'Account' : 'Login' }}</span>
          </a>
        </div>
      </nav>

      <!-- Main Content Area -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      background: var(--mat-sys-surface);
    }

    /* Navigation Rail */
    .nav-rail {
      width: 80px;
      min-width: 80px;
      height: 100vh;
      background: var(--mat-sys-surface-container);
      border-right: 1px solid var(--mat-sys-outline-variant);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 0;
      position: sticky;
      top: 0;
      z-index: 100;
      transition: width 0.2s ease, min-width 0.2s ease;
    }

    .nav-rail.expanded {
      width: 220px;
      min-width: 220px;
      align-items: flex-start;
    }

    .nav-header {
      padding: 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      box-sizing: border-box;
    }

    .nav-rail.expanded .nav-header {
      padding: 12px 16px;
    }

    .menu-button {
      width: 56px;
      height: 56px;
      min-width: 56px;
      border-radius: 16px;
      border: none;
      background: transparent;
      color: var(--mat-sys-on-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .menu-button:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .menu-button mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .app-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      white-space: nowrap;
    }

    .nav-items,
    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      padding: 0 12px;
      box-sizing: border-box;
    }

    .nav-section {
      margin-top: 16px;
    }

    .section-header {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--mat-sys-on-surface-variant);
      padding: 8px 16px 4px;
    }

    .section-divider {
      height: 1px;
      background: var(--mat-sys-outline-variant);
      margin: 8px 12px;
    }

    .nav-spacer {
      flex: 1;
    }

    .nav-account {
      width: 100%;
      padding: 0 12px 12px;
      box-sizing: border-box;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px 0 14px;
      border-radius: 16px;
      text-decoration: none;
      color: var(--mat-sys-on-surface-variant);
      cursor: pointer;
      transition: all 0.2s ease;
      gap: 4px;
    }

    .nav-rail.expanded .nav-item {
      flex-direction: row;
      justify-content: flex-start;
      padding: 12px 16px;
      gap: 12px;
    }

    .nav-item:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .nav-item.active {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }

    .nav-item mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .nav-label {
      font-size: 12px;
      font-weight: 500;
      text-align: center;
      line-height: 1.2;
    }

    .nav-rail.expanded .nav-label {
      font-size: 14px;
      text-align: left;
    }

    /* Main Content */
    .main-content {
      flex: 1;
      overflow: auto;
      min-width: 0;
    }

    /* Responsive: Convert to bottom navigation on mobile */
    @media (max-width: 600px) {
      .app-layout {
        flex-direction: column-reverse;
      }

      .nav-rail {
        width: 100%;
        min-width: unset;
        height: auto;
        flex-direction: row;
        border-right: none;
        border-top: 1px solid var(--mat-sys-outline-variant);
        padding: 0;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
      }

      .nav-rail.expanded {
        width: 100%;
        min-width: unset;
      }

      .nav-header,
      .nav-section {
        display: none;
      }

      .nav-items {
        flex-direction: row;
        justify-content: space-around;
        padding: 8px 0;
        gap: 0;
        flex: 1;
      }

      .nav-spacer {
        display: none;
      }

      .nav-account {
        padding: 8px 0;
      }

      .nav-item {
        padding: 8px 16px;
        border-radius: 12px;
        flex-direction: column;
      }

      .nav-label {
        font-size: 12px;
        text-align: center;
      }

      .main-content {
        padding-bottom: 80px;
      }
    }
  `]
})
export class ShellComponent {
  navItems: NavItem[] = [
    { path: '/schedule', icon: 'calendar_month', label: 'Schedule' },
    { path: '/teams', icon: 'groups', label: 'Teams' },
    { path: '/workers', icon: 'person', label: 'Workers' }
  ];

  currentPath = '';
  isExpanded = true;

  constructor(
    private router: Router,
    public authService: AuthService,
    private userPreferencesService: UserPreferencesService
  ) {
    this.isExpanded = this.userPreferencesService.preferences.navigationExpanded;
    this.userPreferencesService.preferences$.subscribe(prefs => {
      this.isExpanded = prefs.navigationExpanded;
    });

    this.currentPath = this.router.url;
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentPath = event.urlAfterRedirects;
    });
  }

  isActive(path: string): boolean {
    return this.currentPath.startsWith(path);
  }

  toggleExpanded(): void {
    this.userPreferencesService.setNavigationExpanded(!this.isExpanded);
  }
}
