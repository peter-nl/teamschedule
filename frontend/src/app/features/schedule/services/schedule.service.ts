import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { gql } from '@apollo/client';
import { apolloClient } from '../../../app.config';
import { Member } from '../../../shared/models/member.model';
import { Team } from '../../../shared/models/team.model';

const GET_MEMBERS_WITH_TEAMS = gql`
  query GetMembersWithTeams {
    members {
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

  getMembersWithTeams(): Observable<Member[]> {
    return from(
      apolloClient.query({
        query: GET_MEMBERS_WITH_TEAMS,
        fetchPolicy: 'network-only'
      })
    ).pipe(
      map((result: any) => result.data.members)
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
