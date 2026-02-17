import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, map } from 'rxjs';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';

export interface AuthMember {
  id: string;
  firstName: string;
  lastName: string;
  particles: string | null;
  email: string | null;
  role: 'user' | 'manager';
}

export interface AuthPayload {
  success: boolean;
  message: string | null;
  member: AuthMember | null;
  token: string | null;
}

const LOGIN_MUTATION = gql`
  mutation Login($memberId: String!, $password: String!) {
    login(memberId: $memberId, password: $password) {
      success
      message
      token
      member {
        id
        firstName
        lastName
        particles
        email
        role
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
    }
  }
`;

const UPDATE_ROLE_MUTATION = gql`
  mutation UpdateMemberRole($memberId: String!, $role: String!) {
    updateMemberRole(memberId: $memberId, role: $role) {
      id
      firstName
      lastName
      particles
      email
      role
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

const STORAGE_KEY = 'teamschedule-auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthMember | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private token: string | null = null;

  constructor() {
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.user) {
          // New format: { user, token }
          this.token = parsed.token;
          this.currentUserSubject.next(parsed.user);
        } else {
          // Old format (raw user object without token) - force re-login
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to load stored auth:', e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private storeAuth(user: AuthMember | null, token: string | null): void {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
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

  login(memberId: string, password: string): Observable<AuthPayload> {
    return from(
      apolloClient.mutate({
        mutation: LOGIN_MUTATION,
        variables: { memberId, password }
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

  setAuth(member: AuthMember, token: string): void {
    this.token = token;
    this.currentUserSubject.next(member);
    this.storeAuth(member, token);
  }

  logout(): void {
    this.token = null;
    this.currentUserSubject.next(null);
    this.storeAuth(null, null);
  }

  updateProfile(firstName: string, lastName: string, particles: string | null, email: string | null): Observable<AuthMember | null> {
    const user = this.currentUser;
    if (!user) {
      throw new Error('Not logged in');
    }

    return from(
      apolloClient.mutate({
        mutation: UPDATE_PROFILE_MUTATION,
        variables: {
          id: user.id,
          firstName,
          lastName,
          particles,
          email
        }
      })
    ).pipe(
      map((result: any) => {
        const updatedMember: AuthMember = result.data.updateMemberProfile;
        if (updatedMember) {
          this.currentUserSubject.next(updatedMember);
          this.storeAuth(updatedMember, this.token);
        }
        return updatedMember;
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<AuthPayload> {
    const user = this.currentUser;
    if (!user) {
      throw new Error('Not logged in');
    }

    return from(
      apolloClient.mutate({
        mutation: CHANGE_PASSWORD_MUTATION,
        variables: {
          memberId: user.id,
          currentPassword,
          newPassword
        }
      })
    ).pipe(
      map((result: any) => result.data.changePassword)
    );
  }

  get isManager(): boolean {
    return this.currentUser?.role === 'manager';
  }

  updateRole(memberId: string, role: 'user' | 'manager'): Observable<AuthMember | null> {
    const user = this.currentUser;
    if (!user) {
      throw new Error('Not logged in');
    }

    return from(
      apolloClient.mutate({
        mutation: UPDATE_ROLE_MUTATION,
        variables: {
          memberId,
          role
        }
      })
    ).pipe(
      map((result: any) => {
        const updatedMember: AuthMember = result.data.updateMemberRole;
        // If updating own role, update current user
        if (updatedMember && updatedMember.id === user.id) {
          this.currentUserSubject.next(updatedMember);
          this.storeAuth(updatedMember, this.token);
        }
        return updatedMember;
      })
    );
  }
}
