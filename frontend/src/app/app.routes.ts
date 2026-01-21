import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';
import { TeamsListComponent } from './features/teams/teams-list/teams-list.component';
import { WorkersListComponent } from './features/workers/workers-list/workers-list.component';
import { ScheduleMatrixComponent } from './features/schedule/schedule-matrix/schedule-matrix.component';
import { AccountComponent } from './features/account/account.component';
import { ManageWorkersComponent } from './features/manage/manage-workers.component';
import { ManageTeamsComponent } from './features/manage/manage-teams.component';
import { ManageSettingsComponent } from './features/manage/manage-settings.component';
import { PreferencesComponent } from './features/preferences/preferences.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'schedule', pathMatch: 'full' },
      { path: 'schedule', component: ScheduleMatrixComponent },
      { path: 'teams', component: TeamsListComponent },
      { path: 'workers', component: WorkersListComponent },
      { path: 'manage/teams', component: ManageTeamsComponent },
      { path: 'manage/workers', component: ManageWorkersComponent },
      { path: 'manage/settings', component: ManageSettingsComponent },
      { path: 'preferences', component: PreferencesComponent },
      { path: 'account', component: AccountComponent }
    ]
  }
];
