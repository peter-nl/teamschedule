import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, map, tap } from 'rxjs';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';

export interface WorkerHolidayType {
  id: string;
  name: string;
  colorLight: string;
  colorDark: string;
  sortOrder: number;
}

export type DayPart = 'full' | 'morning' | 'afternoon';

export interface WorkerHolidayPeriod {
  id: string;
  workerId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startDayPart: DayPart;
  endDayPart: DayPart;
  description: string | null;
  holidayType: WorkerHolidayType | null;
}

export interface WorkerHolidayInput {
  startDate: string;
  endDate: string;
  startDayPart: DayPart;
  endDayPart: DayPart;
  description?: string;
  holidayTypeId?: string;
}

// Per-day entry expanded from a period, for O(1) schedule matrix lookups
export interface ExpandedDayEntry {
  periodId: string;
  workerId: string;
  date: string;
  dayPart: DayPart;
  description: string | null;
  holidayType: WorkerHolidayType | null;
}

const PERIOD_FIELDS = `
  id workerId startDate endDate startDayPart endDayPart description
  holidayType { id name colorLight colorDark sortOrder }
`;

const ALL_WORKER_HOLIDAYS_QUERY = gql`
  query AllWorkerHolidays($startDate: String!, $endDate: String!) {
    allWorkerHolidays(startDate: $startDate, endDate: $endDate) {
      ${PERIOD_FIELDS}
    }
  }
`;

const WORKER_HOLIDAYS_QUERY = gql`
  query WorkerHolidays($workerId: String!) {
    workerHolidays(workerId: $workerId) {
      ${PERIOD_FIELDS}
    }
  }
`;

const ADD_WORKER_HOLIDAY_MUTATION = gql`
  mutation AddWorkerHoliday($workerId: String!, $holiday: WorkerHolidayInput!) {
    addWorkerHoliday(workerId: $workerId, holiday: $holiday) {
      ${PERIOD_FIELDS}
    }
  }
`;

const REMOVE_WORKER_HOLIDAY_MUTATION = gql`
  mutation RemoveWorkerHoliday($id: ID!) {
    removeWorkerHoliday(id: $id)
  }
`;

