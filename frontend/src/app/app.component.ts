import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { UserPreferencesService } from './shared/services/user-preferences.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent {
  constructor(
    private translate: TranslateService,
    private userPrefs: UserPreferencesService
  ) {
    translate.setDefaultLang('en');
    translate.use(userPrefs.preferences.language);
    userPrefs.preferences$.subscribe(prefs => {
      if (translate.currentLang !== prefs.language) {
        translate.use(prefs.language);
      }
    });
  }
}
