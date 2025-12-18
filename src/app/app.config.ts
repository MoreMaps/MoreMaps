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
import {ElectricityPriceService} from './services/electricity-price-service/electricity-price-service';
import {ElectricityPriceCache} from './services/electricity-price-service/ElectricityPriceCache';
import {ELECTRICITY_PRICE_REPOSITORY} from './services/electricity-price-service/ElectricityPriceRepository';
import {FuelPriceService} from './services/fuel-price-service/fuel-price-service';
import {FuelPriceCache} from './services/fuel-price-service/FuelPriceCache';
import {FUEL_PRICE_REPOSITORY} from './services/fuel-price-service/FuelPriceRepository';

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
      // todo: revisar si esto es correcto
      ElectricityPriceService,
      { provide: ELECTRICITY_PRICE_REPOSITORY, useClass: ElectricityPriceCache },
      FuelPriceService,
      { provide: FUEL_PRICE_REPOSITORY, useClass: FuelPriceCache },
  ]
};
