import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiEventService {
  readonly openLogin$ = new Subject<void>();
}
