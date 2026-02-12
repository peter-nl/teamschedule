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
import { SlideInPanelService } from '../shared/services/slide-in-panel.service';
import { AccountLoginComponent } from '../features/account/account-login.component';
import { AccountProfileComponent } from '../features/account/account-profile.component';
import { AccountPasswordComponent } from '../features/account/account-password.component';
import { ManageTeamsComponent } from '../features/manage/manage-teams.component';
import { ManageWorkersComponent } from '../features/manage/manage-workers.component';
import { ManageSettingsComponent } from '../features/manage/manage-settings.component';

type NavBarType = 'account' | 'management';
type PanelType = 'login' | 'profile' | 'password'
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
    AccountPasswordComponent,
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
             (click)="onNavItemClick()"
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

          <button *ngIf="authService.isManager"
                  class="nav-bar-item"
                  (click)="onManagementModeToggle(!managementModeEnabled)">
            <mat-icon>{{ managementModeEnabled ? 'person' : 'admin_panel_settings' }}</mat-icon>
            <span>{{ managementModeEnabled ? 'Worker mode' : 'Manager mode' }}</span>
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
                  [class.active]="activePanel === 'profile'"
                  (click)="openPanel('profile')">
            <mat-icon>account_circle</mat-icon>
            <span>Account</span>
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

      <!-- Nav Bar Backdrop (mobile) -->
      <div class="nav-bar-backdrop" *ngIf="activeNavBar" (click)="toggleNavBar(activeNavBar!)"></div>

      <!-- Main Content Area -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>

    <!-- Slide-in Panel -->
    <div class="slide-in-backdrop" *ngIf="activePanel" [style.left.px]="panelLeftOffset" (click)="closePanel()"></div>
    <div class="slide-in-shell-panel" *ngIf="activePanel" [style.left.px]="panelLeftOffset">
      <button class="panel-close" (click)="closePanel()">
        <mat-icon>close</mat-icon>
      </button>
      <div class="slide-in-content">
        <app-account-login *ngIf="activePanel === 'login'" (loginSuccess)="onLoginSuccess()"></app-account-login>
        <app-account-profile *ngIf="activePanel === 'profile'"></app-account-profile>
        <app-account-password *ngIf="activePanel === 'password'"></app-account-password>
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

    /* Nav Bar Backdrop (mobile only) */
    .nav-bar-backdrop {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 149;
    }

    /* Main Content */
    .main-content {
      flex: 1;
      overflow: hidden;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    /* Responsive: Bottom tab bar on small screens */
    @media (max-width: 600px) {
      .app-layout {
        flex-direction: column;
        height: 100vh;
        height: 100dvh;
      }

      .nav-rail,
      .nav-rail.expanded {
        width: 100%;
        min-width: unset;
        height: 56px;
        min-height: 56px;
        flex-direction: row;
        flex-shrink: 0;
        align-items: center;
        justify-content: space-around;
        border-right: none;
        border-top: 1px solid var(--mat-sys-outline-variant);
        padding: 0;
        position: relative;
        top: auto;
        order: 2;
        transition: none;
      }

      .nav-header,
      .nav-spacer,
      .nav-version {
        display: none;
      }

      .nav-items {
        flex-direction: row;
        justify-content: center;
        padding: 0;
        gap: 0;
        flex: 1;
      }

      .nav-account {
        padding: 0;
        flex-direction: row;
        gap: 0;
        flex: 0 0 auto;
      }

      .nav-item {
        padding: 6px 16px;
        border-radius: 12px;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        max-width: 80px;
      }

      .nav-label {
        font-size: 11px;
        text-align: center;
      }

      .nav-bar {
        position: fixed;
        bottom: 56px;
        left: 0;
        right: 0;
        width: 100%;
        min-width: unset;
        height: auto;
        max-height: 60vh;
        border-right: none;
        border-top: 1px solid var(--mat-sys-outline-variant);
        border-radius: 16px 16px 0 0;
        box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
        z-index: 150;
        animation: slideUp 200ms ease;
      }

      .nav-bar .nav-bar-spacer {
        display: none;
      }

      .nav-bar .nav-bar-items {
        padding: 16px;
      }

      @keyframes slideUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .nav-bar-backdrop {
        display: block;
      }

      .slide-in-backdrop {
        left: 0 !important;
      }

      .slide-in-shell-panel {
        left: 0 !important;
      }

      .main-content {
        flex: 1;
        min-height: 0;
        width: 100%;
        order: 1;
        padding-bottom: 0;
      }
    }
  `]
})
export class ShellComponent {
  private readonly TABLET_BREAKPOINT = 768;

  navItems: NavItem[] = [
    { path: '/schedule', icon: 'calendar_month', label: 'Schedule' }
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
    private snackBar: MatSnackBar,
    private panelService: SlideInPanelService
  ) {
    const isNarrow = window.innerWidth < this.TABLET_BREAKPOINT;
    this.isExpanded = isNarrow ? false : this.userPreferencesService.preferences.navigationExpanded;
    this.managementModeEnabled = this.userPreferencesService.preferences.managementMode;
    this.userPreferencesService.preferences$.subscribe(prefs => {
      this.isExpanded = window.innerWidth < this.TABLET_BREAKPOINT ? false : prefs.navigationExpanded;
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
      this.panelService.closeAll();
    });

    // Auto-open login panel when not logged in
    if (!this.authService.isLoggedIn) {
      this.activePanel = 'login';
    }
  }

  get showManagement(): boolean {
    return this.authService.isManager && this.managementModeEnabled;
  }

  get panelLeftOffset(): number {
    const railWidth = this.isExpanded ? 220 : 80;
    const barWidth = this.activeNavBar ? 200 : 0;
    return railWidth + barWidth;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (window.innerWidth < this.TABLET_BREAKPOINT) {
      if (this.isExpanded) {
        this.isExpanded = false;
      }
    } else {
      this.isExpanded = this.userPreferencesService.preferences.navigationExpanded;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.activePanel) {
      this.closePanel();
    } else if (this.activeNavBar) {
      this.activeNavBar = null;
    }
  }

  onNavItemClick(): void {
    this.activeNavBar = null;
    this.activePanel = null;
    this.panelService.closeAll();
  }

  isActive(path: string): boolean {
    return this.currentPath.startsWith(path);
  }

  toggleExpanded(): void {
    if (window.innerWidth < this.TABLET_BREAKPOINT) {
      // On narrow screens, toggle locally without persisting
      this.isExpanded = !this.isExpanded;
    } else {
      this.userPreferencesService.setNavigationExpanded(!this.isExpanded);
    }
  }

  toggleNavBar(type: NavBarType): void {
    this.panelService.closeAll();
    if (this.activeNavBar === type) {
      // Clicking the same rail item closes its bar and panel
      this.activeNavBar = null;
      this.activePanel = null;
    } else {
      // Switching to a different rail item: close current panel, show new bar
      this.activePanel = null;
      this.activeNavBar = type;
    }
  }

  get isMobile(): boolean {
    return window.innerWidth <= 600;
  }

  openPanel(panel: PanelType): void {
    this.panelService.closeAll();
    if (this.activePanel === panel) {
      // Clicking the active item closes the panel
      this.activePanel = null;
    } else {
      // Switch directly to the new panel
      this.activePanel = panel;
    }
    // On mobile, close the nav-bar overlay when opening a panel
    if (this.isMobile && this.activePanel) {
      this.activeNavBar = null;
    }
  }

  closePanel(): void {
    this.panelService.closeAll();
    this.activePanel = null;
  }

  openLoginPanel(): void {
    this.panelService.closeAll();
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

  onManagementModeToggle(enabled: boolean): void {
    this.userPreferencesService.setManagementMode(enabled);
  }

  onSignOut(): void {
    this.authService.logout();
    this.snackBar.open('You have been signed out', 'Close', { duration: 3000 });
    this.activeNavBar = null;
    this.activePanel = null;
  }
}
