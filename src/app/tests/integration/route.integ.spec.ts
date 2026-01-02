import {TestBed} from '@angular/core/testing'
import {ROUTE_TEST_DATA, VEHICLE_TEST_DATA} from '../test-data';
import {createMockRepository} from '../helpers/test-helpers';
import {USER_REPOSITORY, UserRepository} from '../../services/User/UserRepository';
import {RouteService} from '../../services/Route/route.service';
import {ROUTE_REPOSITORY, RouteRepository} from '../../services/Route/RouteRepository';
import {RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {RouteResultModel} from '../../data/RouteResultModel';
import {RouteAlreadyExistsError} from '../../errors/Route/RouteAlreadyExistsError';
import {MissingRouteError} from '../../errors/Route/MissingRouteError';
import {FuelPriceService} from '../../services/fuel-price-service/fuel-price-service';
import {ElectricityPriceService} from '../../services/electricity-price-service/electricity-price-service';
import {FUEL_TYPE} from '../../data/VehicleModel';
import {InvalidDataError} from '../../errors/InvalidDataError';
import {WrongParamsError} from '../../errors/WrongParamsError';
import {MapSearchService} from '../../services/map/map-search-service/map-search.service';


// Pruebas de integración sobre rutas
// HU401, HU402, HU403, HU404, HU405, HU406, HU407, HU408, HU409, HU410, HU411, HU503, HU606
// Se excluye HU606 por ser sobre el guardado y recuperación de datos en la BBDD

describe('Pruebas de integración sobre rutas', () => {
    // SUT
    let routeService: RouteService;

    // Mock de acceso a la BD (usuario)
    let mockUserRepository: jasmine.SpyObj<UserRepository>;

    // Mock de acceso a la BD (rutas)
    let mockRouteRepository: jasmine.SpyObj<RouteRepository>;

    // Mock del servicio (mapas)
    let mockMapService: jasmine.SpyObj<MapSearchService>;

    // Mock del servicio (combustible)
    let mockFuelService: jasmine.SpyObj<FuelPriceService>;

    // Mock del servicio (electricidad)
    let mockElectricityService: jasmine.SpyObj<ElectricityPriceService>;

    // Datos de prueba
    const rutaC = ROUTE_TEST_DATA[0];
    const rutaP = ROUTE_TEST_DATA[1];

    const ford = VEHICLE_TEST_DATA[0];

    beforeEach(async () => {
        mockUserRepository = createMockRepository('user');
        mockRouteRepository = createMockRepository('route');
        mockFuelService = createMockRepository('fuel');
        mockElectricityService = createMockRepository('electricity');
        mockMapService = createMockRepository('maps');

        await TestBed.configureTestingModule({
            providers: [
                RouteService,
                {provide: USER_REPOSITORY, useValue: mockUserRepository},
                {provide: ROUTE_REPOSITORY, useValue: mockRouteRepository},
                {provide: ElectricityPriceService, useValue: mockElectricityService},
                {provide: FuelPriceService, useValue: mockFuelService},
                {provide: MapSearchService, useValue: mockMapService}
            ],
        }).compileComponents();

        // Inyección del servicio
        routeService = TestBed.inject(RouteService);
    });


    // Las pruebas empiezan a partir de AQUÍ
    // Se asume que la sesión está activa en todos los tests.

    describe('HU402: Conocer coste de ruta en coche (combustible)', () => {

        it('HU402-EV01. Obtener coste en combustible asociado a una ruta registrada en vehículo.', async () => {
            // GIVEN
            // La distancia de la ruta es 100000 (100 km) porque calculamos el coste en L/100km. Así, el coste pasa a ser el consumo medio.
            const mockRoute = new RouteResultModel(0, 100000, undefined as any);

            // El precio va a ser el doble del consumo medio.
            mockFuelService.getPrice.and.resolveTo(2);

            // WHEN
            // El usuario pide el coste (precio) de una ruta en vehículo de combustión
            // (el consumo medio es 1 para que el resultado sea trivial, 1L)
            const coste = await routeService.getRouteCost(mockRoute, TIPO_TRANSPORTE.VEHICULO, 1, FUEL_TYPE.DIESEL);

            // THEN
            // No se lanza ningún error. Se devuelve el coste esperado (en €) de la ruta, 1 * 2 = 2.
            expect(coste.cost).toBe(2);
            expect(coste.unit).toEqual('€');

            // Se llama a la función "getPrice" del servicio correcto con los parámetros pertinentes.
            expect(mockFuelService.getPrice).toHaveBeenCalledWith(FUEL_TYPE.DIESEL);
            expect(mockElectricityService.getPrice).not.toHaveBeenCalled();
        });

        // Ver test anterior para una explicación de los datos escogidos.
        it('HU402-EV02. Obtener coste en combustible asociado a una ruta registrada en vehículo eléctrico.', async () => {
            // GIVEN
            const mockRoute = new RouteResultModel(0, 100000, undefined as any);
            mockElectricityService.getPrice.and.resolveTo(2);

            // WHEN
            // El usuario pide el coste (precio) de una ruta en vehículo eléctrico
            const coste = await routeService.getRouteCost(mockRoute, TIPO_TRANSPORTE.VEHICULO, 1, FUEL_TYPE.ELECTRICO);

            // THEN
            // No se lanza ningún error. Se devuelve el coste esperado (en €) de la ruta, 1 * 2 = 2.
            expect(coste.cost).toBe(2);
            expect(coste.unit).toEqual('€');

            // Se llama a la función "getPrice" del servicio correcto con los parámetros pertinentes.
            expect(mockElectricityService.getPrice).toHaveBeenCalledWith();
            expect(mockFuelService.getPrice).not.toHaveBeenCalled();
        });

        // Ver test anterior para una explicación de los datos escogidos.
        it('HU402-EV03. Obtener coste en combustible asociado a una ruta registrada sin vehículo.', async () => {
            // GIVEN
            // El tiempo es 1 hora (3600 s) porque calculamos 200kCal/h a pie.
            const mockRoute = new RouteResultModel(3600, 0, undefined as any);

            // WHEN
            // El usuario pide el coste (precio) de una ruta en vehículo eléctrico
            const coste = await routeService.getRouteCost(mockRoute, TIPO_TRANSPORTE.A_PIE);

            // THEN
            // No se lanza ningún error. Se devuelve el coste esperado (en kCal) de la ruta.
            expect(coste.cost).toBe(200);
            expect(coste.unit).toEqual('kCal');

            // No se llama a la función "getPrice" de ningún servicio.
            expect(mockFuelService.getPrice).not.toHaveBeenCalled();
            expect(mockElectricityService.getPrice).not.toHaveBeenCalled();
        });

        it('HU402-EI01. Obtener coste (precio) asociado a una ruta inválida.', async () => {
            // GIVEN
            const mockRoute = new RouteResultModel(-1, -1, undefined as any);

            // WHEN
            // El usuario pide el coste (precio) de una ruta inválida.
            await expectAsync(routeService.getRouteCost(mockRoute, TIPO_TRANSPORTE.VEHICULO,
                ford.consumoMedio, ford.tipoCombustible as FUEL_TYPE))
                .toBeRejectedWith(new InvalidDataError());
            // THEN
            // Se lanza el error InvalidDataError.

            // No se llama a la función "getPrice" de ningún servicio.
            expect(mockFuelService.getPrice).not.toHaveBeenCalled();
            expect(mockElectricityService.getPrice).not.toHaveBeenCalled();
        });

        it('HU402-EI02. Obtener coste (precio) asociado a una ruta sin especificar parámetros.', async () => {
            // GIVEN
            const mockRoute = new RouteResultModel(0, 0, undefined as any);

            // WHEN
            // El usuario pide el coste (precio) de una ruta en coche sin especificar el consumo medio del vehículo.
            await expectAsync(routeService.getRouteCost(mockRoute, TIPO_TRANSPORTE.VEHICULO,
                undefined as any, ford.tipoCombustible as FUEL_TYPE))
                .toBeRejectedWith(new WrongParamsError('ruta para calcular el coste del vehículo'));
            // THEN
            // Se lanza el error WrongParamsError.
        });
    });


    describe('HU407: Guardar una ruta', () => {
        it('HU407-EV01. Guardar una ruta nueva.', async () => {
            // GIVEN
            // El usuario ha buscado la ruta "A-B" utilizando el vehículo "Ford Fiesta".
            // Se simula el coste de la ruta.
            const mockRoute = new RouteResultModel(0, 0, undefined as any);
            const mockRouteModel = new RouteModel(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia,
                mockRoute.distancia, mockRoute.tiempo, false, rutaC.matricula);

            mockUserRepository.sessionActive.and.resolveTo(true);
            mockRouteRepository.routeExists.and.resolveTo(false);
            mockRouteRepository.createRoute.and.resolveTo(mockRouteModel);

            // WHEN
            // El usuario decide guardar la ruta que ha buscado.
            const rutaGuardada = await routeService.createRoute(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia, mockRoute, rutaC.matricula);

            // THEN
            // Se guarda la ruta.
            expect(rutaGuardada).toBeDefined();
            expect(rutaGuardada).toEqual(mockRouteModel);

            // Se llama a la función "createRoute" con los parámetros pertinentes.
            expect(mockRouteRepository.createRoute).toHaveBeenCalledWith(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia, mockRoute, rutaC.matricula);
        });

        it('HU407-EI08. Guardar una ruta idéntica a una ya guardada.', async () => {
            // GIVEN
            // El usuario ha guardado la ruta "A-B".
            const mockRoute = new RouteResultModel(0, 0, undefined as any);

            mockUserRepository.sessionActive.and.resolveTo(true);
            mockRouteRepository.routeExists.and.resolveTo(true);

            // WHEN
            // El usuario intenta guardar una ruta idéntica.
            await expectAsync(routeService.createRoute(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia, mockRoute, rutaC.matricula))
                .toBeRejectedWith(new RouteAlreadyExistsError());
            // THEN
            // Se lanza el error RouteAlreadyExistsError.

            // No se llama a la función "createRoute".
            expect(mockRouteRepository.createRoute).not.toHaveBeenCalled();
        });
    });

    describe('HU408: Consultar listado de rutas', () => {

        it('HU408-EV01. Consultar el listado vacío de rutas.', async () => {
            // GIVEN
            // Lista de rutas registradas vacía.
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockRouteRepository.getRouteList.and.resolveTo([]);

            // WHEN
            // El usuario consulta su lista de rutas registradas.
            const list = await routeService.getRouteList();

            // THEN
            // Se llama a la función "getRouteList" con los parámetros pertinentes.
            expect(list.length).toBe(0);
            expect(mockRouteRepository.getRouteList).toHaveBeenCalledWith();
        });

        it('HU408-EV02. Consultar el listado no vacío de rutas.', async () => {
            // GIVEN
            // Lista de rutas registradas → ["A-B"].
            const mockRouteModel = new RouteModel(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia,
                0, 0, false, rutaC.matricula);

            mockUserRepository.sessionActive.and.resolveTo(true);
            mockRouteRepository.getRouteList.and.resolveTo([mockRouteModel]);

            // WHEN
            // El usuario consulta su lista de rutas registradas.
            const list = await routeService.getRouteList();

            // THEN
            // No se lanza ningún error. Hay al menos una ruta registrada.
            expect(list.length).toBeGreaterThanOrEqual(1);

            // Se llama a la función "getRouteList" con los parámetros pertinentes.
            expect(mockRouteRepository.getRouteList).toHaveBeenCalledWith();
        });
    });

    describe('HU409: Consultar ruta guardada', () => {

        it('HU409-EV01. Consultar información de una ruta registrada.', async () => {
            // GIVEN
            // Lista de rutas registradas → ["A-B"].
            // Se simula el coste de la ruta.
            const mockRouteModel = new RouteModel(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia,
                0, 0, false, rutaC.matricula);

            mockUserRepository.sessionActive.and.resolveTo(true);
            mockRouteRepository.routeExists.and.resolveTo(true);
            mockRouteRepository.getRoute.and.resolveTo(mockRouteModel);

            // WHEN
            // El usuario consulta los datos de la ruta "A-B".
            const ruta = await routeService.readRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte,
                rutaC.matricula
            );

            // THEN
            // No se lanza ningún error. Se muestran los datos de la ruta.
            expect(ruta).toBeDefined();
            expect(ruta).toEqual(mockRouteModel);

            // Se llama a la función "getRoute" con los parámetros pertinentes.
            expect(mockRouteRepository.getRoute).toHaveBeenCalledWith(rutaC.geohash_origen, rutaC.geohash_destino, rutaC.transporte, rutaC.matricula);
        });

        it('HU409-EI03. Consultar información de una ruta no registrada.', async () => {
            // GIVEN
            // Lista de rutas registradas vacía.
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockRouteRepository.routeExists.and.resolveTo(false);

            // WHEN
            // El usuario consulta los datos de la ruta "A-B".
            await expectAsync(routeService.readRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte,
                rutaC.matricula
            )).toBeRejectedWith(new MissingRouteError());
            // THEN
            // Se lanza el error MissingRouteError.

            // No se llama a la función "getRoute".
            expect(mockRouteRepository.getRoute).not.toHaveBeenCalled();
        });
    });

    describe('HU410: Eliminar una ruta guardada', () => {

        it('HU410-EV01. Eliminar una ruta registrada.', async () => {
            // GIVEN
            // Lista de rutas registradas ["A-B"].
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockRouteRepository.routeExists.and.resolveTo(true);
            mockRouteRepository.deleteRoute.and.resolveTo(true);

            // WHEN
            // El usuario trata de eliminar la ruta "A-B".
            const resultado = await routeService.deleteRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte,
                rutaC.matricula
            );
            // THEN
            // No se lanza ningún error. Se elimina la ruta.
            expect(resultado).toBeTrue();

            // Se llama a la función "deleteRoute" con los parámetros pertinentes.
            expect(mockRouteRepository.deleteRoute).toHaveBeenCalledWith(rutaC.geohash_origen, rutaC.geohash_destino, rutaC.transporte, rutaC.matricula);
        });

        it('HU410-EI03. Eliminar una ruta no registrada.', async () => {
            // GIVEN
            // Lista de rutas registradas vacía.
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockRouteRepository.routeExists.and.resolveTo(false);

            // WHEN
            // El usuario trata de eliminar la ruta "A-B".
            await expectAsync(routeService.deleteRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte,
                rutaC.matricula
            )).toBeRejectedWith(new MissingRouteError());
            // THEN
            // Se lanza el error MissingRouteError.

            // No se llama a la función "deleteRoute".
            expect(mockRouteRepository.deleteRoute).not.toHaveBeenCalled();
        });
    });

    describe('HU411: Modificar una ruta guardada', () => {

        it('HU411-EV01. Modificar el modo de transporte de una ruta', async () => {
            // GIVEN
            // Lista de rutas registradas → ["A-B"].
            // Se simula el coste de la ruta.
            const mockRouteResultModel = new RouteResultModel(rutaP.tiempo, rutaP.distancia, undefined as any);
            const mockRouteModel = new RouteModel(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaP.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia,
                0, 0, false, rutaC.matricula);
            const mockNewRouteModel = new RouteModel(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaP.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia,
                0, 0, false, rutaC.matricula);

            mockUserRepository.sessionActive.and.resolveTo(true);

            // Configuramos el mock para que responda según los parámetros
            mockRouteRepository.routeExists.and.callFake((origen, destino, transporte, matricula) => {
                // Si preguntan por la ruta original (transporte inicial), existe
                if (transporte === rutaC.transporte) {
                    return Promise.resolve(true);
                }
                // Si preguntan por la nueva ruta (transporte modificado), NO existe aún
                return Promise.resolve(false);
            });

            mockRouteRepository.getRoute.and.resolveTo(mockRouteModel);
            mockMapService.searchRoute.and.resolveTo(mockRouteResultModel);
            mockRouteRepository.updateRoute.and.resolveTo(mockNewRouteModel);

            // WHEN
            // El usuario consulta los datos de la ruta "A-B" y modifica el modo de transporte a "A pie".
            const rutaModificada = await routeService.updateRoute(
                rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte,
                {transporte: rutaP.transporte},
                rutaC.matricula
            );

            // THEN
            // No se lanza ningún error. El transporte de "A-B" se modifica a "A pie".
            expect(rutaModificada).toBe(mockNewRouteModel);

            // Se llama a la función "updateRoute" con los parámetros pertinentes.
            expect(mockRouteRepository.updateRoute).toHaveBeenCalledWith(rutaC.geohash_origen, rutaC.geohash_destino, rutaC.transporte, {transporte: rutaP.transporte}, rutaC.matricula);
        });

        it('HU411-EI02. Modificar una ruta no registrada', async () => {
            // GIVEN
            // Lista de rutas registradas vacía.
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockRouteRepository.routeExists.and.resolveTo(false);

            // WHEN
            // El usuario intenta modificar el modo de transporte de la ruta "A-B" a "A pie".
            await expectAsync(routeService.updateRoute(rutaC.geohash_origen,
                rutaC.geohash_destino,
                rutaC.transporte,
                {transporte: rutaP.transporte}
            )).toBeRejectedWith(new MissingRouteError());
            // THEN
            // Se lanza el error MissingRouteError.

            // No se llama a la función "updateRoute".
            expect(mockRouteRepository.updateRoute).not.toHaveBeenCalled();
        });
    });

    describe('HU503: Fijar una ruta', () => {

        it('HU503-EV01: Fijar una ruta registrada', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de rutas registradas → ["A-B (a pie)", "A-B (en coche)"].
            // No hay ninguna ruta fijada.
            const mockRouteModel = new RouteModel(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaP.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia,
                0, 0, false, rutaC.matricula);
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockRouteRepository.routeExists.and.resolveTo(true);
            mockRouteRepository.pinRoute.and.resolveTo(true);

            // WHEN
            // El usuario trata de fijar la ruta "A-B (en coche)".
            const poiFijado = await routeService.pinRoute(mockRouteModel);

            // THEN
            // La ruta "A-B (en coche)" pasa a estar fijada (pinned = true)
            expect(poiFijado).toBeTrue();

            // Se llama a la función "pinRoute" con los parámetros pertinentes.
            expect(mockRouteRepository.pinRoute).toHaveBeenCalledWith(mockRouteModel);
        });

        it('HU503-EI02: Fijar una ruta no registrada', async () => {
            // GIVEN
            // Lista de rutas registradas vacía.
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockRouteRepository.routeExists.and.resolveTo(false);

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
            // Se lanza el error MissingRouteError

            // No se llama a la función "pinRoute".
            expect(mockRouteRepository.pinRoute).not.toHaveBeenCalled();
        });
    });
});
