import { ApplicationConfig } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, concat } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { onError } from '@apollo/client/link/error';

// Create HttpLink for GraphQL endpoint
const httpLink = new HttpLink({
  uri: '/graphql'
});

const AUTH_STORAGE_KEY = 'teamschedule-auth';

function getStoredToken(): string | null {
  try {
    const local = localStorage.getItem(AUTH_STORAGE_KEY);
    if (local) {
      const { token } = JSON.parse(local);
      if (token) return token;
    }
    const session = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (session) {
      const { token } = JSON.parse(session);
      if (token) return token;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

// Auth middleware: attach JWT token to every request
const authMiddleware = new ApolloLink((operation, forward) => {
  const token = getStoredToken();
  if (token) {
    operation.setContext({
      headers: { authorization: `Bearer ${token}` },
    });
  }
  return forward(operation);
});

// Error link: handle auth errors (expired/invalid token)
const errorLink = onError(({ error }) => {
  if (CombinedGraphQLErrors.is(error) &&
      error.errors.some(e => e.message === 'Authentication required')) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
});

// Create and export Apollo Client instance
export const apolloClient = new ApolloClient({
  link: concat(authMiddleware, concat(errorLink, httpLink)),
  cache: new InMemoryCache()
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withRouterConfig({ onSameUrlNavigation: 'reload' })),
    provideHttpClient(),
    provideAnimations(),
    provideTranslateService({
      defaultLanguage: 'en'
    }),
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json'
    }),
    {
      provide: MAT_ICON_DEFAULT_OPTIONS,
      useValue: { fontSet: 'material-symbols-outlined' }
    }
  ]
};
