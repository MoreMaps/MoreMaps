/// <reference types="jasmine"/>
import {UserRepository} from '../../services/User/UserRepository';
import {POIRepository} from '../../services/POI/POIRepository';
import {VehicleRepository} from '../../services/Vehicle/VehicleRepository';
import {RouteRepository} from '../../services/Route/RouteRepository';
import {MapSearchRepository} from '../../services/map-search-service/MapSearchRepository';
import {FuelPriceRepository} from '../../services/fuel-price-service/FuelPriceRepository';
import {ElectricityPriceRepository} from '../../services/electricity-price-service/ElectricityPriceRepository';

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
            return jasmine.createSpyObj<ElectricityPriceRepository>('ElectrictyPriceRepository', [
                'getPrice',
            ]);
        }
        default:
            return null;
    }
}
