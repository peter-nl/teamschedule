import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface PublicHoliday {
  date: string; // Format: YYYY-MM-DD
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

export interface HolidayInfo {
  date: Date;
  localName: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  private readonly API_BASE = 'https://date.nager.at/api/v3/PublicHolidays';
  private readonly COUNTRY_CODE = 'NL';
  private readonly STORAGE_KEY = 'teamschedule-holidays';

  private holidaysMap = new Map<string, HolidayInfo>();
  private holidaysSubject = new BehaviorSubject<Map<string, HolidayInfo>>(this.holidaysMap);
  public holidays$ = this.holidaysSubject.asObservable();

  private loadedYears = new Set<number>();

  constructor(private http: HttpClient) {
    this.loadFromCache();
  }

  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        this.loadedYears = new Set(data.years || []);
        for (const [key, value] of Object.entries(data.holidays || {})) {
          const holiday = value as HolidayInfo;
          this.holidaysMap.set(key, {
            ...holiday,
            date: new Date(holiday.date)
          });
        }
        this.holidaysSubject.next(this.holidaysMap);
      }
    } catch (e) {
      console.warn('Failed to load holidays from cache:', e);
    }
  }

  private saveToCache(): void {
    try {
      const holidays: Record<string, HolidayInfo> = {};
      this.holidaysMap.forEach((value, key) => {
        holidays[key] = value;
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        years: Array.from(this.loadedYears),
        holidays
      }));
    } catch (e) {
      console.warn('Failed to save holidays to cache:', e);
    }
  }

  loadHolidaysForYears(years: number[]): Observable<void> {
    const yearsToLoad = years.filter(year => !this.loadedYears.has(year));

    if (yearsToLoad.length === 0) {
      return of(undefined);
    }

    const requests = yearsToLoad.map(year =>
      this.http.get<PublicHoliday[]>(`${this.API_BASE}/${year}/${this.COUNTRY_CODE}`).pipe(
        catchError(err => {
          console.error(`Failed to load holidays for ${year}:`, err);
          return of([]);
        })
      )
    );

    return forkJoin(requests).pipe(
      tap(results => {
        results.forEach((holidays, index) => {
          const year = yearsToLoad[index];
          this.loadedYears.add(year);

          holidays.forEach(holiday => {
            const dateKey = holiday.date;
            this.holidaysMap.set(dateKey, {
              date: new Date(holiday.date),
              localName: holiday.localName,
              name: holiday.name
            });
          });
        });

        this.holidaysSubject.next(this.holidaysMap);
        this.saveToCache();
      }),
      map(() => undefined)
    );
  }

  isHoliday(date: Date): boolean {
    const dateKey = this.formatDateKey(date);
    return this.holidaysMap.has(dateKey);
  }

  getHoliday(date: Date): HolidayInfo | undefined {
    const dateKey = this.formatDateKey(date);
    return this.holidaysMap.get(dateKey);
  }

  getHolidaysMap(): Map<string, HolidayInfo> {
    return this.holidaysMap;
  }

  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  clearCache(): void {
    this.holidaysMap.clear();
    this.loadedYears.clear();
    localStorage.removeItem(this.STORAGE_KEY);
    this.holidaysSubject.next(this.holidaysMap);
  }
}
