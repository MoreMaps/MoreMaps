import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import {environment} from '../environments/environment';
import {provideHttpClient} from '@angular/common/http';
import { MapSearchAPI } from "./services/map-search-service/MapSearchAPI";
import {MapSearchService} from './services/map-search-service/map-search.service';
import {MAP_SEARCH_REPOSITORY} from './services/map-search-service/MapSearchRepository';
import {UserService} from './services/User/user.service';
import {USER_REPOSITORY} from './services/User/UserRepository';
import {UserDB} from './services/User/UserDB';

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
      UserService,
      MapSearchService,
      { provide: USER_REPOSITORY, useClass: UserDB },
      { provide: MAP_SEARCH_REPOSITORY, useClass: MapSearchAPI },
  ]
};
