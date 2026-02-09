import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { gql } from '@apollo/client';
import { apolloClient } from '../../../app.config';
import { Worker } from '../../../shared/models/worker.model';
import { Team } from '../../../shared/models/team.model';

const GET_WORKERS_WITH_TEAMS = gql`
  query GetWorkersWithTeams {
    workers {
      id
      firstName
      lastName
      particles
      email
      teams {
        id
        name
      }
    }
  }
`;

const GET_TEAMS = gql`
  query GetTeams {
    teams {
      id
      name
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {

  getWorkersWithTeams(): Observable<Worker[]> {
    return from(
      apolloClient.query({
        query: GET_WORKERS_WITH_TEAMS,
        fetchPolicy: 'network-only'
      })
    ).pipe(
      map((result: any) => result.data.workers)
    );
  }

  getTeams(): Observable<Team[]> {
    return from(
      apolloClient.query({
        query: GET_TEAMS,
        fetchPolicy: 'network-only'
      })
    ).pipe(
      map((result: any) => result.data.teams)
    );
  }
}
