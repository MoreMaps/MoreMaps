import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import {environment} from '../environments/environment';
import {provideHttpClient} from '@angular/common/http';
import { MapSearchAPI } from "./services/map/map-search-service/MapSearchAPI";
import {MapSearchService} from './services/map/map-search-service/map-search.service';
import {MAP_SEARCH_REPOSITORY} from './services/map/map-search-service/MapSearchRepository';
import {UserService} from './services/User/user.service';
import {USER_REPOSITORY} from './services/User/UserRepository';
import {UserDB} from './services/User/UserDB';
import {ROUTE_REPOSITORY} from './services/Route/RouteRepository';
import {RouteDB} from './services/Route/RouteDB';
import {
    ELECTRICITY_PRICE_REPOSITORY,
    ELECTRICITY_PRICE_SOURCE
} from './services/electricity-price-service/ElectricityPriceRepository';
import {ElectricityPriceCache} from './services/electricity-price-service/ElectricityPriceCache';
import {ElectricityPriceAPI} from './services/electricity-price-service/ElectricityPriceAPI';
import {FUEL_PRICE_REPOSITORY, FUEL_PRICE_SOURCE} from './services/fuel-price-service/FuelPriceRepository';
import {FuelPriceCache} from './services/fuel-price-service/FuelPriceCache';
import {FuelPriceAPI} from './services/fuel-price-service/FuelPriceAPI';
import {RouteService} from './services/Route/route.service';
import {FuelPriceService} from './services/fuel-price-service/fuel-price-service';
import {ElectricityPriceService} from './services/electricity-price-service/electricity-price-service';
import {POI_REPOSITORY} from './services/POI/POIRepository';
import {POIDB} from './services/POI/POIDB';
import {POIService} from './services/POI/poi.service';
import {VehicleService} from './services/Vehicle/vehicle.service';
import {VEHICLE_REPOSITORY} from './services/Vehicle/VehicleRepository';
import {VehicleDB} from './services/Vehicle/VehicleDB';
import {PreferenceService} from './services/Preferences/preference.service';
import {PREFERENCE_REPOSITORY} from './services/Preferences/PreferenceRepository';
import {PreferenceDB} from './services/Preferences/PreferenceDB';

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
      POIService,
      VehicleService,
      MapSearchService,
      RouteService,
      FuelPriceService,
      ElectricityPriceService,
      PreferenceService,
      { provide: POI_REPOSITORY, useClass: POIDB },
      { provide: VEHICLE_REPOSITORY, useClass: VehicleDB },
      { provide: USER_REPOSITORY, useClass: UserDB },
      { provide: MAP_SEARCH_REPOSITORY, useClass: MapSearchAPI },
      {provide: ROUTE_REPOSITORY, useClass: RouteDB},
      {provide: ELECTRICITY_PRICE_REPOSITORY, useClass: ElectricityPriceCache},
      {provide: ELECTRICITY_PRICE_SOURCE, useClass: ElectricityPriceAPI},
      {provide: FUEL_PRICE_REPOSITORY, useClass: FuelPriceCache},
      {provide: FUEL_PRICE_SOURCE, useClass: FuelPriceAPI},
      {provide: PREFERENCE_REPOSITORY, useClass: PreferenceDB},
  ]
};
