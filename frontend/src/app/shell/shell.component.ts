import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs/operators';

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
      <nav class="nav-rail">
        <div class="nav-header">
          <div class="app-logo">
            <mat-icon>calendar_month</mat-icon>
          </div>
        </div>

        <div class="nav-items">
          <a *ngFor="let item of navItems"
             class="nav-item"
             [class.active]="isActive(item.path)"
             [routerLink]="item.path"
             [matTooltip]="item.label"
             matTooltipPosition="right">
            <mat-icon>{{ item.icon }}</mat-icon>
            <span class="nav-label">{{ item.label }}</span>
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
    }

    .nav-header {
      padding: 12px;
      margin-bottom: 8px;
    }

    .app-logo {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .app-logo mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .nav-items {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      padding: 0 12px;
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

      .nav-header {
        display: none;
      }

      .nav-items {
        flex-direction: row;
        justify-content: space-around;
        padding: 8px 0;
        gap: 0;
      }

      .nav-item {
        padding: 8px 16px;
        border-radius: 12px;
      }

      .main-content {
        padding-bottom: 80px;
      }
    }
  `]
})
export class ShellComponent {
  navItems: NavItem[] = [
    { path: '/teams', icon: 'groups', label: 'Teams' },
    { path: '/workers', icon: 'person', label: 'Workers' },
    { path: '/schedule', icon: 'calendar_month', label: 'Schedule' }
  ];

  currentPath = '';

  constructor(private router: Router) {
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
}
