import {TestBed} from '@angular/core/testing';
import {appConfig} from '../../app.config';
import {geohashForLocation} from 'geofire-common';
import {Auth} from '@angular/fire/auth';
import {POI_TEST_DATA, ROUTE_TEST_DATA, USER_TEST_DATA, VEHICLE_TEST_DATA} from '../test-data';
import {USER_REPOSITORY} from '../../services/User/UserRepository';
import {UserService} from '../../services/User/user.service';
import {UserDB} from '../../services/User/UserDB';
import {VEHICLE_REPOSITORY} from '../../services/Vehicle/VehicleRepository';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {VehicleDB} from '../../services/Vehicle/VehicleDB';
import {POI_REPOSITORY} from '../../services/POI/POIRepository';
import {POIDB} from '../../services/POI/POIDB';
import {POIService} from '../../services/POI/poi.service';
import {MAP_SEARCH_REPOSITORY} from '../../services/map-search-service/MapSearchRepository';
import {MapSearchAPI} from '../../services/map-search-service/MapSearchAPI';
import {MapSearchService} from '../../services/map-search-service/map-search.service';
import {PREFERENCIA, RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {RouteService} from '../../services/Route/route.service';
import {ROUTE_REPOSITORY} from '../../services/Route/RouteRepository';
import {RouteDB} from '../../services/Route/RouteDB';
import {FUEL_TYPE} from '../../data/VehicleModel';
import {WrongParamsError} from '../../errors/WrongParamsError';
import {ImpossibleRouteError} from '../../errors/Route/ImpossibleRouteError';
import {RouteAlreadyExistsError} from '../../errors/Route/RouteAlreadyExistsError';
import {RouteResultModel} from '../../data/RouteResultModel';
import {InvalidDataError} from '../../errors/InvalidDataError';
import {MissingRouteError} from '../../errors/Route/MissingRouteError';
import {
    ELECTRICITY_PRICE_REPOSITORY,
    ELECTRICITY_PRICE_SOURCE
} from '../../services/electricity-price-service/ElectricityPriceRepository';
import {ElectricityPriceCache} from '../../services/electricity-price-service/ElectricityPriceCache';
import {ElectricityPriceAPI} from '../../services/electricity-price-service/ElectricityPriceAPI';
import {FUEL_PRICE_REPOSITORY, FUEL_PRICE_SOURCE} from '../../services/fuel-price-service/FuelPriceRepository';
import {FuelPriceCache} from '../../services/fuel-price-service/FuelPriceCache';
import {FuelPriceAPI} from '../../services/fuel-price-service/FuelPriceAPI';

// Todos los tests dentro de este bloque usan un mayor timeout, pues son llamadas API más pesadas
describe('Pruebas de aceptación sobre rutas', () => {
    let userService: UserService;
    let poiService: POIService;
    let mapSearchService: MapSearchService;
    let vehicleService: VehicleService;
    let routeService: RouteService;
    let auth: Auth;

    // Resultado de la API para la ruta "A-B-FordFiesta" (evita llamadas innecesarias)
    let rutaABCBuscada: RouteResultModel;

    // Datos de prueba
    const datosRamon = USER_TEST_DATA[0];

    const datosPoiA = POI_TEST_DATA[0];
    const datosPoiB = POI_TEST_DATA[1];

    const datosFord = VEHICLE_TEST_DATA[0];

    // Geohash en América. Sirve para crear rutas imposibles.
    const geohashAmerica = geohashForLocation([12.266670, -68.333330], 7);

    const rutaC = ROUTE_TEST_DATA[0];
    const rutaP = ROUTE_TEST_DATA[1];

    beforeAll(async () => {
        await TestBed.configureTestingModule({
            providers: [
                UserService,
                POIService,
                MapSearchService,
                VehicleService,
                RouteService,
                {provide: USER_REPOSITORY, useClass: UserDB},
                {provide: POI_REPOSITORY, useClass: POIDB},
                {provide: MAP_SEARCH_REPOSITORY, useClass: MapSearchAPI},
                {provide: VEHICLE_REPOSITORY, useClass: VehicleDB},
                {provide: ROUTE_REPOSITORY, useClass: RouteDB},
                {provide: ELECTRICITY_PRICE_REPOSITORY, useClass: ElectricityPriceCache},
                {provide: ELECTRICITY_PRICE_SOURCE, useClass: ElectricityPriceAPI},
                {provide: FUEL_PRICE_REPOSITORY, useClass: FuelPriceCache},
                {provide: FUEL_PRICE_SOURCE, useClass: FuelPriceAPI},
                appConfig.providers],
            teardown: {destroyAfterEach: false}
        }).compileComponents();

        // Inyección de servicios
        userService = TestBed.inject(UserService);
        vehicleService = TestBed.inject(VehicleService);
        poiService = TestBed.inject(POIService);
        routeService = TestBed.inject(RouteService);
        mapSearchService = TestBed.inject(MapSearchService);
        auth = TestBed.inject(Auth);

        // Iniciar sesión
        await userService.login(datosRamon.email, datosRamon.pwd);

        // Borrar todas las rutas del usuario (si hubiere)
        await routeService.clear();

        // Registrar Vehículo "Ford Fiesta"
        try {
            await vehicleService.createVehicle(datosFord);
        } catch (e) {
            console.info("Error al crear vehículo: " + e);
        }

        // Registrar POI A y POI B usando POIService
        try {
            await poiService.createPOI(datosPoiA);
        } catch (e) {
            console.info("Error al crear POI A: " + e);
        }

        try {
            await poiService.createPOI(datosPoiB);
        } catch (e) {
            console.error("Error al crear POI B: " + e);
        }

        // Resultado de la API para la ruta "A-B-Ford Fiesta" (evita llamadas innecesarias)
        rutaABCBuscada = await mapSearchService.searchRoute(rutaC.geohash_origen, rutaC.geohash_destino,
            rutaC.transporte, rutaC.preferencia);
    });

    afterAll(async () => {
        // Borrar POI B de la BD
        // Evitamos borrar POI A y Transporte Fiesta debido a que son usados en otros test
        try {
            await poiService.deletePOI(datosPoiB.geohash);
        } catch (e) {
            console.error("Error al borrar POI B: " + e);
        }

        // Jasmine no garantiza el orden de ejecución entre archivos .spec. Limpiamos auth
        try {
            if (auth.currentUser) await userService.logout();
            // Si currentUser sigue siendo true, no se ha cerrado correctamente la sesión
            if (auth.currentUser) console.error(
                'Fallo al cerrar sesión al finalizar los tests de aceptación de rutas.'
            );
            else console.info(
                    'El cierre de sesión funcionó correctamente al finalizar los tests de aceptación de rutas.'
            );
        } catch (error) {
            console.error(error);
        }
    });

    // --- HU401: Obtener y mostrar una ruta ---

    describe('HU401: Obtener y mostrar una ruta entre dos puntos', () => {

        it('HU401-EV01. Obtener y mostrar una ruta entre dos puntos con un vehículo registrado.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados→ ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide una ruta en vehículo, seleccionando el POI "A" como origen y el
            // POI "B" como destino, con el vehículo "Ford Fiesta" (ruta "A-B").
            const datosRutaCalculada = await mapSearchService.searchRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte,
                rutaC.preferencia,
            );

            // THEN
            // No se lanza ningún error.
            // El tiempo y distancia calculados superan un umbral.
            if (rutaC.tiempo != null) {
                expect(datosRutaCalculada.tiempo).toBeGreaterThanOrEqual(rutaC.tiempo);
            }
            if (rutaC.distancia != null) {
                expect(datosRutaCalculada.distancia).toBeGreaterThanOrEqual(rutaC.distancia);
            }
        }, 30000);

        it('HU401-EI03. Obtener una ruta entre dos puntos sin indicar el medio de transporte.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados vacía. (Nota: el sistema tiene vehículos, pero el test simula la selección vacía)
            // 3. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide una ruta en vehículo, seleccionando "A" como origen y "B" como
            // destino (ruta "A-B"), sin indicar el medio de transporte.
            await expectAsync(mapSearchService.searchRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                undefined as any,
                rutaC.preferencia
            )).toBeRejectedWith(new WrongParamsError('ruta'));

            // THEN
            // Se lanza el error WrongRouteParamsError.
        }, 30000);

        it('HU401-EI06. Obtener una ruta imposible entre dos puntos.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados → ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.

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
        }, 30000);
    });

    // --- HU402: Coste de una ruta en vehículo (precio en €) ---

    xdescribe('HU402: Conocer coste de ruta en coche (combustible)', () => {

        it('HU402-EV01. Obtener coste (precio) asociado a una ruta registrada en vehículo.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados→ ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.
            // 4. El usuario ha seleccionado la ruta "A-B" en vehículo.
            const foundRoute = await mapSearchService.searchRoute(
                rutaC.geohash_origen, rutaC.geohash_destino, rutaC.transporte, rutaC.preferencia
            );

            // WHEN
            // El usuario pide el coste (precio) de la ruta "A-B".
            const coste = await routeService.getRouteCost(foundRoute, rutaC.transporte,
                datosFord.consumoMedio, datosFord.tipoCombustible as FUEL_TYPE);

            // THEN
            // No se lanza ningún error. Se devuelve el coste (en €) de la ruta (superior a 0).
            expect(coste.cost).toBeGreaterThan(0);
            expect(coste.unit).toEqual('€');
        }, 30000);

        it('HU402-EI03. Obtener coste (precio) asociado a una ruta inválida.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados→ ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide el coste (precio) de una ruta inválida.
            const falseResult = new RouteResultModel(-1, -1, undefined as any);

            await expectAsync(routeService.getRouteCost(falseResult, TIPO_TRANSPORTE.VEHICULO,
                datosFord.consumoMedio, datosFord.tipoCombustible as FUEL_TYPE ))
                .toBeRejectedWith(new InvalidDataError());

            // THEN
            // Se lanza el error MissingRouteError.
        }, 30000);
    });

    // --- HU403: Coste de una ruta a pie/bici (kCal) ---

    describe('HU403: Conocer coste de ruta a pie (calorías)', () => {

        it('HU403-EV01. Obtener coste (kCal) asociado a una ruta a pie.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de rutas registradas vacía.
            // 3. El usuario ha seleccionado la ruta "A-B" a pie.

            // Buscamos ruta a pie
            const foundRoute: RouteResultModel = await mapSearchService.searchRoute(
                rutaP.geohash_origen, rutaP.geohash_destino, rutaP.transporte, rutaP.preferencia
            );

            // WHEN
            // El usuario pide el coste (en kCal) de la ruta "A-B". Se asumen 200 kCal/h.
            const coste = await routeService.getRouteCost(foundRoute, rutaP.transporte);

            // THEN
            // No se lanza ningún error. Se devuelve el coste (en kCal) de la ruta (superior a 0).
            expect(coste.cost).toBeGreaterThan(0);
            expect(coste.unit).toEqual('kCal');
        }, 30000);

        it('HU403-EI03. Obtener coste (kCal) asociado a una ruta inválida a pie.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide el coste (kCal) de una ruta inválida.
            const falseResult = new RouteResultModel(-1, -1, undefined as any);

            await expectAsync(routeService.getRouteCost(falseResult, TIPO_TRANSPORTE.A_PIE))
                .toBeRejectedWith(new InvalidDataError());

            // THEN
            // Se lanza el error InvalidDataError.
        }, 30000);
    });

    // --- HU404 - HU406: Optimización de rutas ---

    describe('HU404: Obtener ruta más corta', () => {

        it('HU404-EV01. Obtener ruta más corta entre dos puntos con vehículo registrado.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados→ ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide una ruta en vehículo desde el POI "A" al "B"
            // con el vehículo "Ford Fiesta" y el tipo "más corta".
            const ruta = await mapSearchService.searchRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte,
                PREFERENCIA.CORTA
            );

            // THEN
            // No se lanza ningún error. Se devuelve la ruta correspondiente.
            expect(ruta).toBeDefined();
            // ¿por qué Less? Porque al ser la más corta, es menos distancia que la ruta "recomendada" (coincide con rápida)
            if (rutaC.distancia != null) {
                expect(ruta.distancia).toBeLessThanOrEqual(rutaC.distancia);
            }
        }, 30000);

        it('HU404-EI07. Obtener ruta más corta entre dos puntos con vehículo cuando la ruta no es posible.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados → ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide una ruta en vehículo desde el POI "A" a las coordenadas
            // "12.266670, -68.333330" (en América) con el vehículo "Ford Fiesta" y el tipo "más corta".
            await expectAsync(mapSearchService.searchRoute(
                rutaC.geohash_origen,
                geohashAmerica,
                rutaC.transporte,
                PREFERENCIA.CORTA
            )).toBeRejectedWith(new ImpossibleRouteError());

            // THEN
            // Se lanza el error ImpossibleRouteError.
        }, 30000);
    });

    describe('HU405: Obtener ruta más rápida/económica', () => {

        it('HU405-EV01. Obtener ruta más rápida/económica entre dos puntos con vehículo registrado.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados→ ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide una ruta en vehículo desde el POI "A" al "B"
            // con el vehículo "Ford Fiesta" y el tipo "más rápida".
            const ruta = await mapSearchService.searchRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte,
                PREFERENCIA.RAPIDA
            );

            // THEN
            // No se lanza ningún error. Se devuelve la ruta correspondiente.
            expect(ruta).toBeDefined();
            if (rutaC.tiempo != null) {
                expect(ruta.tiempo).toBeGreaterThanOrEqual(rutaC.tiempo);
            }
        }, 30000);

        it('HU405-EI07. Obtener ruta más rápida entre dos puntos con vehículo cuando la ruta no es posible.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados → ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide una ruta en vehículo desde el POI "A" a las coordenadas
            // "12.266670, -68.333330" (en América) con el vehículo "Ford Fiesta" y el tipo "más rápida".
            await expectAsync(mapSearchService.searchRoute(
                rutaC.geohash_origen,
                geohashAmerica,
                rutaC.transporte,
                rutaC.preferencia
            )).toBeRejectedWith(new ImpossibleRouteError());

            // THEN
            // Se lanza el error ImpossibleRouteError.
        }, 30000);
    });


    // --- HU407: Guardar Ruta ---

    describe('HU407: Guardar una ruta', () => {
        it('HU407-EV01. Guardar una ruta nueva.', async () => {
            // GIVEN
            // El usuario ha buscado la ruta más corta entre "A" y "B" utilizando el vehículo "Ford Fiesta".
            // (hecho previamente, al inicio de los tests)

            // WHEN
            // El usuario decide guardar la ruta que ha buscado.
            const rutaGuardada = await routeService.createRoute(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia, rutaABCBuscada, rutaC.matricula);
            try {
                // THEN
                // No se lanza ningún error.
                // Se guarda la ruta y la lista de rutas registradas pasa a ser ["A-B"]
                expect(rutaGuardada).toBeDefined();
                expect(rutaGuardada).toEqual(jasmine.objectContaining({
                    geohash_origen: rutaC.geohash_origen,
                    geohash_destino: rutaC.geohash_destino,
                    alias: rutaC.alias,
                    transporte: rutaC.transporte,
                    preferencia: rutaC.preferencia,
                    distancia: jasmine.any(Number),
                    tiempo: jasmine.any(Number),
                    pinned: false,
                    matricula: rutaC.matricula,
                }));
            }
            finally {
                // Cleanup
                await routeService.deleteRoute(rutaC.geohash_origen, rutaC.geohash_destino, rutaC.transporte);
            }
        }, 30000);

        it('HU407-EI08. Guardar una ruta idéntica a una ya guardada.', async () => {
            // GIVEN
            // El usuario ha guardado la ruta más corta entre "A" y "B" utilizando el vehículo "Ford Fiesta".
            await routeService.createRoute(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia, rutaABCBuscada, rutaC.matricula);

            try {
                // WHEN
                // El usuario intenta guardar una ruta idéntica.
                await expectAsync(routeService.createRoute(rutaC.geohash_origen, rutaC.geohash_destino,
                    rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia, rutaABCBuscada, rutaC.matricula))
                    .toBeRejectedWith(new RouteAlreadyExistsError());
                // THEN
                // Se lanza el error RouteAlreadyExistsError.
            }
            finally {
                // Cleanup
                await routeService.deleteRoute(rutaC.geohash_origen, rutaC.geohash_destino, rutaC.transporte);
            }
        }, 30000);
    });

    // --- HU408: Listar Rutas ---

    describe('HU408: Consultar listado de rutas', () => {

        it('HU408-EV01. Consultar el listado vacío de rutas.', async () => {
            // GIVEN
            // Lista de rutas registradas vacía.

            // WHEN
            // El usuario consulta su lista de rutas registradas.
            const list = await routeService.getRouteList();

            // THEN
            // No se lanza ningún error. No hay rutas registradas.
            expect(list.length).toBe(0);
        },30000);

        it('HU408-EV02. Consultar el listado no vacío de rutas.', async () => {
            // GIVEN
            // Lista de rutas registradas → ["A-B"].
            await routeService.createRoute(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia, rutaABCBuscada, rutaC.matricula)

            // WHEN
            // El usuario consulta su lista de rutas registradas.
            try{
                const list = await routeService.getRouteList();

                // THEN
                // No se lanza ningún error. Hay al menos una ruta registrada.
                expect(list.length).toBeGreaterThanOrEqual(1);
            }
            finally {
                // Cleanup
                await routeService.deleteRoute(rutaC.geohash_origen, rutaC.geohash_destino, rutaC.transporte);
            }
        },30000);
    });

    // --- HU409: Consultar Ruta ---

    describe('HU409: Consultar ruta guardada', () => {

        it('HU409-EV01. Consultar información de una ruta registrada.', async () => {
            // GIVEN
            // Lista de rutas registradas → ["A-B"].
            await routeService.createRoute(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia, rutaABCBuscada, rutaC.matricula)

            // WHEN
            // El usuario consulta los datos de la ruta "A-B".
            try {
                const ruta = await routeService.readRoute(
                    rutaC.geohash_origen,
                    rutaC.geohash_destino,
                    rutaC.transporte
                );

                // THEN
                // No se lanza ningún error. Se muestran los datos de la ruta.
                expect(ruta).toBeDefined();
                expect(ruta).toEqual(jasmine.objectContaining({
                    geohash_origen: rutaC.geohash_origen,
                    geohash_destino: rutaC.geohash_destino,
                    alias: rutaC.alias,
                    transporte: rutaC.transporte,
                    preferencia: rutaC.preferencia,
                    distancia: jasmine.any(Number),
                    tiempo: jasmine.any(Number),
                    pinned: false,
                    matricula: rutaC.matricula,
                }));
            } finally {
                // Cleanup
                await routeService.deleteRoute(rutaC.geohash_origen, rutaC.geohash_destino, rutaC.transporte);
            }
        },30000);

        it('HU409-EI03. Consultar información de una ruta no registrada.', async () => {
            // GIVEN
            // Lista de rutas registradas vacía.

            // WHEN
            // El usuario consulta los datos de la ruta "A-B".
            await expectAsync(routeService.readRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte,
            )).toBeRejectedWith(new MissingRouteError());

            // THEN
            // Se lanza el error MissingRouteError.
        },30000);
    });

    // --- HU410: Eliminar Ruta ---

    describe('HU410: Eliminar una ruta guardada', () => {

        it('HU410-EV01. Eliminar una ruta registrada.', async () => {
            // GIVEN
            // Lista de rutas registradas ["A-B"].
            await routeService.createRoute(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia, rutaABCBuscada, rutaC.matricula);

            // WHEN
            // El usuario trata de eliminar la ruta "A-B".
            const resultado = await routeService.deleteRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte
            );

            // THEN
            // No se lanza ningún error. Se elimina la ruta.
            expect(resultado).toBeTrue();

            // const list = await mapSearchService.getRouteList();
            // expect(list.length).toBe(0);
        }, 30000);

        it('HU410-EI03. Eliminar una ruta no registrada.', async () => {
            // GIVEN
            // Lista de rutas registradas vacía.

            // WHEN
            // El usuario trata de eliminar la ruta "A-B".
            await expectAsync(routeService.deleteRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte,
            )).toBeRejectedWith(new MissingRouteError());

            // THEN
            // Se lanza el error MissingRouteError.
        }, 30000);
    });

    // --- HU411: Modificar Ruta ---

    describe('HU411: Modificar una ruta guardada', () => {

        it('HU411-EV01. Modificar el modo de transporte de una ruta', async () => {
            // GIVEN
            // Lista de rutas registradas → ["A-B"].
            await routeService.createRoute(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia, rutaABCBuscada, rutaC.matricula)

            // WHEN
            // El usuario consulta los datos de la ruta "A-B" y modifica el modo de
            // transporte a "A pie". Se asume que una persona a pie camina a 4 km/h.
            try{
                const rutaModificada = await routeService.updateRoute(
                    rutaC.geohash_origen,
                    rutaC.geohash_destino,
                    rutaC.transporte,
                    {transporte: rutaP.transporte},
                );

                // THEN
                // No se lanza ningún error. El transporte de "A-B" se modifica a "A pie".
                expect(rutaModificada.transporte).toBe(rutaP.transporte);
                // Se recalcula la ruta. Ahora debería tardar más que en coche.
                expect(rutaModificada.tiempo).toBeGreaterThan(rutaC.tiempo!);
            } finally {
                // Cleanup
                await routeService.deleteRoute(rutaC.geohash_origen, rutaC.geohash_destino, rutaC.transporte);
            }
        },30000);

        it('HU411-EI03. Modificar una ruta no registrada', async () => {
            // GIVEN
            // Lista de rutas registradas vacía.

            // WHEN
            // El usuario intenta modificar el modo de transporte de la ruta "A-B" a "A pie".
            await expectAsync(routeService.updateRoute(rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte,
                {transporte: rutaP.transporte}
            )).toBeRejectedWith(new MissingRouteError());

            // THEN
            // Se lanza el error MissingRouteError.
        },30000);
    });

    describe('HU503: Fijar una ruta', () => {

        it('HU503-EV01: Fijar una ruta registrada', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de rutas registradas → ["A-B (a pie)", "A-B (en coche)"].

            // Se registra la ruta "A-B" en coche.
            const rutaCreadaCoche = await routeService.createRoute(rutaC.geohash_origen,
                rutaC.geohash_destino, rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino,
                rutaC.preferencia, rutaABCBuscada, rutaC.matricula);

            // Se registra la ruta "A-B" a pie.
            const rutaBuscada = await mapSearchService.searchRoute(rutaP.geohash_origen,
                rutaP.geohash_destino, rutaP.transporte, rutaP.preferencia);
            await routeService.createRoute(rutaP.geohash_origen,
                rutaP.geohash_destino, rutaP.alias, rutaP.transporte,
                rutaC.nombre_origen, rutaC.nombre_destino, rutaP.preferencia, rutaBuscada);

            // No hay ninguna ruta fijada.

            try {
                // WHEN
                // El usuario trata de fijar la ruta "A-B (en coche)".
                const poiFijado = await routeService.pinRoute(rutaCreadaCoche);

                // THEN
                // La ruta "A-B (en coche)" pasa a estar fijada (pinned = true)
                expect(poiFijado).toBeTrue();

                // El orden ahora es ["A-B (en coche)", "A-B (a pie)"]
                const list = await routeService.getRouteList();
                expect(list.at(0)?.transporte).toEqual(TIPO_TRANSPORTE.VEHICULO);
            }
            finally {
                // CLEANUP
                // Borrar ambas rutas
                await routeService.deleteRoute(rutaC.geohash_origen, rutaC.geohash_destino, rutaC.transporte);
                await routeService.deleteRoute(rutaP.geohash_origen, rutaP.geohash_destino, rutaP.transporte);
            }

        });

        it('HU503-EI02: Fijar una ruta no registrada', async () => {
            // GIVEN
            // Lista de rutas registradas vacía.

            // WHEN
            // El usuario trata de fijar la ruta "A-B".
            await expectAsync(routeService.pinRoute(new RouteModel(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.alias,
                rutaC.transporte,
                rutaC.nombre_origen,
                rutaC.nombre_destino,
                rutaC.preferencia,
                rutaC.distancia,
                rutaC.tiempo,
                ))).toBeRejectedWith(new MissingRouteError());

            // THEN
            // Se lanza el error MissingPOIError
        });
    });

    describe('HU606: Guardar datos de rutas', () => {

        it('HU606-EV01: Comprobación de datos guardados de rutas ante cierre involuntario', async () => {
            // GIVEN
            // El usuario "ramon" está registrado y ha iniciado sesión
            // Lista de rutas registradas → ["A-B"].
            const rutaCreada = await routeService.createRoute(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte,  rutaC.nombre_origen, rutaC.nombre_destino,
                rutaC.preferencia, rutaABCBuscada, rutaC.matricula);
            const listaRutasAntes: RouteModel[] = [rutaCreada];

            // Se cierra la sesión involuntariamente
            await userService.logout();

            // WHEN
            // El usuario "ramon" vuelve a iniciar sesión
            await userService.login(datosRamon.email, datosRamon.pwd);

            // THEN
            // Los datos de rutas de la BD son los mismos que los introducidos previamente
            const listaRutas = await routeService.getRouteList();
            expect(listaRutas).toEqual(listaRutasAntes);

            // CLEANUP
            await routeService.deleteRoute(rutaC.geohash_origen, rutaC.geohash_destino, rutaC.transporte);
        });
    });
});
