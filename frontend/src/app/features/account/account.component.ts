import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="account-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .account-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 24px;
    }
  `]
})
export class AccountComponent {}
