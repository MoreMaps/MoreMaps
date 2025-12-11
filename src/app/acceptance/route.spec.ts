import {TestBed} from '@angular/core/testing';
import {appConfig} from '../app.config';
import {geohashForLocation} from 'geofire-common';

// Usuarios
import {POI_TEST_DATA, ROUTE_TEST_DATA, USER_TEST_DATA, VEHICLE_TEST_DATA} from './test-data';
import {USER_REPOSITORY} from '../services/User/UserRepository';
import {UserService} from '../services/User/user.service';
import {UserDB} from '../services/User/UserDB';

// Vehículos
import {VEHICLE_REPOSITORY} from '../services/Vehicle/VehicleRepository';
import {VehicleService} from '../services/Vehicle/vehicle.service';
import {VehicleDB} from '../services/Vehicle/VehicleDB';

// POI y MapSearch
import {POI_REPOSITORY} from '../services/POI/POIRepository';
import {POIDB} from '../services/POI/POIDB';
import {POIService} from '../services/POI/poi.service';
import {MAP_SEARCH_REPOSITORY} from '../services/map-search-service/MapSearchRepository';
import {MapSearchAPI} from '../services/map-search-service/MapSearchAPI';
import {MapSearchService} from '../services/map-search-service/map-search.service';

// Rutas
import {PREFERENCIA, TIPO_TRANSPORTE} from '../data/RouteModel';
import {RouteService} from '../services/Route/route.service';

// Errores
import {WrongRouteParamsError} from '../errors/Route/WrongRouteParamsError';
import {ImpossibleRouteError} from '../errors/Route/ImpossibleRouteError';
import {RouteAlreadyExistsError} from '../errors/Route/RouteAlreadyExistsError';
import {RouteResultModel} from '../data/RouteResultModel';
import {MissingRouteError} from '../errors/Route/MissingRouteError';
import {InvalidDataError} from '../errors/InvalidDataError';


