import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, map, tap } from 'rxjs';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';

export interface WorkerHoliday {
  id: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  description: string | null;
}

const ALL_WORKER_HOLIDAYS_QUERY = gql`
  query AllWorkerHolidays($startDate: String!, $endDate: String!) {
    allWorkerHolidays(startDate: $startDate, endDate: $endDate) {
      id
      workerId
      date
      description
    }
  }
`;

const WORKER_HOLIDAYS_QUERY = gql`
  query WorkerHolidays($workerId: String!) {
    workerHolidays(workerId: $workerId) {
      id
      workerId
      date
      description
    }
  }
`;

const TOGGLE_WORKER_HOLIDAY_MUTATION = gql`
  mutation ToggleWorkerHoliday($workerId: String!, $date: String!, $description: String) {
    toggleWorkerHoliday(workerId: $workerId, date: $date, description: $description) {
      id
      workerId
      date
      description
    }
  }
`;

const REMOVE_WORKER_HOLIDAY_MUTATION = gql`
  mutation RemoveWorkerHoliday($workerId: String!, $date: String!) {
    removeWorkerHoliday(workerId: $workerId, date: $date)
  }
`;

@Injectable({
  providedIn: 'root'
})
export class WorkerHolidayService {
  // Map keyed by "workerId:YYYY-MM-DD" for O(1) lookups
  private holidaysMap = new Map<string, WorkerHoliday>();
  private holidaysSubject = new BehaviorSubject<Map<string, WorkerHoliday>>(this.holidaysMap);
  public holidays$ = this.holidaysSubject.asObservable();

  private makeKey(workerId: string, date: string): string {
    return `${workerId}:${date}`;
  }

  hasHoliday(workerId: string, dateStr: string): boolean {
    return this.holidaysMap.has(this.makeKey(workerId, dateStr));
  }

  getHoliday(workerId: string, dateStr: string): WorkerHoliday | undefined {
    return this.holidaysMap.get(this.makeKey(workerId, dateStr));
  }

  loadAllHolidays(startDate: string, endDate: string): Observable<WorkerHoliday[]> {
    return from(
      apolloClient.query({
        query: ALL_WORKER_HOLIDAYS_QUERY,
        variables: { startDate, endDate },
        fetchPolicy: 'network-only'
      })
    ).pipe(
      map((result: any) => result.data.allWorkerHolidays as WorkerHoliday[]),
      tap(holidays => {
        // Clear existing entries within the date range and rebuild
        for (const [key, holiday] of this.holidaysMap.entries()) {
          if (holiday.date >= startDate && holiday.date <= endDate) {
            this.holidaysMap.delete(key);
          }
        }
        for (const holiday of holidays) {
          this.holidaysMap.set(this.makeKey(holiday.workerId, holiday.date), holiday);
        }
        this.holidaysSubject.next(this.holidaysMap);
      })
    );
  }

  loadWorkerHolidays(workerId: string): Observable<WorkerHoliday[]> {
    return from(
      apolloClient.query({
        query: WORKER_HOLIDAYS_QUERY,
        variables: { workerId },
        fetchPolicy: 'network-only'
      })
    ).pipe(
      map((result: any) => result.data.workerHolidays as WorkerHoliday[]),
      tap(holidays => {
        // Clear existing entries for this worker and rebuild
        for (const key of this.holidaysMap.keys()) {
          if (key.startsWith(`${workerId}:`)) {
            this.holidaysMap.delete(key);
          }
        }
        for (const holiday of holidays) {
          this.holidaysMap.set(this.makeKey(holiday.workerId, holiday.date), holiday);
        }
        this.holidaysSubject.next(this.holidaysMap);
      })
    );
  }

  toggleHoliday(workerId: string, date: string, description?: string): Observable<WorkerHoliday | null> {
    const key = this.makeKey(workerId, date);
    const wasPresent = this.holidaysMap.has(key);

    // Optimistic update
    if (wasPresent) {
      this.holidaysMap.delete(key);
    } else {
      this.holidaysMap.set(key, {
        id: 'temp',
        workerId,
        date,
        description: description || null
      });
    }
    this.holidaysSubject.next(this.holidaysMap);

    return from(
      apolloClient.mutate({
        mutation: TOGGLE_WORKER_HOLIDAY_MUTATION,
        variables: { workerId, date, description: description || null }
      })
    ).pipe(
      map((result: any) => {
        const holiday = result.data.toggleWorkerHoliday as WorkerHoliday | null;
        if (holiday) {
          // Replace temp entry with real one
          this.holidaysMap.set(key, holiday);
        } else {
          // Confirm removal
          this.holidaysMap.delete(key);
        }
        this.holidaysSubject.next(this.holidaysMap);
        return holiday;
      })
    );
  }

  removeHoliday(workerId: string, date: string): Observable<boolean> {
    const key = this.makeKey(workerId, date);

    // Optimistic update
    this.holidaysMap.delete(key);
    this.holidaysSubject.next(this.holidaysMap);

    return from(
      apolloClient.mutate({
        mutation: REMOVE_WORKER_HOLIDAY_MUTATION,
        variables: { workerId, date }
      })
    ).pipe(
      map((result: any) => result.data.removeWorkerHoliday as boolean)
    );
  }
}
