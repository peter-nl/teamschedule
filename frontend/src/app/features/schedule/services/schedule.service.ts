import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { gql } from '@apollo/client';
import { apolloClient } from '../../../app.config';
import { Member, MemberSchedule, DaySchedule } from '../../../shared/models/member.model';
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

const GET_MEMBER_SCHEDULES = gql`
  query GetMemberSchedules {
    memberSchedules {
      memberId
      referenceDate
      week1 { morning afternoon }
      week2 { morning afternoon }
    }
  }
`;

const SAVE_MEMBER_SCHEDULE = gql`
  mutation SaveMemberSchedule($memberId: String!, $referenceDate: String!, $week1: [DayScheduleInput!]!, $week2: [DayScheduleInput!]!) {
    saveMemberSchedule(memberId: $memberId, referenceDate: $referenceDate, week1: $week1, week2: $week2) {
      memberId
      referenceDate
      week1 { morning afternoon }
      week2 { morning afternoon }
    }
  }
`;

const DELETE_MEMBER_SCHEDULE = gql`
  mutation DeleteMemberSchedule($memberId: String!) {
    deleteMemberSchedule(memberId: $memberId)
  }
`;

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private scheduleMap = new Map<string, MemberSchedule>();

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

  loadMemberSchedules(): Observable<MemberSchedule[]> {
    return from(
      apolloClient.query({
        query: GET_MEMBER_SCHEDULES,
        fetchPolicy: 'network-only'
      })
    ).pipe(
      map((result: any) => {
        const schedules: MemberSchedule[] = result.data.memberSchedules;
        this.scheduleMap.clear();
        for (const s of schedules) {
          this.scheduleMap.set(s.memberId, s);
        }
        return schedules;
      })
    );
  }

  getMemberSchedule(memberId: string): MemberSchedule | undefined {
    return this.scheduleMap.get(memberId);
  }

  /**
   * Get the DaySchedule for a member on a specific date.
   * Returns null if the member has no custom schedule or if it's a weekend.
   */
  getScheduleForDate(memberId: string, date: Date): DaySchedule | null {
    const schedule = this.scheduleMap.get(memberId);
    if (!schedule) return null;

    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) return null; // Weekend

    const refDate = new Date(schedule.referenceDate + 'T00:00:00');
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((targetDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    const weekIndex = Math.floor(diffDays / 7);
    const isWeek1 = ((weekIndex % 2) + 2) % 2 === 0; // Handle negative weeks correctly

    const week = isWeek1 ? schedule.week1 : schedule.week2;
    const dayIndex = dayOfWeek - 1; // Mon=0, Tue=1, ..., Fri=4
    return week[dayIndex] || null;
  }

  saveMemberSchedule(memberId: string, referenceDate: string, week1: DaySchedule[], week2: DaySchedule[]): Observable<MemberSchedule> {
    return from(
      apolloClient.mutate({
        mutation: SAVE_MEMBER_SCHEDULE,
        variables: { memberId, referenceDate, week1, week2 }
      })
    ).pipe(
      map((result: any) => {
        const saved: MemberSchedule = result.data.saveMemberSchedule;
        this.scheduleMap.set(saved.memberId, saved);
        return saved;
      })
    );
  }

  deleteMemberSchedule(memberId: string): Observable<boolean> {
    return from(
      apolloClient.mutate({
        mutation: DELETE_MEMBER_SCHEDULE,
        variables: { memberId }
      })
    ).pipe(
      map((result: any) => {
        this.scheduleMap.delete(memberId);
        return result.data.deleteMemberSchedule;
      })
    );
  }
}