fdescribe('Pruebas sobre rutas', () => {
    let userService: UserService;
    let poiService: POIService;
    let mapSearchService: MapSearchService;
    let vehicleService: VehicleService;
    let routeService: RouteService;

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
                {provide: USER_REPOSITORY, useClass: UserDB},
                {provide: POI_REPOSITORY, useClass: POIDB},
                {provide: MAP_SEARCH_REPOSITORY, useClass: MapSearchAPI},
                {provide: VEHICLE_REPOSITORY, useClass: VehicleDB},
                appConfig.providers],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        // Inyección de servicios
        userService = TestBed.inject(UserService);
        vehicleService = TestBed.inject(VehicleService);
        poiService = TestBed.inject(POIService);
        routeService = TestBed.inject(RouteService);
        mapSearchService = TestBed.inject(MapSearchService);

        // 1. Iniciar sesión
        await userService.login(datosRamon.email, datosRamon.pwd);

        // 2. Registrar Vehículo "Ford Fiesta"
        try {
            await vehicleService.createVehicle(datosFord);
        } catch (e) {console.info("Error al crear vehículo: " + e)}

        // 3. Registrar POI A y POI B usando POIService
        try{
            await poiService.createPOI(datosPoiA);
        } catch(e) {console.info("Error al crear POI A: " + e)}

        try{
            await poiService.createPOI(datosPoiB);
        } catch(e) {console.error("Error al crear POI B: " + e)}
    });

    afterAll(async () => {
        // Borrar los POI de la BD
        try{
            await poiService.deletePOI(datosPoiB.geohash);
        } catch(e) {console.error("Error al borrar POI B: " + e)}

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
            expect(datosRutaCalculada).toEqual(jasmine.objectContaining({
                tiempo: datosRutaC.tiempo,
                distancia: datosRutaC.distancia,
            }));
        });

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
            )).toBeRejectedWith(new WrongRouteParamsError());

            // THEN
            // Se lanza el error WrongRouteParamsError.
        });

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
        });
    });

    // --- HU402: Coste en combustible/precio ---

    describe('HU402: Conocer coste de ruta en coche (combustible)', () => {

        it('HU402-EV01. Obtener coste (combustible, precio) asociado a una ruta registrada en vehículo.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados→ ["Ford Fiesta"].
            // 3. Lista de rutas registradas → ["A-B"].
            // 4. El usuario ha seleccionado la ruta "A-B" en vehículo.

            const foundRoute = await mapSearchService.searchRoute(
                datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.preferencia
            );

            // WHEN
            // El usuario pide el coste (en combustible, precio) de la ruta "A-B".
            const coste = await routeService.getRouteCost(foundRoute, datosRutaC.transporte, datosFord.consumoMedio);

            // THEN
            // Salida esperada: no se lanza ningún error. El sistema muestra el
            // combustible asociado a la ruta "A-B" (23 L) y el precio (según API).
            // Estado esperado: no se modifica el estado.
            expect(coste).toBeGreaterThanOrEqual(23);
        });

        it('HU402-EI03. Obtener coste (combustible, precio) asociado a una ruta inválida.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados→ ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide el coste (combustible, precio) de una ruta inválida.
            const res = new RouteResultModel(-1, -1, '');

            await expectAsync(routeService.getRouteCost(res, TIPO_TRANSPORTE.COCHE, datosFord.consumoMedio))
                .toBeRejectedWith(new InvalidDataError());

            // THEN
            // Salida esperada: se lanza el error MissingRouteError.
            // Estado esperado: no se modifica el estado.
        });
    });

    // --- HU403: Coste en calorías (Pie/Bici) ---

    describe('HU403: Conocer coste de ruta a pie (calorías)', () => {

        it('HU403-EV01. Obtener coste (kCal) asociado a una ruta a pie.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados→ ["Ford Fiesta"].
            // 3. El usuario ha seleccionado la ruta "A-B" a pie.

            // Buscamos ruta a pie
            const res: RouteResultModel = await mapSearchService.searchRoute(
                datosRutaP.geohash_origen, datosRutaP.geohash_destino, datosRutaP.transporte, datosRutaP.preferencia
            );

            // WHEN
            // El usuario pide el coste (en kCal) de la ruta "A-B". Se asumen 75 kCal/km.
            const kCal = await routeService.getRouteCost(res, datosRutaP.transporte);

            // THEN
            // No se lanza ningún error. Se devuelve el coste de la ruta: "13296 kCal".
            expect(kCal).toBe(13296.045);
        });

        it('HU403-EI03. Obtener coste (kCal) asociado a una ruta inválida a pie.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de rutas registradas vacía.

            // WHEN
            // El usuario pide el coste (kCal) de una ruta inválida.
            const res = new RouteResultModel(-1, -1, '');

            await expectAsync(routeService.getRouteCost(res, TIPO_TRANSPORTE.A_PIE))
                .toBeRejectedWith(new InvalidDataError());

            // THEN
            // Salida esperada: se lanza el error InvalidDataError.
            // Estado esperado: no se modifica el estado.
        });
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
            expect(ruta.distancia).toEqual(datosRutaC.distancia);
        });

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
        });
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
            expect(ruta.tiempo).toEqual(datosRutaC.tiempo);
        });

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
        });
    });


    // --- HU407: Guardar Ruta ---

    describe('HU407: Guardar una ruta', () => {

        it('HU407-EV01. Guardar una ruta nueva.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados→ ["Ford Fiesta"].
            // 3. Lista de rutas registradas vacía.
            // 4. El usuario ha buscado la ruta más corta entre "A" y "B" utilizando el
            // vehículo "Ford Fiesta".
            const rutaBuscada = await mapSearchService.searchRoute(
                datosRutaC.geohash_origen,
                datosRutaC.geohash_destino,
                datosRutaC.transporte,
                datosRutaC.preferencia
            );

            // WHEN
            // El usuario decide guardar la ruta que ha buscado.
            const rutaGuardada = await routeService.createRoute(datosRutaC.geohash_origen,
                datosRutaC.geohash_destino, datosRutaC.transporte, rutaBuscada, datosRutaC.matricula);

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
                tiempo: datosRutaC.tiempo,
                distancia: datosRutaC.distancia,
                matricula: datosRutaC.matricula,
            }));

            // Cleanup
            await routeService.deleteRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.matricula);
        });

        it('HU407-EI08. Guardar una ruta idéntica a una ya guardada.', async () => {
            // GIVEN
            // 1. Lista de POI registrados → ["A", "B"].
            // 2. Lista de vehículos registrados→ ["Ford Fiesta"].
            // 3. Lista de rutas guardadas -> ["A-B"]
            // 4. El usuario ha buscado una ruta idéntica a "A-B".

            // Registramos la ruta previa
            const rutaBuscada = await mapSearchService.searchRoute(datosRutaC.geohash_origen,
                datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.preferencia);
            await routeService.createRoute(datosRutaC.geohash_origen,
                datosRutaC.geohash_destino, datosRutaC.transporte, rutaBuscada, datosRutaC.matricula);

            // WHEN
            // El usuario decide guardar la ruta que ha buscado.
            await expectAsync(routeService.createRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino,
                datosRutaC.transporte, rutaBuscada, datosRutaC.matricula))
                .toBeRejectedWith(new RouteAlreadyExistsError());

            // THEN
            // Salida esperada: se lanza el error RouteAlreadyExistsError.
            // Estado esperado: no se modifica el estado.

            // Cleanup
            await routeService.deleteRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.matricula);
        });
    });

    /*  COMENTADO HASTA LA SIGUIENTE IT.
    // --- HU408: Listar Rutas ---

    describe('HU408: Consultar listado de rutas', () => {

        it('HU408-EV01. Consultar el listado vacío de rutas.', async () => {
            // GIVEN
            // 1. Lista de rutas registradas vacía.

            // WHEN
            // El usuario consulta su lista de rutas registradas.
            const list = await mapSearchService.getRouteList();

            // THEN
            // Salida esperada: no se lanza ningún error. Se indica al usuario que no ha
            // dado de alta ninguna ruta y se le sugiere registrar una nueva.
            // Estado esperado: no se modifica el estado.
            expect(list.length).toBe(0);
        });

        it('HU408-EV02. Consultar el listado no vacío de rutas.', async () => {
            // GIVEN
            // 1. Lista de rutas registradas → ["A-B"].
            await mapSearchService.searchRoute(poiA.geohash, poiB.geohash, 'VEHICULO', datosFord.matricula);

            // WHEN
            // El usuario consulta su lista de rutas registradas.
            const list = await mapSearchService.getRouteList();

            // THEN
            // Salida esperada: no se lanza ningún error. Se muestra por pantalla el listado
            // de rutas.
            // Estado esperado: no se modifica el estado.
            expect(list.length).toBeGreaterThanOrEqual(1);

            // Cleanup
            await mapSearchService.deleteRoute(poiA.geohash, poiB.geohash, 'VEHICULO', datosFord.matricula);
        });
    });

    // --- HU409: Consultar Ruta (Detalle) ---

    describe('HU409: Consultar ruta guardada', () => {

        it('HU409-EV01. Consultar información de una ruta registrada.', async () => {
            // GIVEN
            // 1. Lista de rutas registradas → ["A-B"].
            await mapSearchService.searchRoute(poiA.geohash, poiB.geohash, 'VEHICULO', datosFord.matricula);

            // WHEN
            // El usuario consulta los datos de la ruta "A-B".
            const ruta = await mapSearchService.readRoute(
                poiA.geohash,
                poiB.geohash,
                'VEHICULO',
                datosFord.matricula
            );

            // THEN
            // Salida esperada: no se lanza ningún error. Se muestran los datos de la ruta.
            // Estado esperado: no se modifica el estado.
            expect(ruta).toBeDefined();
            expect(ruta.distancia).toBeDefined();

            // Cleanup
            await mapSearchService.deleteRoute(poiA.geohash, poiB.geohash, 'VEHICULO', datosFord.matricula);
        });

        it('HU409-EI03. Consultar información de una ruta no registrada.', async () => {
            // GIVEN
            // 1. Lista de rutas registradas vacía.

            // WHEN
            // El usuario consulta los datos de la ruta "A-B".
            await expectAsync(mapSearchService.readRoute(
                poiA.geohash,
                poiB.geohash,
                'VEHICULO',
                datosFord.matricula
            )).toBeRejectedWith(new MissingRouteError());

            // THEN
            // Salida esperada: se lanza el error MissingRouteError.
            // Estado esperado: no se modifica el estado.
        });
    });
    */

    // --- HU410: Eliminar Ruta ---

    describe('HU410: Eliminar una ruta guardada', () => {

        it('HU410-EV01. Eliminar una ruta registrada.', async () => {
            // GIVEN
            // 1. Lista de rutas registradas ["A-B"].
            const rutaBuscada = await mapSearchService.searchRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, datosRutaC.preferencia);
            await routeService.createRoute(datosRutaC.geohash_origen, datosRutaC.geohash_destino, datosRutaC.transporte, rutaBuscada, datosRutaC.matricula);

            // WHEN
            // El usuario trata de eliminar la ruta "A-B".
            const resultado = await routeService.deleteRoute(
                datosRutaC.geohash_origen,
                datosRutaC.geohash_destino,
                datosRutaC.transporte,
                datosRutaC.matricula
            );

            // THEN
            // Salida esperada: no se lanza ningún error. Se elimina el ruta y se notifica de
            // ello, mostrando la lista de rutas registradas.
            // Estado esperado: la lista de ruta se actualiza a la lista vacía.
            expect(resultado).toBeTrue();

            // const list = await mapSearchService.getRouteList();
            // expect(list.length).toBe(0);
        });

        it('HU410-EI03. Eliminar una ruta no registrada.', async () => {
            // GIVEN
            // 1. Lista de rutas registradas vacía.

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
        });
    });

    /* COMENTADO HASTA LA SIGUIENTE ITERACIÓN
    // --- HU411: Modificar Ruta ---

    describe('HU411: Modificar una ruta guardada', () => {

        it('HU411-EV01. Modificar el modo de transporte de una ruta', async () => {
            // GIVEN
            // 1. Lista de rutas registradas → ["A-B"].
            // 2. Lista de vehículos registrados → ["Ford Fiesta"].
            await mapSearchService.searchRoute(poiA.geohash, poiB.geohash, 'VEHICULO', datosFord.matricula);

            // WHEN
            // El usuario consulta los datos de la ruta "A-B" y modifica el modo de
            // transporte a "A pie". Se asume que una persona a pie camina a 4km/h.

                poiA.geohash,
                poiB.geohash,
                'VEHICULO',
                datosFord.matricula,
                'A PIE',
                ''
            );

            // THEN
            // Salida esperada: no se lanza ningún error. Se recalcula la ruta y se muestra
            // por pantalla, cuya duración será de "21h, 15min".
            // Estado esperado: el transporte de "A-B" se modifica a "A pie".
            expect(rutaModificada.transporte).toBe("A PIE");
            // 21h 15min = 76500 segundos. Verificamos que sea mayor que en coche (7055s)
            expect(rutaModificada.duracion).toBeGreaterThan(7055.4);

            // Cleanup
            await mapSearchService.deleteRoute(poiA.geohash, poiB.geohash, 'A PIE', '');
        });

        it('HU411-EI03. Modificar una ruta no registrada', async () => {
            // GIVEN
            // 1. Lista de rutas registradas vacía.
            // 2. Lista de vehículos registrados → ["Ford Fiesta"]

            // WHEN
            // El usuario intenta modificar el modo de transporte de la ruta "A-B" a "A pie".
            await expectAsync(mapSearchService.updateRouteTransport(
                poiA.geohash,
                poiB.geohash,
                'VEHICULO',
                datosFord.matricula,
                'A PIE',
                ''
            )).toBeRejectedWith(new MissingRouteError());

            // THEN
            // Salida esperada: se lanza el error MissingRouteError.
            // Estado esperado: no se modifica el estado.
        });
    });
     */

});
