import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="home-container">
      <img src="favicon.svg" alt="TeamSchedule" class="home-logo">
      <h1 class="home-title">{{ 'shell.appTitle' | translate }}</h1>
      <p class="home-text" *ngIf="!authService.isLoggedIn">{{ 'home.guest' | translate }}</p>
      <p class="home-text" *ngIf="authService.isLoggedIn">{{ 'home.loggedIn' | translate }}</p>
    </div>
  `,
  styles: [`
    .home-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 24px;
      padding: 48px 24px;
      text-align: center;
    }

    .home-logo {
      width: 120px;
      height: 120px;
    }

    .home-title {
      font-size: 32px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      margin: 0;
    }

    .home-text {
      font-size: 16px;
      color: var(--mat-sys-on-surface-variant);
      max-width: 420px;
      line-height: 1.6;
      margin: 0;
    }
  `]
})
export class HomeComponent {
  constructor(public authService: AuthService) {}
}
