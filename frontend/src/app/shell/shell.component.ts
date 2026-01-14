import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    MatToolbarModule,
    MatTabsModule
  ],
  template: `
    <div class="app-shell">
      <mat-toolbar color="primary" class="toolbar">
        <span class="app-title">Teamschedule</span>
      </mat-toolbar>

      <mat-tab-group class="tab-group" (selectedIndexChange)="onTabChange($event)" [selectedIndex]="selectedTabIndex">
        <mat-tab label="Teams"></mat-tab>
        <mat-tab label="Workers"></mat-tab>
      </mat-tab-group>

      <div class="content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .app-title {
      font-size: 20px;
      font-weight: 500;
    }

    .tab-group {
      flex-shrink: 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .content {
      flex: 1;
      overflow: auto;
      padding: 24px;
    }

    @media (max-width: 600px) {
      .content {
        padding: 16px;
      }
    }
  `]
})
export class ShellComponent {
  selectedTabIndex = 0;

  constructor(private router: Router) {
    // Set initial tab based on current route
    const path = this.router.url.split('/')[1];
    this.selectedTabIndex = path === 'workers' ? 1 : 0;
  }

  onTabChange(index: number) {
    if (index === 0) {
      this.router.navigate(['/teams']);
    } else if (index === 1) {
      this.router.navigate(['/workers']);
    }
  }
}
