import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, map } from 'rxjs';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';

export interface AuthWorker {
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
  worker: AuthWorker | null;
}

const LOGIN_MUTATION = gql`
  mutation Login($workerId: String!, $password: String!) {
    login(workerId: $workerId, password: $password) {
      success
      message
      worker {
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
  mutation UpdateWorkerProfile($id: String!, $firstName: String!, $lastName: String!, $particles: String, $email: String) {
    updateWorkerProfile(id: $id, firstName: $firstName, lastName: $lastName, particles: $particles, email: $email) {
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
  mutation UpdateWorkerRole($workerId: String!, $role: String!, $requesterId: String!) {
    updateWorkerRole(workerId: $workerId, role: $role, requesterId: $requesterId) {
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
  mutation ChangePassword($workerId: String!, $currentPassword: String!, $newPassword: String!) {
    changePassword(workerId: $workerId, currentPassword: $currentPassword, newPassword: $newPassword) {
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
  private currentUserSubject = new BehaviorSubject<AuthWorker | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        this.currentUserSubject.next(user);
      }
    } catch (e) {
      console.warn('Failed to load stored user:', e);
    }
  }

  private storeUser(user: AuthWorker | null): void {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to store user:', e);
    }
  }

  get isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  get currentUser(): AuthWorker | null {
    return this.currentUserSubject.value;
  }

  login(workerId: string, password: string): Observable<AuthPayload> {
    return from(
      apolloClient.mutate({
        mutation: LOGIN_MUTATION,
        variables: { workerId, password }
      })
    ).pipe(
      map((result: any) => {
        const payload: AuthPayload = result.data.login;
        if (payload.success && payload.worker) {
          this.currentUserSubject.next(payload.worker);
          this.storeUser(payload.worker);
        }
        return payload;
      })
    );
  }

  logout(): void {
    this.currentUserSubject.next(null);
    this.storeUser(null);
  }

  updateProfile(firstName: string, lastName: string, particles: string | null, email: string | null): Observable<AuthWorker | null> {
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
        const updatedWorker: AuthWorker = result.data.updateWorkerProfile;
        if (updatedWorker) {
          this.currentUserSubject.next(updatedWorker);
          this.storeUser(updatedWorker);
        }
        return updatedWorker;
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
          workerId: user.id,
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

  updateRole(workerId: string, role: 'user' | 'manager'): Observable<AuthWorker | null> {
    const user = this.currentUser;
    if (!user) {
      throw new Error('Not logged in');
    }

    return from(
      apolloClient.mutate({
        mutation: UPDATE_ROLE_MUTATION,
        variables: {
          workerId,
          role,
          requesterId: user.id
        }
      })
    ).pipe(
      map((result: any) => {
        const updatedWorker: AuthWorker = result.data.updateWorkerRole;
        // If updating own role, update current user
        if (updatedWorker && updatedWorker.id === user.id) {
          this.currentUserSubject.next(updatedWorker);
          this.storeUser(updatedWorker);
        }
        return updatedWorker;
      })
    );
  }
}
