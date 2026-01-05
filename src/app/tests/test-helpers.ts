/// <reference types="jasmine"/>
import {UserRepository} from '../services/User/UserRepository';
import {POIRepository} from '../services/POI/POIRepository';
import {VehicleRepository} from '../services/Vehicle/VehicleRepository';
import {RouteRepository} from '../services/Route/RouteRepository';
import {MapSearchRepository} from '../services/map/map-search-service/MapSearchRepository';
import {FuelPriceRepository} from '../services/fuel-price-service/FuelPriceRepository';
import {ElectricityPriceRepository} from '../services/electricity-price-service/ElectricityPriceRepository';
import {FuelPriceService} from '../services/fuel-price-service/fuel-price-service';
import {ElectricityPriceService} from '../services/electricity-price-service/electricity-price-service';
import {MapSearchService} from '../services/map/map-search-service/map-search.service';
import {PreferenceRepository} from '../services/Preferences/PreferenceRepository';

/**
 * Clase para crear objetos espía sobre los repositorios.
 * @param type repositorio que se quiere espiar
 */
export function createMockRepository(type: string): jasmine.SpyObj<any> | null {
    switch (type) {
        case 'user': {
            return jasmine.createSpyObj<UserRepository>('UserRepository', [
                'validateCredentials',
                'logoutUser',
                'createUser',
                'getCurrentUser',
                'deleteAuthUser',
                'userExists',
                'sessionActive',
                'passwordValid',
            ]);
        }
        case 'poi': {
            return jasmine.createSpyObj<POIRepository>('POIRepository', [
                'createPOI',
                'getPOI',
                'updatePOI',
                'deletePOI',
                'getPOIList',
                'clear',
                'pinPOI',
                'poiExists',
            ]);
        }
        case 'vehicle': {
            return jasmine.createSpyObj<VehicleRepository>('VehicleRepository', [
                'createVehicle',
                'getVehicleList',
                'updateVehicle',
                'deleteVehicle',
                'getVehicle',
                'clear',
                'pinVehicle',
                'vehicleExists',
            ]);
        }
        case 'route': {
            return jasmine.createSpyObj<RouteRepository>('RouteRepository', [
                'createRoute',
                'getRoute',
                'updateRoute',
                'getRouteList',
                'deleteRoute',
                'clear',
                'pinRoute',
                'routeExists',
            ]);
        }
        case 'mapSearch': {
            return jasmine.createSpyObj<MapSearchRepository>('MapSearchRepository', [
                'searchPOIByCoords',
                'searchPOIByPlaceName',
                'searchRoute',
            ]);
        }
        case 'fuelPrice': {
            return jasmine.createSpyObj<FuelPriceRepository>('FuelPriceRepository', [
                'getPrice',
                'processStations',
            ]);
        }
        case 'electricityPrice': {
            return jasmine.createSpyObj<ElectricityPriceRepository>('ElectricityPriceRepository', [
                'getPrice',
            ]);
        }
        case 'preference': {
            return jasmine.createSpyObj<PreferenceRepository>('PreferenceRepository', [
                'updatePreferences',
                'getPreferenceList',
            ]);
        }
        case 'fuel': {
            return jasmine.createSpyObj<FuelPriceService>('FuelPriceService', [
                'getPrice'
            ]);
        }
        case 'electricity': {
            return jasmine.createSpyObj<ElectricityPriceService>('ElectricityPriceService', [
                'getPrice',
            ]);
        }
        case 'maps': {
            return jasmine.createSpyObj<MapSearchService>('MapSearchService', [
                'searchRoute',
            ]);
        }
        default:
            return null;
    }
}
