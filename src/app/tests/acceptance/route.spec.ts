import {TestBed} from '@angular/core/testing';
import {appConfig} from '../../app.config';
import {geohashForLocation} from 'geofire-common';
import {Auth} from '@angular/fire/auth';

// Usuarios
import {POI_TEST_DATA, ROUTE_TEST_DATA, USER_TEST_DATA, VEHICLE_TEST_DATA} from '../test-data';
import {USER_REPOSITORY} from '../../services/User/UserRepository';
import {UserService} from '../../services/User/user.service';
import {UserDB} from '../../services/User/UserDB';

// Vehículos
import {VEHICLE_REPOSITORY} from '../../services/Vehicle/VehicleRepository';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {VehicleDB} from '../../services/Vehicle/VehicleDB';

// POI y MapSearch
import {POI_REPOSITORY} from '../../services/POI/POIRepository';
import {POIDB} from '../../services/POI/POIDB';
import {POIService} from '../../services/POI/poi.service';
import {MAP_SEARCH_REPOSITORY} from '../../services/map-search-service/MapSearchRepository';
import {MapSearchAPI} from '../../services/map-search-service/MapSearchAPI';
import {MapSearchService} from '../../services/map-search-service/map-search.service';

// Rutas
import {PREFERENCIA, RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {RouteService} from '../../services/Route/route.service';
import {ROUTE_REPOSITORY} from '../../services/Route/RouteRepository';
import {RouteDB} from '../../services/Route/RouteDB';
import {FUEL_TYPE} from '../../data/VehicleModel';

// Errores
import {WrongParamsError} from '../../errors/WrongParamsError';
import {ImpossibleRouteError} from '../../errors/Route/ImpossibleRouteError';
import {RouteAlreadyExistsError} from '../../errors/Route/RouteAlreadyExistsError';
import {RouteResultModel} from '../../data/RouteResultModel';
import {InvalidDataError} from '../../errors/InvalidDataError';

// Firestore
import {ElectricityPriceService} from '../../services/electricity-price-service/electricity-price-service';
import {
    ELECTRICITY_PRICE_REPOSITORY,
    ELECTRICITY_PRICE_SOURCE
} from '../../services/electricity-price-service/ElectricityPriceRepository';
import {ElectricityPriceCache} from '../../services/electricity-price-service/ElectricityPriceCache';
import {ElectricityPriceAPI} from '../../services/electricity-price-service/ElectricityPriceAPI';
import {FUEL_PRICE_REPOSITORY, FUEL_PRICE_SOURCE} from '../../services/fuel-price-service/FuelPriceRepository';
import {FuelPriceCache} from '../../services/fuel-price-service/FuelPriceCache';
import {FuelPriceAPI} from '../../services/fuel-price-service/FuelPriceAPI';
import {FuelPriceService} from '../../services/fuel-price-service/fuel-price-service';
import {MissingRouteError} from '../../errors/Route/MissingRouteError';

// Todos los tests dentro de este bloque usan un mayor timeout, pues son llamadas API más pesadas
describe('Pruebas sobre rutas', () => {
    let userService: UserService;
    let poiService: POIService;
    let mapSearchService: MapSearchService;
    let vehicleService: VehicleService;
    let routeService: RouteService;
    let auth: Auth;

    // Resultado de la API para la ruta "A-B-Ford Fiesta" (evita llamadas innecesarias)
    let rutaABCBuscada: RouteResultModel;

    // Datos de prueba
    const datosRamon = USER_TEST_DATA[0];

    const datosPoiA = POI_TEST_DATA[0];
    const datosPoiB = POI_TEST_DATA[1];

    const datosFord = VEHICLE_TEST_DATA[0];

    // Geohash en América. Sirve para crear rutas imposibles.
    const geohashAmerica = geohashForLocation([12.266670, -68.333330], 7);

    const datosRutaC = ROUTE_TEST_DATA[0];
    const datosRutaP = ROUTE_TEST_DATA[1];

    beforeAll(async () => {
        await TestBed.configureTestingModule({
            providers: [
                UserService,
                POIService,
                MapSearchService,
                VehicleService,
                RouteService,
                FuelPriceService,
                ElectricityPriceService,
                {provide: USER_REPOSITORY, useClass: UserDB},
                {provide: POI_REPOSITORY, useClass: POIDB},
                {provide: MAP_SEARCH_REPOSITORY, useClass: MapSearchAPI},
                {provide: VEHICLE_REPOSITORY, useClass: VehicleDB},
                {provide: ROUTE_REPOSITORY, useClass: RouteDB},
                { provide: ELECTRICITY_PRICE_REPOSITORY, useClass: ElectricityPriceCache },
                { provide: ELECTRICITY_PRICE_SOURCE, useClass: ElectricityPriceAPI },
                { provide: FUEL_PRICE_REPOSITORY, useClass: FuelPriceCache },
                { provide: FUEL_PRICE_SOURCE, useClass: FuelPriceAPI },
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

        // Registrar Vehículo "Ford Fiesta"
        try {
            await vehicleService.createVehicle(datosFord);
        } catch (e) {
            console.info("Error al crear vehículo: " + e)
        }

        // Registrar POI A y POI B usando POIService
        try {
            await poiService.createPOI(datosPoiA);
        } catch (e) {
            console.info("Error al crear POI A: " + e)
        }

        try {
            await poiService.createPOI(datosPoiB);
        } catch (e) {
            console.error("Error al crear POI B: " + e)
        }

        // Resultado de la API para la ruta "A-B-Ford Fiesta" (evita llamadas innecesarias)
        rutaABCBuscada = await mapSearchService.searchRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.preferencia);
    });

    afterAll(async () => {
        // Borrar POI B de la BD
        // Evitamos borrar POI A y Transporte Fiesta debido a que son usados en otros test
        try {
            await poiService.deletePOI(datosPoiB.geohash);
        } catch (e) {
            console.error("Error al borrar POI B: " + e)
        }

        // Jasmine no garantiza el orden de ejecución entre archivos .spec. Limpiamos auth
        try {
            if (auth.currentUser) await userService.logout();
            if (auth.currentUser) throw new Error('Fallo al hacer logout en afterALl de route.spec.ts.');
            else {
                console.info('Logout en afterAll de route.spec.ts funcionó correctamente.');
            }
        } catch (error) {
            console.error(error);
        }
    });

    // --- HU401: Obtener y mostrar una ruta (Cálculo) ---

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
                datosRutaC.geohash_origen,
                datosRutaC.geohash_destino,
                datosRutaC.transporte,
                datosRutaC.preferencia,
            );

            // THEN
            // Salida esperada: no se lanza ningún error. El sistema muestra en el mapa una
            // ruta entre A y B en vehículo, junto al tiempo estimado y la distancia recorrida.
            // Estado esperado: no se modifica el estado.
            if (datosRutaC.tiempo != null) {
                expect(datosRutaCalculada.tiempo).toBeGreaterThanOrEqual(datosRutaC.tiempo);
            }
            if (datosRutaC.distancia != null) {
                expect(datosRutaCalculada.distancia).toBeGreaterThanOrEqual(datosRutaC.distancia);
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
                datosRutaC.geohash_origen,
                datosRutaC.geohash_destino,
                undefined as any,
                datosRutaC.preferencia
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
            // coordenadas "12.266670, -68.333330" (en América) como destino, con el
            // vehículo "Ford Fiesta".
            await expectAsync(mapSearchService.searchRoute(
                datosRutaC.geohash_origen,
                geohashAmerica,
                datosRutaC.transporte,
                datosRutaC.preferencia,
            )).toBeRejectedWith(new ImpossibleRouteError());

            // THEN
            // Salida esperada: se lanza el error ImpossibleRouteError.
            // Estado esperado: no se modifica el estado.
        }, 30000);
    });

    // --- HU402: Coste en combustible/precio ---

    describe('HU402: Conocer coste de ruta en coche (combustible)', () => {

        it('HU402-EV01. Obtener coste (precio) asociado a una ruta registrada en vehículo.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados→ ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.
            // 4. El usuario ha seleccionado la ruta "A-B" en vehículo.
            const foundRoute = await mapSearchService.searchRoute(
                datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.preferencia
            );

            // WHEN
            // El usuario pide el coste (precio) de la ruta "A-B".
            const coste = await routeService.getRouteCost(foundRoute, datosRutaC.transporte,
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
            const genericGeometry = {
                type: "LineString",
                coordinates: [[0, 0], [0, 0]]
            } as any;
            const falseResult = new RouteResultModel(-1, -1, genericGeometry);

            await expectAsync(routeService.getRouteCost(falseResult, TIPO_TRANSPORTE.VEHICULO,
                datosFord.consumoMedio, datosFord.tipoCombustible as FUEL_TYPE ))
                .toBeRejectedWith(new InvalidDataError());

            // THEN
            // Se lanza el error MissingRouteError.
        }, 30000);
    });

    // --- HU403: Coste en calorías (Pie/Bici) ---

    describe('HU403: Conocer coste de ruta a pie (calorías)', () => {

        it('HU403-EV01. Obtener coste (kCal) asociado a una ruta a pie.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de rutas registradas vacía.
            // 3. El usuario ha seleccionado la ruta "A-B" a pie.

            // Buscamos ruta a pie
            const foundRoute: RouteResultModel = await mapSearchService.searchRoute(
                datosRutaP.geohash_origen, datosRutaP.geohash_destino, datosRutaP.transporte, datosRutaP.preferencia
            );

            // WHEN
            // El usuario pide el coste (en kCal) de la ruta "A-B". Se asumen 75 kCal/km.
            const coste = await routeService.getRouteCost(foundRoute, datosRutaP.transporte);

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
            const genericGeometry = {
                type: "LineString",
                coordinates: [[0, 0], [0, 0]]
            } as any;
            const falseResult = new RouteResultModel(-1, -1, genericGeometry);

            await expectAsync(routeService.getRouteCost(falseResult, TIPO_TRANSPORTE.A_PIE))
                .toBeRejectedWith(new InvalidDataError());

            // THEN
            // Se lanza el error InvalidDataError.
        }, 30000);
    });

    // --- HU404 - HU406: Optimización de rutas ---

    describe('HU404-406: Rutas más económica/corta', () => {

        it('HU404-EV01. Obtener ruta más corta/económica entre dos puntos con vehículo registrado.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados→ ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide una ruta en vehículo desde el POI "A" al "B" con el vehículo
            // "Ford Fiesta" y el tipo "más corta/económica".
            const ruta = await mapSearchService.searchRoute(
                datosRutaC.geohash_origen,
                datosRutaC.geohash_destino,
                datosRutaC.transporte,
                PREFERENCIA.CORTA
            );

            // THEN
            // Salida esperada: no se lanza ningún error. Se devuelve la ruta
            // correspondiente.
            // Estado esperado: no se modifica el estado.
            expect(ruta).toBeDefined();
            // ¿por qué Less? Porque al ser la más corta, es menos distancia que la ruta "recomendada" (coincide con rápida)
            if (datosRutaC.distancia != null) {
                expect(ruta.distancia).toBeLessThanOrEqual(datosRutaC.distancia);
            }
        }, 30000);

        it('HU404-EI07. Obtener ruta más corta/económica entre dos puntos con vehículo cuando la ruta no es posible.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados → ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide una ruta en vehículo desde el POI "A" a las coordenadas
            // "12.266670, -68.333330" (en América) con el vehículo "Ford Fiesta" y el tipo
            // "más corta/económica".
            await expectAsync(mapSearchService.searchRoute(
                datosRutaC.geohash_origen,
                geohashAmerica,
                datosRutaC.transporte,
                PREFERENCIA.CORTA
            )).toBeRejectedWith(new ImpossibleRouteError());

            // THEN
            // Salida esperada: se lanza el error ImpossibleRouteError.
            // Estado esperado: no se modifica el estado.
        }, 30000);
    });

    describe('HU405: Ruta más rápida', () => {

        it('HU405-EV01. Obtener ruta más rápida entre dos puntos con vehículo registrado.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados→ ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide una ruta en vehículo desde el POI "A" al "B" con el vehículo
            // "Ford Fiesta" y el tipo "más rápida".
            const ruta = await mapSearchService.searchRoute(
                datosRutaC.geohash_origen,
                datosRutaC.geohash_destino,
                datosRutaC.transporte,
                PREFERENCIA.RAPIDA
            );

            // THEN
            // Salida esperada: no se lanza ningún error. Se devuelve la ruta correspondiente.
            // Estado esperado: no se modifica el estado.
            expect(ruta).toBeDefined();
            if (datosRutaC.tiempo != null) {
                expect(ruta.tiempo).toBeGreaterThanOrEqual(datosRutaC.tiempo);
            }
        }, 30000);

        it('HU405-EI07. Obtener ruta más rápida/económica entre dos puntos con vehículo cuando la ruta no es posible.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados → ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide una ruta en vehículo desde el POI "A" a las coordenadas
            // "12.266670, -68.333330" (en América) con el vehículo "Ford Fiesta" y el tipo
            // "más rápida".
            await expectAsync(mapSearchService.searchRoute(
                datosRutaC.geohash_origen,
                geohashAmerica,
                datosRutaC.transporte,
                datosRutaC.preferencia
            )).toBeRejectedWith(new ImpossibleRouteError());

            // THEN
            // Salida esperada: se lanza el error ImpossibleRouteError.
            // Estado esperado: no se modifica el estado.
        }, 30000);
    });


    // --- HU407: Guardar Ruta ---

    describe('HU407: Guardar una ruta', () => {
        it('HU407-EV01. Guardar una ruta nueva.', async () => {
            // GIVEN
            // El usuario ha buscado la ruta más corta entre "A" y "B" utilizando el vehículo "Ford Fiesta".

            // WHEN
            // El usuario decide guardar la ruta que ha buscado.
            const rutaGuardada = await routeService.createRoute(datosRutaC.geohash_origen,
                datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.preferencia, rutaABCBuscada, datosRutaC.matricula);
            try {
                // THEN
                // Salida esperada: no se lanza ningún error. Se notifica al usuario del alta y se
                // registra la ruta.
                // Estado esperado: la lista de rutas registradas pasa a ser ["A-B"]
                expect(rutaGuardada).toBeDefined();
                expect(rutaGuardada).toEqual(jasmine.objectContaining({
                    geohash_origen: datosRutaC.geohash_origen,
                    geohash_destino: datosRutaC.geohash_destino,
                    transporte: datosRutaC.transporte,
                    preferencia: datosRutaC.preferencia,
                    matricula: datosRutaC.matricula,
                }));
                // Espera que la diferencia entre tiempos no supere 5 minutos (300 segundos)
                expect(Math.abs(datosRutaC.tiempo!-rutaGuardada.tiempo!)).toBeLessThanOrEqual(300);
                // Espera que la diferencia entre distancias no supere 1.5 km (1500 metros)
                expect(Math.abs(datosRutaC.distancia!-rutaGuardada.distancia!)).toBeLessThanOrEqual(1500);
            }
            finally {
                // Cleanup
                await routeService.deleteRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.matricula);
            }
        }, 30000);

        it('HU407-EI08. Guardar una ruta idéntica a una ya guardada.', async () => {
            // GIVEN
            // El usuario ha guardado la ruta más corta entre "A" y "B" utilizando el vehículo "Ford Fiesta".
            await routeService.createRoute(datosRutaC.geohash_origen,
                datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.preferencia, rutaABCBuscada, datosRutaC.matricula);

            try {
                // WHEN
                // El usuario decide guardar la ruta que ha buscado de nuevo.
                await expectAsync(routeService.createRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino,
                    datosRutaC.transporte, datosRutaC.preferencia, rutaABCBuscada, datosRutaC.matricula))
                    .toBeRejectedWith(new RouteAlreadyExistsError());
                // THEN
                // Salida esperada: se lanza el error RouteAlreadyExistsError.
                // Estado esperado: no se modifica el estado.
            }
            finally {
                // Cleanup
                await routeService.deleteRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.matricula);
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
            // Salida esperada: no se lanza ningún error. Se indica al usuario que no ha
            // dado de alta ninguna ruta y se le sugiere registrar una nueva.
            // Estado esperado: no se modifica el estado.
            expect(list.length).toBe(0);
        },30000);

        it('HU408-EV02. Consultar el listado no vacío de rutas.', async () => {
            // GIVEN
            // Lista de rutas registradas → ["A-B"].
            await routeService.createRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino,
                datosRutaC.transporte, datosRutaC.preferencia, rutaABCBuscada, datosRutaC.matricula)

            // WHEN
            // El usuario consulta su lista de rutas registradas.
            const list = await routeService.getRouteList();

            // THEN
            // Salida esperada: no se lanza ningún error. Se muestra por pantalla el listado
            // de rutas.
            // Estado esperado: no se modifica el estado.
            expect(list.length).toBeGreaterThanOrEqual(1);

            // Cleanup
            await routeService.deleteRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.matricula);
        },30000);
    });

    // --- HU409: Consultar Ruta (Detalle) ---

    describe('HU409: Consultar ruta guardada', () => {

        it('HU409-EV01. Consultar información de una ruta registrada.', async () => {
            // GIVEN
            // Lista de rutas registradas → ["A-B"].
            await routeService.createRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino,
                datosRutaC.transporte, datosRutaC.preferencia, rutaABCBuscada, datosRutaC.matricula)

            // WHEN
            // El usuario consulta los datos de la ruta "A-B".
            const ruta = await routeService.readRoute(
                datosRutaC.geohash_origen,
                datosRutaC.geohash_destino,
                datosRutaC.transporte,
                datosRutaC.preferencia
            );

            // THEN
            // Salida esperada: no se lanza ningún error. Se muestran los datos de la ruta.
            // Estado esperado: no se modifica el estado.
            expect(ruta).toBeDefined();
            expect(ruta.distancia).toBeDefined();

            // Cleanup
            await routeService.deleteRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.matricula);
        },30000);

        it('HU409-EI03. Consultar información de una ruta no registrada.', async () => {
            // GIVEN
            // Lista de rutas registradas vacía.

            // WHEN
            // El usuario consulta los datos de la ruta "A-B".
            await expectAsync(routeService.readRoute(
                datosRutaC.geohash_origen,
                datosRutaC.geohash_destino,
                datosRutaC.transporte,
                datosRutaC.preferencia
            )).toBeRejectedWith(new MissingRouteError());

            // THEN
            // Salida esperada: se lanza el error MissingRouteError.
            // Estado esperado: no se modifica el estado.
        },30000);
    });

    // --- HU410: Eliminar Ruta ---

    describe('HU410: Eliminar una ruta guardada', () => {

        it('HU410-EV01. Eliminar una ruta registrada.', async () => {
            // GIVEN
            // Lista de rutas registradas ["A-B"].
            await routeService.createRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino,
                datosRutaC.transporte, datosRutaC.preferencia, rutaABCBuscada, datosRutaC.matricula)

            // WHEN
            // El usuario trata de eliminar la ruta "A-B".
            const resultado = await routeService.deleteRoute(
                datosRutaC.geohash_origen,
                datosRutaC.geohash_destino,
                datosRutaC.transporte,
                datosRutaC.matricula
            );

            // THEN
            // Salida esperada: no se lanza ningún error. Se elimina la ruta y se notifica de
            // ello, mostrando la lista de rutas registradas.
            // Estado esperado: la lista de ruta se actualiza a la lista vacía.
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
                datosRutaC.geohash_origen,
                datosRutaC.geohash_destino,
                datosRutaC.transporte,
                datosRutaC.matricula
            )).toBeRejectedWith(new MissingRouteError());

            // THEN
            // Salida esperada: se lanza el error MissingRouteError.
            // Estado esperado: no se modifica el estado.
        }, 30000);
    });

    // --- HU411: Modificar Ruta ---

    describe('HU411: Modificar una ruta guardada', () => {

        it('HU411-EV01. Modificar el modo de transporte de una ruta', async () => {
            // GIVEN
            // Lista de rutas registradas → ["A-B"].
            const rutaBuscada = await mapSearchService.searchRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.preferencia);
            await routeService.createRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino,
                datosRutaC.transporte, datosRutaC.preferencia, rutaBuscada, datosRutaC.matricula)

            // WHEN
            // El usuario consulta los datos de la ruta "A-B" y modifica el modo de
            // transporte a "A pie". Se asume que una persona a pie camina a 4 km/h.
            const rutaModificada = await routeService.updateRoute(
                datosRutaC.geohash_origen,
                datosRutaC.geohash_destino,
                datosRutaC.transporte,
                {transporte: TIPO_TRANSPORTE.A_PIE},
                datosRutaC.preferencia
            );

            // THEN
            // Salida esperada: no se lanza ningún error. Se recalcula la ruta y se muestra
            // por pantalla, cuya duración será de "21 h, 15 min".
            // Estado esperado: el transporte de "A-B" se modifica a "A pie".
            expect(rutaModificada.transporte).toBe("A PIE");
            // 21 h 15 min = 76500 s. Verificamos que sea mayor que en coche (7055 s)
            expect(rutaModificada.tiempo).toBeGreaterThan(7055.4);

            // Cleanup
            await routeService.deleteRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.matricula);
        },30000);

        it('HU411-EI03. Modificar una ruta no registrada', async () => {
            // GIVEN
            // Lista de rutas registradas vacía.

            // WHEN
            // El usuario intenta modificar el modo de transporte de la ruta "A-B" a "A pie".
            await expectAsync(routeService.updateRoute(datosRutaC.geohash_origen,
                datosRutaC.geohash_destino,
                datosRutaC.transporte,
                {transporte: TIPO_TRANSPORTE.A_PIE},
                datosRutaC.preferencia)).toBeRejectedWith(new MissingRouteError());

            // THEN
            // Salida esperada: se lanza el error MissingRouteError.
            // Estado esperado: no se modifica el estado.
        },30000);
    });

    describe('HU503: Fijar una ruta', () => {

        it('HU503-EV01: Fijar un POI registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de rutas registradas → ["A-B"].
            await routeService.createRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino,
                datosRutaC.transporte, datosRutaC.preferencia, rutaABCBuscada, datosRutaC.matricula)

            // Registramos la ruta "A-B" a pie.
            const rutaBuscada = await mapSearchService.searchRoute(datosRutaP.geohash_origen, datosRutaP.geohash_destino, datosRutaP.transporte, datosRutaP.preferencia);
            const rutaCreada = await routeService.createRoute(datosRutaP.geohash_origen, datosRutaP.geohash_destino,
                datosRutaP.transporte, datosRutaP.preferencia, rutaBuscada)

            // Ambas rutas no son fijadas, una consulta de rutas devuelve ["Ford Fiesta", "A pie"]
            try {
                let list = await routeService.getRouteList();
                expect(list.at(0)?.transporte).toEqual(TIPO_TRANSPORTE.VEHICULO);

                // WHEN
                // El usuario trata de fijar la ruta "A pie".
                const poiFijado = await routeService.pinRoute(rutaCreada);

                // THEN
                // La ruta "A pie" pasa a estar fijada (pinned = true)
                expect(poiFijado).toBeTrue();

                // el orden ahora es ["A pie", "Ford Fiesta"]
                list = await routeService.getRouteList();
                expect(list.at(0)?.transporte).toEqual(TIPO_TRANSPORTE.A_PIE);
            }
            finally {
                // CLEANUP
                // Borrar ambas rutas
                await routeService.deleteRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.matricula);
                await routeService.deleteRoute(datosRutaP.geohash_origen, datosRutaP.geohash_destino, datosRutaP.transporte);
            }

        });

        it('HU503-EI02: Fijar un POI no registrado', async () => {
            // GIVEN
            // Lista de rutas registradas vacía.

            // WHEN
            // El usuario trata de fijar la ruta "A-B" (con los atributos indicados abajo es suficiente para instanciarla).
            await expectAsync(routeService.pinRoute(new RouteModel(
                datosRutaC.geohash_origen,
                datosRutaC.geohash_destino,
                datosRutaC.transporte,
                datosRutaC.preferencia))).toBeRejectedWith(new MissingRouteError());
            // THEN
            // Se lanza el error MissingPOIError
            // No se modifica el estado
        });
    });


    describe('HU606: Guardar datos de rutas', () => {

        it('HU606-EV01: Comprobación de datos guardados de rutas ante cierre involuntario', async () => {
            // GIVEN
            //  el usuario "ramon" está registrado y ha iniciado sesión
            // Lista de rutas registradas → ["A-B"].
            await routeService.createRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino,
                datosRutaC.transporte, datosRutaC.preferencia, rutaABCBuscada, datosRutaC.matricula)
            const listaRutasAntes = await routeService.getRouteList();

            //  se cierra la sesión involuntariamente
            await userService.logout();

            // WHEN
            //  el usuario "ramon" vuelve a iniciar sesión
            await userService.login(datosRamon.email, datosRamon.pwd);

            // THEN
            //  los datos de rutas de la BD son los mismos que los introducidos previamente
            const listaRutas = await routeService.getRouteList();
            expect(listaRutas).toEqual(listaRutasAntes);
        });
    });
});
