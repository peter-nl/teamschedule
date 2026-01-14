import { Injectable } from '@angular/core';
import { apolloClient } from '../../../app.config';
import { gql } from '@apollo/client';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Worker } from '../../../shared/models/worker.model';

const GET_WORKERS = gql`
  query GetWorkers {
    workers {
      id
      firstName
      lastName
      particles
      teams {
        id
        name
      }
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class WorkersService {
  getWorkers(): Observable<Worker[]> {
    return from(
      apolloClient.query({
        query: GET_WORKERS,
        fetchPolicy: 'network-only'
      })
    ).pipe(
      map((result: any) => result.data.workers)
    );
  }
}
