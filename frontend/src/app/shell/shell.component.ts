import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { filter } from 'rxjs/operators';
import { AuthService } from '../shared/services/auth.service';
import { APP_VERSION } from '../version';
import { UserPreferencesService } from '../shared/services/user-preferences.service';
import { AccountLoginComponent } from '../features/account/account-login.component';
import { AccountProfileComponent } from '../features/account/account-profile.component';
import { AccountHolidaysComponent } from '../features/account/account-holidays.component';
import { AccountPasswordComponent } from '../features/account/account-password.component';
import { PreferencesComponent } from '../features/preferences/preferences.component';
import { ManageTeamsComponent } from '../features/manage/manage-teams.component';
import { ManageWorkersComponent } from '../features/manage/manage-workers.component';
import { ManageSettingsComponent } from '../features/manage/manage-settings.component';

type NavBarType = 'account' | 'management';
type PanelType = 'login' | 'profile' | 'holidays' | 'password' | 'preferences'
              | 'manage-teams' | 'manage-workers' | 'manage-settings';

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
    MatTooltipModule,
    MatSnackBarModule,
    AccountLoginComponent,
    AccountProfileComponent,
    AccountHolidaysComponent,
    AccountPasswordComponent,
    PreferencesComponent,
    ManageTeamsComponent,
    ManageWorkersComponent,
    ManageSettingsComponent
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

        <div class="nav-spacer"></div>

        <!-- Bottom Menu Items -->
        <div class="nav-account">
          <a *ngIf="showManagement"
             class="nav-item"
             [class.active]="activeNavBar === 'management'"
             (click)="toggleNavBar('management')"
             [matTooltip]="isExpanded ? '' : 'Management'"
             matTooltipPosition="right">
            <mat-icon>admin_panel_settings</mat-icon>
            <span class="nav-label">Management</span>
          </a>
          <a class="nav-item"
             [class.active]="activeNavBar === 'account' || activePanel === 'login'"
             (click)="authService.isLoggedIn ? toggleNavBar('account') : openLoginPanel()"
             [matTooltip]="isExpanded ? '' : (authService.isLoggedIn ? 'Account' : 'Login')"
             matTooltipPosition="right">
            <mat-icon>{{ authService.isLoggedIn ? 'account_circle' : 'login' }}</mat-icon>
            <span class="nav-label">{{ authService.isLoggedIn ? 'Account' : 'Login' }}</span>
          </a>
        </div>
        <div class="nav-version">v{{ version }}</div>
      </nav>

      <!-- Account Nav Bar -->
      <nav class="nav-bar" *ngIf="activeNavBar === 'account'">
        <div class="nav-bar-spacer"></div>
        <div class="nav-bar-items">
          <button class="nav-bar-item" (click)="toggleTheme()">
            <mat-icon>{{ isDark ? 'light_mode' : 'dark_mode' }}</mat-icon>
            <span>{{ isDark ? 'Light theme' : 'Dark theme' }}</span>
          </button>

          <button *ngIf="!authService.isLoggedIn"
                  class="nav-bar-item"
                  [class.active]="activePanel === 'login'"
                  (click)="openPanel('login')">
            <mat-icon>login</mat-icon>
            <span>Sign in</span>
          </button>

          <button *ngIf="authService.isLoggedIn"
                  class="nav-bar-item"
                  [class.active]="activePanel === 'preferences'"
                  (click)="openPanel('preferences')">
            <mat-icon>tune</mat-icon>
            <span>Preferences</span>
          </button>
          <button *ngIf="authService.isLoggedIn"
                  class="nav-bar-item"
                  [class.active]="activePanel === 'profile'"
                  (click)="openPanel('profile')">
            <mat-icon>account_circle</mat-icon>
            <span>Account</span>
          </button>
          <button *ngIf="authService.isLoggedIn"
                  class="nav-bar-item"
                  [class.active]="activePanel === 'holidays'"
                  (click)="openPanel('holidays')">
            <mat-icon>beach_access</mat-icon>
            <span>Holidays</span>
          </button>
          <button *ngIf="authService.isLoggedIn"
                  class="nav-bar-item"
                  [class.active]="activePanel === 'password'"
                  (click)="openPanel('password')">
            <mat-icon>lock</mat-icon>
            <span>Change password</span>
          </button>
          <button *ngIf="authService.isLoggedIn"
                  class="nav-bar-item"
                  (click)="onSignOut()">
            <mat-icon>logout</mat-icon>
            <span>Sign out</span>
          </button>
        </div>
      </nav>

      <!-- Management Nav Bar -->
      <nav class="nav-bar" *ngIf="activeNavBar === 'management'">
        <div class="nav-bar-spacer"></div>
        <div class="nav-bar-items">
          <button class="nav-bar-item"
                  [class.active]="activePanel === 'manage-teams'"
                  (click)="openPanel('manage-teams')">
            <mat-icon>group_work</mat-icon>
            <span>Teams</span>
          </button>
          <button class="nav-bar-item"
                  [class.active]="activePanel === 'manage-workers'"
                  (click)="openPanel('manage-workers')">
            <mat-icon>manage_accounts</mat-icon>
            <span>Workers</span>
          </button>
          <button class="nav-bar-item"
                  [class.active]="activePanel === 'manage-settings'"
                  (click)="openPanel('manage-settings')">
            <mat-icon>settings</mat-icon>
            <span>Settings</span>
          </button>
        </div>
      </nav>

      <!-- Main Content Area -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>

    <!-- Slide-in Panel -->
    <div class="slide-in-backdrop" *ngIf="activePanel" (click)="closePanel()"></div>
    <div class="slide-in-shell-panel" *ngIf="activePanel" [style.left.px]="panelLeftOffset">
      <button class="panel-close" (click)="closePanel()">
        <mat-icon>close</mat-icon>
      </button>
      <div class="slide-in-content">
        <app-account-login *ngIf="activePanel === 'login'" (loginSuccess)="onLoginSuccess()"></app-account-login>
        <app-account-profile *ngIf="activePanel === 'profile'"></app-account-profile>
        <app-account-holidays *ngIf="activePanel === 'holidays'"></app-account-holidays>
        <app-account-password *ngIf="activePanel === 'password'"></app-account-password>
        <app-preferences *ngIf="activePanel === 'preferences'"></app-preferences>
        <app-manage-teams *ngIf="activePanel === 'manage-teams'"></app-manage-teams>
        <app-manage-workers *ngIf="activePanel === 'manage-workers'"></app-manage-workers>
        <app-manage-settings *ngIf="activePanel === 'manage-settings'"></app-manage-settings>
      </div>
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

    .nav-items {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      padding: 0 12px;
      box-sizing: border-box;
    }

    .nav-spacer {
      flex: 1;
    }

    .nav-account {
      width: 100%;
      padding: 0 12px 12px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-version {
      text-align: center;
      font-size: 11px;
      color: var(--mat-sys-on-surface-variant);
      opacity: 0.5;
      padding: 8px 12px;
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
      border: none;
      background: transparent;
      font-family: inherit;
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

    /* Secondary Nav Bar */
    .nav-bar {
      width: 200px;
      min-width: 200px;
      height: 100vh;
      background: var(--mat-sys-surface-container);
      border-right: 1px solid var(--mat-sys-outline-variant);
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
    }

    .nav-bar-spacer {
      flex: 1;
    }

    .nav-bar-items {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px;
    }

    .nav-bar-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border-radius: 12px;
      border: none;
      background: transparent;
      color: var(--mat-sys-on-surface-variant);
      text-decoration: none;
      cursor: pointer;
      font-size: 14px;
      font-family: inherit;
      transition: background 0.15s;
      text-align: left;
    }

    .nav-bar-item:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .nav-bar-item.active {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }

    .nav-bar-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Slide-in Panel */
    .slide-in-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 199;
      animation: fadeIn 200ms ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .slide-in-shell-panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      background: var(--mat-sys-surface);
      z-index: 200;
      display: flex;
      flex-direction: column;
      animation: slideInFromRight 300ms ease;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
    }

    @keyframes slideInFromRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .slide-in-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      justify-content: center;
      padding: 24px;
    }

    .panel-close {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 1;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: var(--mat-sys-surface-container-highest);
      color: var(--mat-sys-on-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s;
    }

    .panel-close:hover {
      background: var(--mat-sys-outline-variant);
    }

    .panel-close mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
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

      .nav-header {
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
        flex-direction: row;
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

      .nav-bar {
        display: none;
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
    { path: '/workers', icon: 'person', label: 'Workers' }
  ];

  currentPath = '';
  isExpanded = true;
  isDark = false;
  managementModeEnabled = true;
  activeNavBar: NavBarType | null = null;
  activePanel: PanelType | null = null;
  version = APP_VERSION;

  constructor(
    private router: Router,
    public authService: AuthService,
    private userPreferencesService: UserPreferencesService,
    private snackBar: MatSnackBar
  ) {
    this.isExpanded = this.userPreferencesService.preferences.navigationExpanded;
    this.managementModeEnabled = this.userPreferencesService.preferences.managementMode;
    this.userPreferencesService.preferences$.subscribe(prefs => {
      this.isExpanded = prefs.navigationExpanded;
      this.managementModeEnabled = prefs.managementMode;
      // Close management nav bar if management mode gets disabled
      if (!prefs.managementMode && this.activeNavBar === 'management') {
        this.activeNavBar = null;
        this.activePanel = null;
      }
    });

    this.userPreferencesService.isDarkTheme$.subscribe(isDark => {
      this.isDark = isDark;
    });

    this.currentPath = this.router.url;
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentPath = event.urlAfterRedirects;
      this.activeNavBar = null;
      this.activePanel = null;
    });
  }

  get showManagement(): boolean {
    return this.authService.isManager && this.managementModeEnabled;
  }

  get panelLeftOffset(): number {
    const railWidth = this.isExpanded ? 220 : 80;
    const barWidth = this.activeNavBar ? 200 : 0;
    return railWidth + barWidth;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.activePanel) {
      this.closePanel();
    } else if (this.activeNavBar) {
      this.activeNavBar = null;
    }
  }

  isActive(path: string): boolean {
    return this.currentPath.startsWith(path);
  }

  toggleExpanded(): void {
    this.userPreferencesService.setNavigationExpanded(!this.isExpanded);
  }

  toggleNavBar(type: NavBarType): void {
    if (this.activeNavBar === type) {
      this.activeNavBar = null;
      this.activePanel = null;
    } else {
      this.activeNavBar = type;
      this.activePanel = null;
    }
  }

  openPanel(panel: PanelType): void {
    this.activePanel = this.activePanel === panel ? null : panel;
  }

  closePanel(): void {
    this.activePanel = null;
  }

  openLoginPanel(): void {
    if (this.activePanel === 'login') {
      this.activePanel = null;
      this.activeNavBar = null;
    } else {
      this.activeNavBar = null;
      this.activePanel = 'login';
    }
  }

  onLoginSuccess(): void {
    this.activePanel = null;
  }

  toggleTheme(): void {
    const current = this.userPreferencesService.preferences.theme;
    if (current === 'light' || (current === 'system' && !this.isDark)) {
      this.userPreferencesService.setTheme('dark');
    } else {
      this.userPreferencesService.setTheme('light');
    }
  }

  onSignOut(): void {
    this.authService.logout();
    this.snackBar.open('You have been signed out', 'Close', { duration: 3000 });
    this.activeNavBar = null;
    this.activePanel = null;
  }
}
