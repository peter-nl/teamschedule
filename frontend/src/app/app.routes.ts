import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';
import { TeamsListComponent } from './features/teams/teams-list/teams-list.component';
import { ScheduleMatrixComponent } from './features/schedule/schedule-matrix/schedule-matrix.component';
import { ResetPasswordComponent } from './features/account/reset-password.component';
import { HomeComponent } from './features/home/home.component';
import { DemoSetupComponent } from './features/demo/demo-setup.component';
import { DocsComponent } from './features/docs/docs.component';
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
      { path: 'demo-setup/:token', component: DemoSetupComponent },
      { path: 'docs', component: DocsComponent },
    ]
  }
];
