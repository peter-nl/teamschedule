import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, map, tap } from 'rxjs';
import { gql } from '@apollo/client';
import { apolloClient } from '../../app.config';

export interface HolidayType {
  id: string;
  name: string;
  colorLight: string;
  colorDark: string;
  sortOrder: number;
}

const HOLIDAY_TYPES_QUERY = gql`
  query HolidayTypes {
    holidayTypes {
      id
      name
      colorLight
      colorDark
      sortOrder
    }
  }
`;

const CREATE_HOLIDAY_TYPE_MUTATION = gql`
  mutation CreateHolidayType($name: String!, $colorLight: String!, $colorDark: String!) {
    createHolidayType(name: $name, colorLight: $colorLight, colorDark: $colorDark) {
      id name colorLight colorDark sortOrder
    }
  }
`;

const UPDATE_HOLIDAY_TYPE_MUTATION = gql`
  mutation UpdateHolidayType($id: ID!, $name: String, $colorLight: String, $colorDark: String, $sortOrder: Int) {
    updateHolidayType(id: $id, name: $name, colorLight: $colorLight, colorDark: $colorDark, sortOrder: $sortOrder) {
      id name colorLight colorDark sortOrder
    }
  }
`;

const DELETE_HOLIDAY_TYPE_MUTATION = gql`
  mutation DeleteHolidayType($id: ID!) {
    deleteHolidayType(id: $id)
  }
`;

@Injectable({
  providedIn: 'root'
})
export class HolidayTypeService {
  private typesSubject = new BehaviorSubject<HolidayType[]>([]);
  public types$ = this.typesSubject.asObservable();
  private loaded = false;

  get types(): HolidayType[] {
    return this.typesSubject.value;
  }

  loadTypes(): Observable<HolidayType[]> {
    return from(
      apolloClient.query({
        query: HOLIDAY_TYPES_QUERY,
        fetchPolicy: 'network-only'
      })
    ).pipe(
      map((result: any) => result.data.holidayTypes as HolidayType[]),
      tap(types => {
        this.typesSubject.next(types);
        this.loaded = true;
      })
    );
  }

  ensureLoaded(): Observable<HolidayType[]> {
    if (this.loaded) {
      return new Observable(subscriber => {
        subscriber.next(this.typesSubject.value);
        subscriber.complete();
      });
    }
    return this.loadTypes();
  }

  getTypeById(id: string): HolidayType | undefined {
    return this.typesSubject.value.find(t => t.id === id);
  }

  getDefaultType(): HolidayType | undefined {
    return this.typesSubject.value[0];
  }

  createType(name: string, colorLight: string, colorDark: string): Observable<HolidayType> {
    return from(
      apolloClient.mutate({
        mutation: CREATE_HOLIDAY_TYPE_MUTATION,
        variables: { name, colorLight, colorDark }
      })
    ).pipe(
      map((result: any) => result.data.createHolidayType as HolidayType),
      tap(() => this.loadTypes().subscribe())
    );
  }

  updateType(id: string, name?: string, colorLight?: string, colorDark?: string, sortOrder?: number): Observable<HolidayType> {
    return from(
      apolloClient.mutate({
        mutation: UPDATE_HOLIDAY_TYPE_MUTATION,
        variables: { id, name, colorLight, colorDark, sortOrder }
      })
    ).pipe(
      map((result: any) => result.data.updateHolidayType as HolidayType),
      tap(() => this.loadTypes().subscribe())
    );
  }

  deleteType(id: string): Observable<boolean> {
    return from(
      apolloClient.mutate({
        mutation: DELETE_HOLIDAY_TYPE_MUTATION,
        variables: { id }
      })
    ).pipe(
      map((result: any) => result.data.deleteHolidayType as boolean),
      tap(() => this.loadTypes().subscribe())
    );
  }
}
