import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';
import { TeamsListComponent } from './features/teams/teams-list/teams-list.component';
import { ScheduleMatrixComponent } from './features/schedule/schedule-matrix/schedule-matrix.component';
import { ResetPasswordComponent } from './features/account/reset-password.component';
import { HomeComponent } from './features/home/home.component';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'schedule', component: ScheduleMatrixComponent, canActivate: [authGuard] },
      { path: 'teams', component: TeamsListComponent, canActivate: [authGuard] },
      { path: 'reset-password', component: ResetPasswordComponent },
    ]
  }
];
