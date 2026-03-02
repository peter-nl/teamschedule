import { Component, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '../shared/services/notification.service';
import { filter } from 'rxjs/operators';
import { AuthService } from '../shared/services/auth.service';
import { APP_VERSION } from '../version';
import { UserPreferencesService } from '../shared/services/user-preferences.service';
import { SlideInPanelService } from '../shared/services/slide-in-panel.service';
import { UiEventService } from '../shared/services/ui-event.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AccountLoginComponent } from '../features/account/account-login.component';
import { AccountProfileComponent } from '../features/account/account-profile.component';
import { AccountPasswordComponent } from '../features/account/account-password.component';
import { ManageOrgComponent } from '../features/manage/manage-org.component';
import { ManageMembersComponent } from '../features/manage/manage-members.component';
import { ManageOrganisationsComponent } from '../features/manage/manage-organisations.component';
import { ManageSystemSettingsComponent } from '../features/manage/manage-system-settings.component';
import { ManageDemosComponent } from '../features/manage/manage-demos.component';
import { ManageEventLogComponent } from '../features/manage/manage-event-log.component';
import { ClaimDemoDialogComponent } from '../shared/components/claim-demo-dialog.component';

type NavBarType = 'management';
type PanelType = 'login' | 'profile' | 'password'
              | 'manage-org' | 'manage-org-teams' | 'manage-my-teams' | 'manage-members'
              | 'manage-organisations' | 'manage-settings' | 'manage-demos' | 'manage-event-log';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

interface ManagementItem {
  panel: PanelType;
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
    TranslateModule,
    AccountLoginComponent,
    AccountProfileComponent,
    AccountPasswordComponent,
    ManageOrgComponent,
    ManageMembersComponent,
    ManageOrganisationsComponent,
    ManageSystemSettingsComponent,
    ManageDemosComponent,
    ManageEventLogComponent,
    ClaimDemoDialogComponent
  ],
  template: `
    <div class="app-layout">
      <!-- Navigation Rail -->
      <nav class="nav-rail" [class.expanded]="isExpanded">
        <div class="nav-header">
          <button class="menu-button" (click)="toggleExpanded()" [matTooltip]="'shell.nav.menu' | translate" matTooltipPosition="right">
            <mat-icon>{{ isExpanded ? 'menu_open' : 'menu' }}</mat-icon>
          </button>
          <a *ngIf="isExpanded" class="app-title" (click)="onNavItemClick('/')">{{ 'shell.appTitle' | translate }}</a>
        </div>

        <div class="nav-items">
          <a *ngFor="let item of navItems"
             class="nav-item"
             [class.active]="isActive(item.path)"
             (click)="onNavItemClick(item.path)"
             [matTooltip]="isExpanded ? '' : (item.label | translate)"
             matTooltipPosition="right">
            <mat-icon>{{ item.icon }}</mat-icon>
            <span class="nav-label">{{ item.label | translate }}</span>
          </a>
        </div>

        <div class="nav-spacer"></div>

        <!-- Bottom Menu Items -->
        <div class="nav-account">
          <a *ngIf="showManagement"
             class="nav-item"
             [class.active]="isManagementPanel"
             (click)="toggleNavBar('management')"
             [matTooltip]="isExpanded ? '' : ('shell.management.label' | translate)"
             matTooltipPosition="right">
            <mat-icon>admin_panel_settings</mat-icon>
            <span class="nav-label">{{ 'shell.management.label' | translate }}</span>
          </a>
          <a *ngIf="authService.isLoggedIn"
             class="nav-item"
             [class.active]="activePanel === 'profile' || activePanel === 'password'"
             (click)="openPanel('profile')"
             [matTooltip]="isExpanded ? '' : ('shell.account.account' | translate)"
             matTooltipPosition="right">
            <mat-icon>account_circle</mat-icon>
            <span class="nav-label">{{ 'shell.account.account' | translate }}</span>
          </a>
          <a class="nav-item lang-toggle"
             (click)="toggleLanguage()"
             [matTooltip]="isExpanded ? '' : currentLang.toUpperCase()"
             matTooltipPosition="right">
            <mat-icon>language</mat-icon>
            <span class="nav-label">{{ currentLang.toUpperCase() }}</span>
          </a>
          <a *ngIf="!isMobile"
             class="nav-item"
             (click)="toggleTheme()"
             [matTooltip]="isExpanded ? '' : ((isDark ? 'shell.account.lightTheme' : 'shell.account.darkTheme') | translate)"
             matTooltipPosition="right">
            <mat-icon>{{ isDark ? 'light_mode' : 'dark_mode' }}</mat-icon>
            <span class="nav-label">{{ (isDark ? 'shell.account.lightTheme' : 'shell.account.darkTheme') | translate }}</span>
          </a>
          <!-- Log in / Log out always at the very bottom -->
          <a *ngIf="!authService.isLoggedIn"
             class="nav-item"
             (click)="openLoginPanel()"
             [matTooltip]="isExpanded ? '' : ('shell.account.logIn' | translate)"
             matTooltipPosition="right">
            <mat-icon>login</mat-icon>
            <span class="nav-label">{{ 'shell.account.logIn' | translate }}</span>
          </a>
          <a *ngIf="authService.isLoggedIn"
             class="nav-item"
             (click)="onSignOut()"
             [matTooltip]="isExpanded ? '' : ('shell.account.logOut' | translate)"
             matTooltipPosition="right">
            <mat-icon>logout</mat-icon>
            <span class="nav-label">{{ 'shell.account.logOut' | translate }}</span>
          </a>
        </div>
        <div class="nav-version">v{{ version }}</div>
        <div class="nav-version-mobile">v{{ version }}</div>
      </nav>

      <!-- Management Nav Bar -->
      <nav class="nav-bar" [class.expanded]="isExpanded" *ngIf="activeNavBar === 'management'">
        <div class="nav-bar-spacer"></div>
        <div class="nav-bar-items">
          <button *ngFor="let item of managementItems"
                  class="nav-bar-item"
                  [class.active]="activePanel === item.panel"
                  (click)="openPanel(item.panel)"
                  [matTooltip]="isExpanded ? '' : (item.label | translate)"
                  matTooltipPosition="right">
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label | translate }}</span>
          </button>
        </div>
      </nav>

      <!-- Nav Bar Backdrop (mobile) -->
      <div class="nav-bar-backdrop" *ngIf="activeNavBar" (click)="toggleNavBar(activeNavBar!)"></div>

      <!-- Main Content Area -->
      <main class="main-content">
        <!-- Demo banner -->
        <div class="demo-banner" *ngIf="authService.isDemo">
          <mat-icon>science</mat-icon>
          <div class="demo-banner-text">
            <span class="demo-banner-main">{{ 'demo.bannerTitle' | translate: { role: demoRoleLabel } }}</span>
            <span class="demo-banner-sub">
              {{ (authService.isOrgAdmin ? 'demo.bannerIsAdmin' : 'demo.bannerNotAdmin') | translate }}
            </span>
          </div>
          <button *ngIf="authService.isOrgAdmin" class="demo-banner-btn" (click)="showClaimDialog = true">
            {{ 'demo.registerButton' | translate }}
          </button>
        </div>

        <!-- Management views fill the main content area -->
        <app-manage-organisations *ngIf="activePanel === 'manage-organisations'"></app-manage-organisations>
        <app-manage-org *ngIf="activePanel === 'manage-org'" [view]="'org'"></app-manage-org>
        <app-manage-org *ngIf="activePanel === 'manage-org-teams'" [view]="'teams'" [myTeamsOnly]="false"></app-manage-org>
        <app-manage-org *ngIf="activePanel === 'manage-my-teams'" [view]="'teams'" [myTeamsOnly]="true"></app-manage-org>
        <app-manage-members *ngIf="activePanel === 'manage-members'"></app-manage-members>
        <app-manage-system-settings *ngIf="activePanel === 'manage-settings'"></app-manage-system-settings>
        <app-manage-demos *ngIf="activePanel === 'manage-demos'"></app-manage-demos>
        <app-manage-event-log *ngIf="activePanel === 'manage-event-log'"></app-manage-event-log>
        <!-- Account views replace the main content area -->
        <div class="account-view" *ngIf="isAccountPanel">
          <app-account-login *ngIf="activePanel === 'login'" (loginSuccess)="onLoginSuccess()"></app-account-login>
          <app-account-profile *ngIf="activePanel === 'profile'" (openChangePassword)="openPanel('password')"></app-account-profile>
          <app-account-password *ngIf="activePanel === 'password'"></app-account-password>
        </div>
        <!-- Route content shown only when no panel is active -->
        <router-outlet *ngIf="!isManagementPanel && !isAccountPanel"></router-outlet>
      </main>
    </div>

    <!-- Claim demo dialog -->
    <app-claim-demo-dialog
      *ngIf="showClaimDialog"
      (close)="showClaimDialog = false"
      (claimed)="onDemoClaimed($event)">
    </app-claim-demo-dialog>
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
      text-decoration: none;
      cursor: pointer;
    }

    .app-title:hover {
      color: var(--mat-sys-primary);
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

    .nav-version-mobile {
      display: none;
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
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
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
      width: 72px;
      min-width: 72px;
      height: 100vh;
      background: var(--mat-sys-surface-container);
      border-right: 1px solid var(--mat-sys-outline-variant);
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      transition: width 0.2s ease, min-width 0.2s ease;
    }

    .nav-bar.expanded {
      width: 200px;
      min-width: 200px;
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
      justify-content: flex-start;
      gap: 12px;
      padding: 10px 12px;
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
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      overflow: hidden;
    }

    .nav-bar-item span {
      white-space: nowrap;
      max-width: 0;
      overflow: hidden;
      opacity: 0;
      transition: max-width 0.2s ease, opacity 0.15s ease;
    }

    .nav-bar.expanded .nav-bar-item span {
      max-width: 160px;
      opacity: 1;
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
      flex-shrink: 0;
    }

    /* Account View (shown in main content area) */
    .account-view {
      flex: 1;
      overflow-y: auto;
      display: flex;
      justify-content: center;
      padding: 24px;
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

    /* Demo banner */
    .demo-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
      flex-shrink: 0;
    }

    .demo-banner mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .demo-banner-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .demo-banner-main {
      font-size: 13px;
      font-weight: 600;
    }

    .demo-banner-sub {
      font-size: 12px;
      opacity: 0.8;
    }

    .demo-banner-btn {
      background: var(--mat-sys-tertiary);
      color: var(--mat-sys-on-tertiary);
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
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

      .nav-version-mobile {
        display: block;
        position: absolute;
        right: 4px;
        bottom: 2px;
        font-size: 9px;
        color: var(--mat-sys-on-surface-variant);
        opacity: 0.4;
        pointer-events: none;
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

  currentPath = '';
  isExpanded = true;
  isDark = false;
  activeNavBar: NavBarType | null = null;
  activePanel: PanelType | null = null;
  version = APP_VERSION;
  currentLang = 'en';
  showClaimDialog = false;

  get demoRoleLabel(): string {
    if (this.authService.isOrgAdmin) return this.translate.instant('demo.roleOrgAdmin');
    if (this.authService.isTeamAdmin) return this.translate.instant('demo.roleTeamLeader');
    return this.translate.instant('demo.roleMember');
  }

  constructor(
    private router: Router,
    public authService: AuthService,
    private userPreferencesService: UserPreferencesService,
    private notificationService: NotificationService,
    private panelService: SlideInPanelService,
    private translate: TranslateService,
    private uiEventService: UiEventService,
    private cdr: ChangeDetectorRef
  ) {
    this.uiEventService.openLogin$.subscribe(() => this.openLoginPanel());
    const isNarrow = window.innerWidth < this.TABLET_BREAKPOINT;
    this.isExpanded = isNarrow ? false : this.userPreferencesService.preferences.navigationExpanded;
    this.userPreferencesService.preferences$.subscribe(prefs => {
      this.isExpanded = window.innerWidth < this.TABLET_BREAKPOINT ? false : prefs.navigationExpanded;
    });

    // On mobile, force system theme since browser dark mode overrides app theme
    if (this.isMobile && this.userPreferencesService.preferences.theme !== 'system') {
      this.userPreferencesService.setTheme('system');
    }

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

    this.currentLang = this.translate.currentLang || 'en';

    // Auto-open login panel when not logged in
    if (!this.authService.isLoggedIn) {
      this.activePanel = 'login';
    }
  }

  get navItems(): NavItem[] {
    if (!this.authService.isLoggedIn || this.authService.isSysadmin) return [];
    return [{ path: '/schedule', icon: 'calendar_month', label: 'shell.nav.schedule' }];
  }

  get showManagement(): boolean {
    if (!this.authService.isLoggedIn) return false;
    return this.authService.isSysadmin || this.authService.isAnyAdmin;
  }

  get managementItems(): ManagementItem[] {
    const items: ManagementItem[] = [];
    if (this.authService.isSysadmin) {
      items.push({ panel: 'manage-organisations', icon: 'business', label: 'shell.management.organisations' });
      items.push({ panel: 'manage-org-teams', icon: 'group_work', label: 'shell.management.teams' });
      items.push({ panel: 'manage-members', icon: 'manage_accounts', label: 'shell.management.members' });
      items.push({ panel: 'manage-demos', icon: 'science', label: 'shell.management.demos' });
      items.push({ panel: 'manage-event-log', icon: 'history', label: 'shell.management.eventLog' });
      items.push({ panel: 'manage-settings', icon: 'settings', label: 'shell.management.settings' });
      return items;
    }
    if (this.authService.isOrgAdmin) {
      items.push({ panel: 'manage-org', icon: 'corporate_fare', label: 'shell.management.organisation' });
      items.push({ panel: 'manage-org-teams', icon: 'group_work', label: 'shell.management.teams' });
    } else {
      items.push({ panel: 'manage-my-teams', icon: 'group_work', label: 'shell.management.myTeams' });
    }
    items.push({ panel: 'manage-members', icon: 'manage_accounts', label: 'shell.management.members' });
    return items;
  }

  get isManagementPanel(): boolean {
    return this.activePanel === 'manage-organisations'
        || this.activePanel === 'manage-org'
        || this.activePanel === 'manage-org-teams'
        || this.activePanel === 'manage-my-teams'
        || this.activePanel === 'manage-members'
        || this.activePanel === 'manage-settings'
        || this.activePanel === 'manage-demos'
        || this.activePanel === 'manage-event-log';
  }

  get isAccountPanel(): boolean {
    return this.activePanel === 'login'
        || this.activePanel === 'profile'
        || this.activePanel === 'password';
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

  onNavItemClick(path: string): void {
    this.activeNavBar = null;
    this.activePanel = null;
    this.panelService.closeAll();
    this.router.navigate([path]);
  }

  isActive(path: string): boolean {
    if (this.activePanel) return false;
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
      this.activeNavBar = type;
      // Auto-select the first sub-item so a view is shown immediately
      if (type === 'management' && this.managementItems.length > 0) {
        this.activePanel = this.managementItems[0].panel;
      } else {
        this.activePanel = null;
      }
    }
  }

  get isMobile(): boolean {
    return window.innerWidth <= 600;
  }

  openPanel(panel: PanelType): void {
    // Clicking the active panel does nothing
    if (this.activePanel === panel) return;

    const isManagement = panel.startsWith('manage');

    // Close any slide-in panels when switching to an account (overlay) panel
    if (!isManagement) {
      this.panelService.closeAll();
      this.activeNavBar = null;
    }

    this.activePanel = panel;
    this.cdr.detectChanges();
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
    if (!this.authService.isSysadmin) {
      this.router.navigate(['/schedule']);
    }
  }

  toggleTheme(): void {
    this.activeNavBar = null;
    const current = this.userPreferencesService.preferences.theme;
    if (current === 'light' || (current === 'system' && !this.isDark)) {
      this.userPreferencesService.setTheme('dark');
    } else {
      this.userPreferencesService.setTheme('light');
    }
  }

  toggleLanguage(): void {
    this.activeNavBar = null;
    const newLang = this.currentLang === 'en' ? 'nl' : 'en';
    this.currentLang = newLang;
    this.translate.use(newLang);
    this.userPreferencesService.setLanguage(newLang);
  }

  onDemoClaimed(payload: { member: any; token: string }): void {
    this.showClaimDialog = false;
    this.authService.setAuth(payload.member, payload.token, true);
    this.notificationService.success(this.translate.instant('demo.claimSuccess'));
    this.cdr.detectChanges();
  }

  onSignOut(): void {
    this.authService.logout();
    this.notificationService.success(this.translate.instant('shell.messages.loggedOut'));
    this.activeNavBar = null;
    this.activePanel = null;
    this.router.navigate(['/']);
  }
}
