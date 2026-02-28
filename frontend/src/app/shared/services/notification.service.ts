import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackNotificationComponent } from '../components/snack-notification.component';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  /** Transient success feedback — auto-dismisses after 3 s */
  success(message: string): void {
    this.snackBar.openFromComponent(SnackNotificationComponent, {
      data: { message, icon: 'check_circle' },
      duration: 3000
    });
  }

  /** Persistent error — user must dismiss */
  error(message: string): void {
    this.snackBar.openFromComponent(SnackNotificationComponent, {
      data: { message, icon: 'error' }
    });
  }

  /** Persistent informational notice — user must dismiss */
  info(message: string): void {
    this.snackBar.openFromComponent(SnackNotificationComponent, {
      data: { message, icon: 'info' }
    });
  }
}
