import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, map, tap } from 'rxjs';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';

export interface MemberHolidayType {
  id: string;
  name: string;
  colorLight: string;
  colorDark: string;
  sortOrder: number;
  isSystem?: boolean;
}

export type DayPart = 'full' | 'morning' | 'afternoon';

export interface MemberHolidayPeriod {
  id: string;
  memberId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startDayPart: DayPart;
  endDayPart: DayPart;
  description: string | null;
  holidayType: MemberHolidayType | null;
}

export interface MemberHolidayInput {
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
  memberId: string;
  date: string;
  dayPart: DayPart;
  description: string | null;
  holidayType: MemberHolidayType | null;
}

const PERIOD_FIELDS = `
  id memberId startDate endDate startDayPart endDayPart description
  holidayType { id name colorLight colorDark sortOrder isSystem }
`;

const ALL_MEMBER_HOLIDAYS_QUERY = gql`
  query AllMemberHolidays($startDate: String!, $endDate: String!) {
    allMemberHolidays(startDate: $startDate, endDate: $endDate) {
      ${PERIOD_FIELDS}
    }
  }
`;

const MEMBER_HOLIDAYS_QUERY = gql`
  query MemberHolidays($memberId: String!) {
    memberHolidays(memberId: $memberId) {
      ${PERIOD_FIELDS}
    }
  }
`;

const ADD_MEMBER_HOLIDAY_MUTATION = gql`
  mutation AddMemberHoliday($memberId: String!, $holiday: MemberHolidayInput!) {
    addMemberHoliday(memberId: $memberId, holiday: $holiday) {
      ${PERIOD_FIELDS}
    }
  }
`;

const REMOVE_MEMBER_HOLIDAY_MUTATION = gql`
  mutation RemoveMemberHoliday($id: ID!) {
    removeMemberHoliday(id: $id)
  }
`;

const UPDATE_MEMBER_HOLIDAY_MUTATION = gql`
  mutation UpdateMemberHoliday($id: ID!, $holiday: MemberHolidayInput!) {
    updateMemberHoliday(id: $id, holiday: $holiday) {
      ${PERIOD_FIELDS}
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class MemberHolidayService {
  // Raw periods from the API
  private periods: MemberHolidayPeriod[] = [];

  // Expanded per-day map for O(1) cell lookups, keyed by "memberId:YYYY-MM-DD"
  private holidaysMap = new Map<string, ExpandedDayEntry>();
  private holidaysSubject = new BehaviorSubject<Map<string, ExpandedDayEntry>>(this.holidaysMap);
  public holidays$ = this.holidaysSubject.asObservable();

  // Periods exposed for the account page list view
  private periodsSubject = new BehaviorSubject<MemberHolidayPeriod[]>([]);
  public periods$ = this.periodsSubject.asObservable();

  private makeKey(memberId: string, date: string): string {
    return `${memberId}:${date}`;
  }

  hasHoliday(memberId: string, dateStr: string): boolean {
    return this.holidaysMap.has(this.makeKey(memberId, dateStr));
  }

  getHoliday(memberId: string, dateStr: string): ExpandedDayEntry | undefined {
    return this.holidaysMap.get(this.makeKey(memberId, dateStr));
  }

  getPeriod(periodId: string): MemberHolidayPeriod | undefined {
    return this.periods.find(p => p.id === periodId);
  }

  private expandPeriod(period: MemberHolidayPeriod): void {
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

      this.holidaysMap.set(this.makeKey(period.memberId, dateStr), {
        periodId: period.id,
        memberId: period.memberId,
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

  loadAllHolidays(startDate: string, endDate: string): Observable<MemberHolidayPeriod[]> {
    return from(
      apolloClient.query({
        query: ALL_MEMBER_HOLIDAYS_QUERY,
        variables: { startDate, endDate },
        fetchPolicy: 'network-only'
      })
    ).pipe(
      map((result: any) => result.data.allMemberHolidays as MemberHolidayPeriod[]),
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

  loadMemberHolidays(memberId: string): Observable<MemberHolidayPeriod[]> {
    return from(
      apolloClient.query({
        query: MEMBER_HOLIDAYS_QUERY,
        variables: { memberId },
        fetchPolicy: 'network-only'
      })
    ).pipe(
      map((result: any) => result.data.memberHolidays as MemberHolidayPeriod[]),
      tap(periods => {
        // Remove existing periods for this member, then add fresh data
        this.periods = this.periods.filter(p => p.memberId !== memberId);
        this.periods.push(...periods);
        this.rebuildMap();
      })
    );
  }

  addHoliday(memberId: string, input: MemberHolidayInput): Observable<MemberHolidayPeriod> {
    // Optimistic update: create a temp period
    const tempId = 'temp-' + Date.now();
    const tempPeriod: MemberHolidayPeriod = {
      id: tempId,
      memberId,
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
        mutation: ADD_MEMBER_HOLIDAY_MUTATION,
        variables: {
          memberId,
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
        const returned = result.data.addMemberHoliday as MemberHolidayPeriod;
        // Replace the temp period with the real one
        this.periods = this.periods.filter(p => p.id !== tempId);
        this.periods.push(returned);
        this.rebuildMap();
        return returned;
      })
    );
  }

  updateHoliday(periodId: string, input: MemberHolidayInput): Observable<MemberHolidayPeriod> {
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
        mutation: UPDATE_MEMBER_HOLIDAY_MUTATION,
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
        const returned = result.data.updateMemberHoliday as MemberHolidayPeriod;
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
        mutation: REMOVE_MEMBER_HOLIDAY_MUTATION,
        variables: { id: periodId }
      })
    ).pipe(
      map((result: any) => result.data.removeMemberHoliday as boolean)
    );
  }
}
