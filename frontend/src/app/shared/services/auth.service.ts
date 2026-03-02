import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, map } from 'rxjs';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';

export interface AuthMember {
  id: string;
  memberNo: number;
  username: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
  role: 'sysadmin' | 'user';
  organisationId: number | null;
  isOrgAdmin: boolean;
  teamAdminIds: number[];
  scheduleDisabled: boolean;
  isDemo?: boolean;
}

export interface AuthPayload {
  success: boolean;
  message: string | null;
  member: AuthMember | null;
  token: string | null;
}

const MEMBER_FIELDS = `
  id
  memberNo
  username
  firstName
  lastName
  particles
  email
  role
  organisationId
  scheduleDisabled
  isOrgAdmin
  teamAdminIds
  isDemo
`;

const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      success
      message
      token
      member {
        ${MEMBER_FIELDS}
      }
    }
  }
`;

const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateMemberProfile($id: String!, $firstName: String!, $lastName: String!, $particles: String, $email: String) {
    updateMemberProfile(id: $id, firstName: $firstName, lastName: $lastName, particles: $particles, email: $email) {
      id
      firstName
      lastName
      particles
      email
      role
      organisationId
    }
  }
`;

const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($memberId: String!, $currentPassword: String!, $newPassword: String!) {
    changePassword(memberId: $memberId, currentPassword: $currentPassword, newPassword: $newPassword) {
      success
      message
    }
  }
`;

const UPDATE_SCHEDULE_DISABLED_MUTATION = gql`
  mutation UpdateScheduleDisabled($disabled: Boolean!) {
    updateScheduleDisabled(disabled: $disabled) {
      id
      scheduleDisabled
    }
  }
`;

const STORAGE_KEY = 'teamschedule-auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthMember | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private token: string | null = null;
  private remember = true;

  constructor() {
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    try {
      // Check localStorage first (remember me)
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.token && parsed.user) {
          this.remember = true;
          this.token = parsed.token;
          this.currentUserSubject.next(parsed.user);
          return;
        }
        localStorage.removeItem(STORAGE_KEY);
      }
      // Then check sessionStorage (no remember me)
      const session = sessionStorage.getItem(STORAGE_KEY);
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.token && parsed.user) {
          this.remember = false;
          this.token = parsed.token;
          this.currentUserSubject.next(parsed.user);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to load stored auth:', e);
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  private storeAuth(user: AuthMember | null, token: string | null): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      if (user) {
        const value = JSON.stringify({ user, token });
        if (this.remember) {
          localStorage.setItem(STORAGE_KEY, value);
        } else {
          sessionStorage.setItem(STORAGE_KEY, value);
        }
      }
    } catch (e) {
      console.warn('Failed to store auth:', e);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  get isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  get currentUser(): AuthMember | null {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string, remember = false): Observable<AuthPayload> {
    this.remember = remember;
    return from(
      apolloClient.mutate({
        mutation: LOGIN_MUTATION,
        variables: { username, password }
      })
    ).pipe(
      map((result: any) => {
        const payload: AuthPayload = result.data.login;
        if (payload.success && payload.member) {
          this.token = payload.token ?? null;
          this.storeAuth(payload.member, this.token);
          this.currentUserSubject.next(payload.member);
        }
        return payload;
      })
    );
  }

  setAuth(member: AuthMember, token: string, remember = true): void {
    this.remember = remember;
    this.token = token;
    this.currentUserSubject.next(member);
    this.storeAuth(member, token);
  }

  logout(): void {
    this.token = null;
    this.currentUserSubject.next(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  updateProfile(firstName: string, lastName: string, particles: string | null, email: string | null): Observable<AuthMember | null> {
    const user = this.currentUser;
    if (!user) throw new Error('Not logged in');

    return from(
      apolloClient.mutate({
        mutation: UPDATE_PROFILE_MUTATION,
        variables: { id: user.id, firstName, lastName, particles, email }
      })
    ).pipe(
      map((result: any) => {
        const updated = result.data.updateMemberProfile;
        if (updated) {
          // Merge profile fields with preserved auth fields
          const merged: AuthMember = {
            ...user,
            firstName: updated.firstName,
            lastName: updated.lastName,
            particles: updated.particles,
            email: updated.email,
          };
          this.currentUserSubject.next(merged);
          this.storeAuth(merged, this.token);
          return merged;
        }
        return null;
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<AuthPayload> {
    const user = this.currentUser;
    if (!user) throw new Error('Not logged in');

    return from(
      apolloClient.mutate({
        mutation: CHANGE_PASSWORD_MUTATION,
        variables: { memberId: user.id, currentPassword, newPassword }
      })
    ).pipe(
      map((result: any) => result.data.changePassword)
    );
  }

  updateScheduleDisabled(disabled: boolean): Observable<boolean> {
    const user = this.currentUser;
    if (!user) throw new Error('Not logged in');

    return from(
      apolloClient.mutate({
        mutation: UPDATE_SCHEDULE_DISABLED_MUTATION,
        variables: { disabled }
      })
    ).pipe(
      map((result: any) => {
        const updated = result.data.updateScheduleDisabled;
        if (updated) {
          const merged: AuthMember = { ...user, scheduleDisabled: updated.scheduleDisabled };
          this.currentUserSubject.next(merged);
          this.storeAuth(merged, this.token);
        }
        return updated?.scheduleDisabled ?? disabled;
      })
    );
  }

  get isSysadmin(): boolean {
    return this.currentUser?.role === 'sysadmin';
  }

  get isOrgAdmin(): boolean {
    return this.currentUser?.isOrgAdmin ?? false;
  }

  get isTeamAdmin(): boolean {
    return (this.currentUser?.teamAdminIds?.length ?? 0) > 0;
  }

  get isAnyAdmin(): boolean {
    return this.isOrgAdmin || this.isTeamAdmin;
  }

  get isDemo(): boolean {
    return this.currentUser?.isDemo ?? false;
  }

  get teamAdminIds(): number[] {
    return this.currentUser?.teamAdminIds ?? [];
  }
}
