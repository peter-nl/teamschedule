import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';
import { TeamsListComponent } from './features/teams/teams-list/teams-list.component';
import { WorkersListComponent } from './features/workers/workers-list/workers-list.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'teams', pathMatch: 'full' },
      { path: 'teams', component: TeamsListComponent },
      { path: 'workers', component: WorkersListComponent }
    ]
  }
];
