import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { apolloClient } from './app.config';
import { gql } from '@apollo/client';
import { from } from 'rxjs';

const GET_HELLO = gql`
  query GetHello {
    hello
    testDatabase
  }
`;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  template: `
    <div class="container">
      <h1>🎉 Teamschedule</h1>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Angular 19 + Material Design 3 + Apollo Client v4</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <div *ngIf="loading" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Loading...</p>
          </div>

          <div *ngIf="error" class="error">
            <p>❌ Error: {{ error }}</p>
          </div>

          <div *ngIf="data" class="success">
            <p><strong>Message from Apollo Server:</strong></p>
            <p>{{ data.hello }}</p>
            <p><strong>Database Status:</strong></p>
            <p>{{ data.testDatabase }}</p>
          </div>
        </mat-card-content>

        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="ngOnInit()">Refresh</button>
          <button mat-raised-button>Learn More</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .container {
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
    }

    h1 {
      text-align: center;
      margin-bottom: 30px;
      font-weight: 400;
    }

    mat-card {
      margin-bottom: 20px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      gap: 16px;
    }

    .error {
      color: var(--mat-sys-error);
      padding: 16px;
      background: var(--mat-sys-error-container);
      border-radius: 8px;
    }

    .success {
      padding: 16px;
    }

    mat-card-content p {
      margin: 8px 0;
    }

    mat-card-actions {
      padding: 16px;
      display: flex;
      gap: 8px;
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'teamschedule-frontend';
  loading = true;
  error: string | null = null;
  data: any = null;

  ngOnInit() {
    from(apolloClient.query({
      query: GET_HELLO,
      fetchPolicy: 'network-only'
    })).subscribe({
      next: (result) => {
        this.data = result.data;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
      }
    });
  }
}
