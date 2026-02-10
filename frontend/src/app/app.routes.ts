import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';
import { TeamsListComponent } from './features/teams/teams-list/teams-list.component';
import { ScheduleMatrixComponent } from './features/schedule/schedule-matrix/schedule-matrix.component';
import { ResetPasswordComponent } from './features/account/reset-password.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'schedule', pathMatch: 'full' },
      { path: 'schedule', component: ScheduleMatrixComponent },
      { path: 'teams', component: TeamsListComponent },
      { path: 'reset-password', component: ResetPasswordComponent },
    ]
  }
];
