import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import {environment} from '../environments/environment';
import {provideHttpClient} from '@angular/common/http';
import {MapSearchService} from './services/map-search-service/map-search.service';
import {MAP_SEARCH_REPOSITORY} from './services/map-search-service/MapSearchRepository';
import { MapSearchAPI } from "./services/map-search-service/MapSearchAPI";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideHttpClient(),
      MapSearchService,
      { provide: MAP_SEARCH_REPOSITORY, useClass: MapSearchAPI },
  ]
};
