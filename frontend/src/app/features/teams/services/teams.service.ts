import { Injectable } from '@angular/core';
import { apolloClient } from '../../../app.config';
import { gql } from '@apollo/client';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Team } from '../../../shared/models/team.model';

const GET_TEAMS = gql`
  query GetTeams {
    teams {
      id
      name
      workers {
        id
        firstName
        lastName
        particles
        email
      }
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class TeamsService {
  getTeams(): Observable<Team[]> {
    return from(
      apolloClient.query({
        query: GET_TEAMS,
        fetchPolicy: 'network-only'
      })
    ).pipe(
      map((result: any) => {
        return result.data.teams.map((team: any) => ({
          ...team,
          workerCount: team.workers?.length || 0
        }));
      })
    );
  }
}
