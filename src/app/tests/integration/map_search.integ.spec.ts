import {TestBed} from '@angular/core/testing'
import {POI_TEST_DATA, ROUTE_TEST_DATA} from '../test-data';
import {POIModel} from '../../data/POIModel';
import {LongitudeRangeError} from '../../errors/POI/LongitudeRangeError';
import {PlaceNameNotFoundError} from '../../errors/POI/PlaceNameNotFoundError';
import {coords, MapSearchService} from '../../services/map/map-search-service/map-search.service';
import {MAP_SEARCH_REPOSITORY, MapSearchRepository} from '../../services/map/map-search-service/MapSearchRepository';
import {POISearchModel} from '../../data/POISearchModel';
import {createMockRepository} from '../test-helpers';
import {RouteResultModel} from '../../data/RouteResultModel';
import {RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {GeohashDecoder} from '../../utils/geohashDecoder';
import {ImpossibleRouteError} from '../../errors/Route/ImpossibleRouteError';
import {geohashForLocation} from 'geofire-common';
import {CoordsNotFoundError} from '../../errors/POI/CoordsNotFoundError';
import {WrongParamsError} from '../../errors/WrongParamsError';
import {InvalidDataError} from '../../errors/InvalidDataError';
import {LatitudeRangeError} from '../../errors/POI/LatitudeRangeError';


// Pruebas de integración sobre el servicio de búsqueda de rutas
// HU201, HU202, HU401, HU404-406
describe('Pruebas de integración sobre el servicio de búsqueda de rutas', () => {
    // SUT
    let mapSearchService: MapSearchService;

    // Mock de acceso a la API
    let mockMapSearchRepository: jasmine.SpyObj<MapSearchRepository>;

    // Datos de prueba
    const poiB: POIModel = POI_TEST_DATA[1];
    const rutaC: RouteModel = ROUTE_TEST_DATA[0];
    const geohashAmerica = geohashForLocation([12.266670, -68.333330], 7);

    beforeEach(async () => {
        mockMapSearchRepository = createMockRepository('mapSearch');
        await TestBed.configureTestingModule({
            providers: [
                MapSearchService,
                {provide: MAP_SEARCH_REPOSITORY, useValue: mockMapSearchRepository},
            ],
        }).compileComponents();

        // Inyección del servicio
        mapSearchService = TestBed.inject(MapSearchService);
    });


    // Las pruebas empiezan a partir de AQUÍ

    describe('HU201: Buscar POI por coordenadas', () => {

        it('HU201-EV01: Buscar POI por coordenadas', async () => {
            // GIVEN
            const mockSearchPOI: POISearchModel = new POISearchModel(poiB.lat, poiB.lon, poiB.placeName);
            mockMapSearchRepository.searchPOIByCoords.and.resolveTo([mockSearchPOI]);

            // WHEN
            // Se busca el POI "B" mediante sus coordenadas
            const found = await mapSearchService.searchPOIByCoords(poiB.lat, poiB.lon);

            // THEN
            // Se llama a la función "searchPOIByCoords" con los parámetros pertinentes
            expect(mockMapSearchRepository.searchPOIByCoords).toHaveBeenCalledWith(poiB.lat, poiB.lon, 1);

            // El POI encontrado es el esperado
            expect(found).toEqual(mockSearchPOI);
        });

        it('HU201-EI01: Buscar un POI por longitud no válida', async () => {
            // GIVEN

            // WHEN
            // Se intenta dar de alta un POI de latitud 89 y longitud 999 (inválida)
            await expectAsync(mapSearchService.searchPOIByCoords(89, 999))
                .toBeRejectedWith(new LongitudeRangeError());
            // THEN
            // Se lanza el error LongitudeRangeError

            // No se llama a la función "searchPOIByCoords" de la API
            expect(mockMapSearchRepository.searchPOIByCoords).not.toHaveBeenCalled();
        });

        it('HU201-EI02: Buscar un POI por latitud no válida', async () => {
            // GIVEN

            // WHEN
            // Se intenta dar de alta un POI de latitud 89 y longitud 999 (inválida)
            await expectAsync(mapSearchService.searchPOIByCoords(999, 179))
                .toBeRejectedWith(new LatitudeRangeError());
            // THEN
            // Se lanza el error LongitudeRangeError

            // No se llama a la función "searchPOIByCoords" de la API
            expect(mockMapSearchRepository.searchPOIByCoords).not.toHaveBeenCalled();
        });

        it('HU201-EI03: Buscar un POI inexistente', async () => {
            // GIVEN
            // No hay ningún POI cercano
            mockMapSearchRepository.searchPOIByCoords.and.resolveTo([]);

            // WHEN
            // Se intenta dar de alta un POI de latitud 89 y longitud 179
            await expectAsync(mapSearchService.searchPOIByCoords(0, 0))
                .toBeRejectedWith(new CoordsNotFoundError(0, 0));
            // THEN
            // Se lanza el error CoordsNotFoundError

            // Se llama a la función "searchPOIByCoords" de la API con los parámetros pertinentes
            expect(mockMapSearchRepository.searchPOIByCoords).toHaveBeenCalledWith(0, 0, 1);
        });
    });


    describe('HU202: Buscar POI por topónimo', () => {

        it('HU202-EV01: Buscar un POI por topónimo', async () => {
            // GIVEN
            const mockSearchPOI: POISearchModel = new POISearchModel(poiB.lat, poiB.lon, poiB.placeName);
            mockMapSearchRepository.searchPOIByPlaceName.and.resolveTo([mockSearchPOI]);

            // WHEN
            // Se busca el POI "B" mediante sus coordenadas
            const found = await mapSearchService.searchPOIByPlaceName(poiB.placeName);

            // THEN
            // Se llama a la función "searchPOIByPlaceName" con los parámetros pertinentes
            expect(mockMapSearchRepository.searchPOIByPlaceName).toHaveBeenCalledWith(poiB.placeName, 10);

            // El primer POI encontrado es el esperado
            expect(found[0]).toEqual(mockSearchPOI);
        });

        it('HU202-EI01: Buscar un POI por topónimo que no corresponde a ningún sitio', async () => {
            // GIVEN
            mockMapSearchRepository.searchPOIByPlaceName.and.resolveTo([]);

            // WHEN
            // Se intenta dar de alta un POI buscando el lugar "lkasdñfjalksdjf" (que no existe)
            const toponimoInexistente = "lkasdñfjalksdjf";
            await expectAsync(mapSearchService.searchPOIByPlaceName(toponimoInexistente))
                .toBeRejectedWith(new PlaceNameNotFoundError(toponimoInexistente));
            // THEN
            // Se lanza el error PlaceNameNotFoundError

            // Se llama a la función "searchPOIByPlaceName" con los parámetros pertinentes
            expect(mockMapSearchRepository.searchPOIByPlaceName).toHaveBeenCalledWith(toponimoInexistente, 10);
        });
    });

    // Corresponde a más de una HU, puesto que utilizan la misma función
    describe('HU401, HU404-406: Obtener una ruta entre dos puntos según preferencia', () => {

        it('EV01: Obtener ruta válida', async () => {
            // GIVEN
            const mockRoute: RouteResultModel = new RouteResultModel(rutaC.tiempo, rutaC.distancia, undefined as any);
            const coordsOrigen: coords = GeohashDecoder.decodeGeohash(rutaC.geohash_origen);
            const coordsDestino: coords = GeohashDecoder.decodeGeohash(rutaC.geohash_destino);
            mockMapSearchRepository.searchRoute.and.resolveTo(mockRoute);

            // WHEN
            // Se busca la ruta "A-B-FordFiesta"
            const found = await mapSearchService.searchRoute(rutaC.geohash_origen, rutaC.geohash_destino, rutaC.transporte, rutaC.preferencia);

            // THEN
            // Se llama a la función "searchRoute" con los parámetros pertinentes
            expect(mockMapSearchRepository.searchRoute).toHaveBeenCalledWith(coordsOrigen, coordsDestino, rutaC.transporte, rutaC.preferencia);

            // La ruta encontrada coincide con la esperada
            expect(found).toEqual(mockRoute);
        });

        it('EI01: Obtener una ruta sin especificar parámetros', async () => {
            // GIVEN

            // WHEN
            // El usuario pide la ruta "A-B", pero no especifica el tipo de transporte.
            await expectAsync(mapSearchService.searchRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                undefined as unknown as TIPO_TRANSPORTE,
                rutaC.preferencia,
            )).toBeRejectedWith(new WrongParamsError('ruta'));
            // THEN
            // Se lanza el error ImpossibleRouteError.

            expect()
        });

        it('EI02: Obtener una ruta imposible entre dos puntos.', async () => {
            // GIVEN
            mockMapSearchRepository.searchRoute.and.resolveTo(undefined);
            const coordsOrigen: coords = GeohashDecoder.decodeGeohash(rutaC.geohash_origen);
            const coordsDestino: coords = GeohashDecoder.decodeGeohash(geohashAmerica);

            // WHEN
            // El usuario pide una ruta en vehículo, seleccionando el POI "A" como origen y las
            // coordenadas "12.266670, -68.333330" (en América) como destino, con el vehículo "Ford Fiesta".
            await expectAsync(mapSearchService.searchRoute(
                rutaC.geohash_origen,
                geohashAmerica,
                rutaC.transporte,
                rutaC.preferencia,
            )).toBeRejectedWith(new ImpossibleRouteError());
            // THEN
            // Se lanza el error ImpossibleRouteError.

            expect(mockMapSearchRepository.searchRoute).toHaveBeenCalledWith(coordsOrigen, coordsDestino, rutaC.transporte, rutaC.preferencia);
        });

        it('EI03: Obtener una ruta de coste inválido.', async () => {
            // GIVEN
            const mockRoute: RouteResultModel = new RouteResultModel(-1, rutaC.distancia, undefined as any);
            const coordsOrigen: coords = GeohashDecoder.decodeGeohash(rutaC.geohash_origen);
            const coordsDestino: coords = GeohashDecoder.decodeGeohash(rutaC.geohash_destino);
            mockMapSearchRepository.searchRoute.and.resolveTo(mockRoute);

            // WHEN
            // El usuario pide una ruta de coste nulo.
            await expectAsync(mapSearchService.searchRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte,
                rutaC.preferencia,
            )).toBeRejectedWith(new InvalidDataError());
            // THEN
            // Se lanza el error InvalidDataError.

            // Se llama a la función "searchRoute" con los parámetros pertinentes
            expect(mockMapSearchRepository.searchRoute).toHaveBeenCalledWith(coordsOrigen, coordsDestino, rutaC.transporte, rutaC.preferencia);
        });
    });
});