const UPDATE_WORKER_HOLIDAY_MUTATION = gql`
  mutation UpdateWorkerHoliday($id: ID!, $holiday: WorkerHolidayInput!) {
    updateWorkerHoliday(id: $id, holiday: $holiday) {
      ${PERIOD_FIELDS}
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class WorkerHolidayService {
  // Raw periods from the API
  private periods: WorkerHolidayPeriod[] = [];

  // Expanded per-day map for O(1) cell lookups, keyed by "workerId:YYYY-MM-DD"
  private holidaysMap = new Map<string, ExpandedDayEntry>();
  private holidaysSubject = new BehaviorSubject<Map<string, ExpandedDayEntry>>(this.holidaysMap);
  public holidays$ = this.holidaysSubject.asObservable();

  // Periods exposed for the account page list view
  private periodsSubject = new BehaviorSubject<WorkerHolidayPeriod[]>([]);
  public periods$ = this.periodsSubject.asObservable();

  private makeKey(workerId: string, date: string): string {
    return `${workerId}:${date}`;
  }

  hasHoliday(workerId: string, dateStr: string): boolean {
    return this.holidaysMap.has(this.makeKey(workerId, dateStr));
  }

  getHoliday(workerId: string, dateStr: string): ExpandedDayEntry | undefined {
    return this.holidaysMap.get(this.makeKey(workerId, dateStr));
  }

  getPeriod(periodId: string): WorkerHolidayPeriod | undefined {
    return this.periods.find(p => p.id === periodId);
  }

  private expandPeriod(period: WorkerHolidayPeriod): void {
    const start = new Date(period.startDate + 'T00:00:00');
    const end = new Date(period.endDate + 'T00:00:00');
    const current = new Date(start);

    while (current <= end) {
      const dateStr = this.formatDate(current);
      let dayPart: DayPart = 'full';

      if (period.startDate === period.endDate) {
        dayPart = period.startDayPart;
      } else if (dateStr === period.startDate) {
        dayPart = period.startDayPart;
      } else if (dateStr === period.endDate) {
        dayPart = period.endDayPart;
      }

      this.holidaysMap.set(this.makeKey(period.workerId, dateStr), {
        periodId: period.id,
        workerId: period.workerId,
        date: dateStr,
        dayPart,
        description: period.description,
        holidayType: period.holidayType,
      });

      current.setDate(current.getDate() + 1);
    }
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private rebuildMap(): void {
    this.holidaysMap.clear();
    for (const period of this.periods) {
      this.expandPeriod(period);
    }
    this.holidaysSubject.next(this.holidaysMap);
    this.periodsSubject.next([...this.periods]);
  }

  loadAllHolidays(startDate: string, endDate: string): Observable<WorkerHolidayPeriod[]> {
    return from(
      apolloClient.query({
        query: ALL_WORKER_HOLIDAYS_QUERY,
        variables: { startDate, endDate },
        fetchPolicy: 'network-only'
      })
    ).pipe(
      map((result: any) => result.data.allWorkerHolidays as WorkerHolidayPeriod[]),
      tap(periods => {
        // Remove periods that overlap the queried range, then add fresh data
        this.periods = this.periods.filter(p =>
          !(p.startDate <= endDate && p.endDate >= startDate)
        );
        this.periods.push(...periods);
        this.rebuildMap();
      })
    );
  }

  loadWorkerHolidays(workerId: string): Observable<WorkerHolidayPeriod[]> {
    return from(
      apolloClient.query({
        query: WORKER_HOLIDAYS_QUERY,
        variables: { workerId },
        fetchPolicy: 'network-only'
      })
    ).pipe(
      map((result: any) => result.data.workerHolidays as WorkerHolidayPeriod[]),
      tap(periods => {
        // Remove existing periods for this worker, then add fresh data
        this.periods = this.periods.filter(p => p.workerId !== workerId);
        this.periods.push(...periods);
        this.rebuildMap();
      })
    );
  }

  addHoliday(workerId: string, input: WorkerHolidayInput): Observable<WorkerHolidayPeriod> {
    // Optimistic update: create a temp period
    const tempId = 'temp-' + Date.now();
    const tempPeriod: WorkerHolidayPeriod = {
      id: tempId,
      workerId,
      startDate: input.startDate,
      endDate: input.endDate,
      startDayPart: input.startDayPart,
      endDayPart: input.endDayPart,
      description: input.description || null,
      holidayType: null,
    };
    this.periods.push(tempPeriod);
    this.rebuildMap();

    return from(
      apolloClient.mutate({
        mutation: ADD_WORKER_HOLIDAY_MUTATION,
        variables: {
          workerId,
          holiday: {
            startDate: input.startDate,
            endDate: input.endDate,
            startDayPart: input.startDayPart,
            endDayPart: input.endDayPart,
            description: input.description || null,
            holidayTypeId: input.holidayTypeId || null,
          }
        }
      })
    ).pipe(
      map((result: any) => {
        const returned = result.data.addWorkerHoliday as WorkerHolidayPeriod;
        // Replace the temp period with the real one
        this.periods = this.periods.filter(p => p.id !== tempId);
        this.periods.push(returned);
        this.rebuildMap();
        return returned;
      })
    );
  }

  updateHoliday(periodId: string, input: WorkerHolidayInput): Observable<WorkerHolidayPeriod> {
    // Optimistic update: replace the period with a new object (originals may be frozen by Apollo)
    const existing = this.periods.find(p => p.id === periodId);
    if (existing) {
      this.periods = this.periods.filter(p => p.id !== periodId);
      this.periods.push({
        ...existing,
        startDate: input.startDate,
        endDate: input.endDate,
        startDayPart: input.startDayPart,
        endDayPart: input.endDayPart,
        description: input.description || null,
      });
    }
    this.rebuildMap();

    return from(
      apolloClient.mutate({
        mutation: UPDATE_WORKER_HOLIDAY_MUTATION,
        variables: {
          id: periodId,
          holiday: {
            startDate: input.startDate,
            endDate: input.endDate,
            startDayPart: input.startDayPart,
            endDayPart: input.endDayPart,
            description: input.description || null,
            holidayTypeId: input.holidayTypeId || null,
          }
        }
      })
    ).pipe(
      map((result: any) => {
        const returned = result.data.updateWorkerHoliday as WorkerHolidayPeriod;
        this.periods = this.periods.filter(p => p.id !== periodId);
        this.periods.push(returned);
        this.rebuildMap();
        return returned;
      })
    );
  }

  removeHoliday(periodId: string): Observable<boolean> {
    // Optimistic update: remove the period
    this.periods = this.periods.filter(p => p.id !== periodId);
    this.rebuildMap();

    return from(
      apolloClient.mutate({
        mutation: REMOVE_WORKER_HOLIDAY_MUTATION,
        variables: { id: periodId }
      })
    ).pipe(
      map((result: any) => result.data.removeWorkerHoliday as boolean)
    );
  }
}
