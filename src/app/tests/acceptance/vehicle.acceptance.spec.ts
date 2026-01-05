import {TestBed} from '@angular/core/testing';
import {appConfig} from '../../app.config';
import {Auth} from '@angular/fire/auth';
import {ROUTE_TEST_DATA, USER_TEST_DATA, VEHICLE_TEST_DATA} from '../test-data';
import {UserService} from '../../services/User/user.service';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {VehicleModel} from '../../data/VehicleModel';
import {VehicleAlreadyExistsError} from '../../errors/Vehicle/VehicleAlreadyExistsError';
import {MissingVehicleError} from '../../errors/Vehicle/MissingVehicleError';
import {RouteService} from '../../services/Route/route.service';
import {RouteResultModel} from '../../data/RouteResultModel';


// Pruebas de aceptación sobre vehículos
// HU301, HU302, HU303, HU304, HU305, HU502, HU605
describe('Pruebas de aceptación sobre vehículos', () => {

    // Servicio principal a probar
    let vehicleService: VehicleService;

    // Otros servicios necesarios
    let userService: UserService;
    let routeService: RouteService;

    // Utilizamos Auth en beforeAll y afterAll para comprobar que se cierra sesión correctamente.
    let auth: Auth;

    // Datos de prueba de usuarios
    const ramon = USER_TEST_DATA[0]; // usuario ya registrado en la base de datos
    const maria = USER_TEST_DATA[1]; // usuario no registrado en la base de datos

    // Datos de prueba de vehículos
    const ford: VehicleModel = VEHICLE_TEST_DATA[0] as VehicleModel;
    const audi: VehicleModel = VEHICLE_TEST_DATA[1] as VehicleModel;

    // Vehículo previamente registrado al inicio de las pruebas
    let vehiculoRegistrado: VehicleModel;

    // Ruta para comprobar que, si se borra un vehículo asociado a una, también se borra la ruta.
    const rutaC = ROUTE_TEST_DATA[0];


    beforeAll(async () => {
        await TestBed.configureTestingModule({
            providers: [appConfig.providers],
            teardown: {destroyAfterEach: false} // Previene que Angular destruya los inyectores después de cada test.
        }).compileComponents();

        // Inyección de los servicios
        userService = TestBed.inject(UserService);
        vehicleService = TestBed.inject(VehicleService);
        routeService = TestBed.inject(RouteService);

        // Inyección de Auth
        auth = TestBed.inject(Auth);

        // Iniciar sesión con "ramon" para todos los test
        // Puede que la sesión haya quedado activa...
        try {
            await userService.login(ramon.email, ramon.pwd);
        }
        catch (error) {
            console.info('No se ha podido iniciar sesión con el usuario "ramon": ' + error);
        }

        // Borrar todos los vehículos del usuario (si hubiera)
        await vehicleService.clear();
    });

    beforeEach(async () => {
        // Registrar vehículo inicial "Ford Fiesta" para tener estado base en algunos tests
        try {
            vehiculoRegistrado = await vehicleService.readVehicle(ford.matricula);
        }
        // Lanza un error si no existe, entonces se crea
        catch (error) {
            vehiculoRegistrado = await vehicleService.createVehicle(ford);
        }
    })

    // Se cierra la sesión al terminar los tests y se informa del resultado
    afterAll(async () => {
        if (auth.currentUser) {
            try {
                await userService.logout();
                console.info('Logout en afterAll de vehicle.spec.ts funcionó correctamente.');
            }
            catch (error) {
                console.error('Fallo al hacer logout en afterALl de user.spec.ts.');
            }
        }
    });

    // Las pruebas empiezan a partir de AQUÍ

    describe('HU301: Registrar nuevo vehículo', () => {

        it('HU301-EV01: Registrar nuevo vehículo "Ford Fiesta"', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → ["Ford Fiesta"] (No contiene "Audi A6")

            // WHEN
            // El usuario intenta registrar el vehículo "Audi A6".
            const vehiculoCreado = await vehicleService.createVehicle(audi);

            // THEN
            // No se lanza ningún error.
            // Se da de alta el vehículo.
            expect(vehiculoCreado).toEqual(jasmine.objectContaining({
                alias: audi.alias,
                matricula: audi.matricula,
                marca: audi.marca,
                modelo: audi.modelo,
                anyo: audi.anyo,
                tipoCombustible: audi.tipoCombustible,
                consumoMedio: audi.consumoMedio,
                pinned: audi.pinned,
                })
            );

            // CLEANUP: Borrar el vehículo creado
            await vehicleService.deleteVehicle(vehiculoCreado.matricula);
        }, 10000);

        it('HU301-EI01: Registrar vehículo ya existente', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → ["Ford Fiesta"]

            // WHEN
            // El usuario intenta registrar el vehículo "Ford Fiesta" nuevamente.
            await expectAsync(vehicleService.createVehicle(ford))
                .toBeRejectedWith(new VehicleAlreadyExistsError());

            // THEN
            // Se lanza el error VehicleAlreadyExistsError
        });
    });

    describe('HU302: Consultar lista de vehículos', () => {

        it('HU302-EV01: Consultar el listado vacío de vehículos', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // El usuario maria se ha registrado y ha iniciado sesión.
            await userService.signUp(maria);

            try {
                // WHEN
                // El usuario "maria" consulta su lista de vehículos registrados (vacía)
                let list: VehicleModel[] = await vehicleService.getVehicleList();

                // THEN
                // Se devuelve una lista vacía y se indica que no hay vehículos registrados.
                expect(list.length).toBe(0);
            } finally {
                // CLEANUP: se borra a "maria" y se vuelve a iniciar sesión con "ramon"
                // Borrar a "maria".
                await userService.deleteUser();
                // Volver a "ramon".
                await userService.login(ramon.email, ramon.pwd);
            }
        }, 10000);

        it('HU302-EV02: Consultar lista no vacía de vehículos', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → ["Ford Fiesta"]

            // WHEN
            // El usuario consulta su lista de vehículos registrados.
            const listaVehiculos = await vehicleService.getVehicleList();

            // THEN
            // Se muestra el listado de vehículos registrados (con al menos 1 resultado).
            expect(listaVehiculos.length).toBeGreaterThanOrEqual(1);
        }, 10000);
    });

    describe('HU303: Modificar datos de un vehículo', () => {

        it('HU303-EV01: Modificar datos de un vehículo registrado', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → ["Ford Fiesta"] (con matrícula "1234XYZ")

            // WHEN
            // El usuario trata de modificar la matrícula del vehículo "Ford Fiesta" a "1235ZYX".
            const nuevaMatricula = "1235ZYX";
            try {
                const vehiculoModificado = await vehicleService
                    .updateVehicle(vehiculoRegistrado.matricula, {matricula: nuevaMatricula});

                // THEN
                // No se lanza ningún error. Se modifica la matrícula.
                expect(vehiculoModificado).toBeTrue();

                // Comprobación adicional de la modificación.
                const vehiculoLeido = await vehicleService.readVehicle(nuevaMatricula);
                expect(vehiculoLeido.matricula).toBe(nuevaMatricula);
            } finally {
                // CLEANUP
                // Restaurar matrícula original.
                await vehicleService.updateVehicle(nuevaMatricula, {matricula: ford.matricula});
            }
        }, 10000);

        it('HU303-EI01: Modificar matrícula de un vehículo para que coincida con la de otro', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → ["Ford Fiesta", "Audi A6"]
            const vehiculoAudi = await vehicleService.createVehicle(audi);

            try {
                // WHEN
                // El usuario trata de modificar la matrícula del vehículo Audi (4321XYZ)
                // a la del "Ford Fiesta" (1234XYZ)
                await expectAsync(vehicleService.updateVehicle(vehiculoAudi.matricula, {matricula: ford.matricula}))
                    .toBeRejectedWith(new VehicleAlreadyExistsError());

                // THEN
                // Se lanza el error VehicleAlreadyExistsError.
            } finally {
                // CLEANUP: Se elimina el vehículo "Audi A6"
                await vehicleService.deleteVehicle(vehiculoAudi.matricula);
            }
        });
    });

    describe('HU304: Eliminar un vehículo', () => {

        it('HU304-EV01: Eliminar vehículo registrado', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → ["Ford Fiesta", "Audi A6"]
            const vehiculoAudi = await vehicleService.createVehicle(audi);

            // Lista de rutas registradas → [“A-B-AudiA6”].
            // Coste simulado para evitar una llamada costosa a la API
            const routeCost = new RouteResultModel(rutaC.distancia, rutaC.tiempo, undefined as any);
            await routeService.createRoute(rutaC.geohash_origen, rutaC.geohash_destino,
                rutaC.alias, rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino, rutaC.preferencia,
                routeCost, vehiculoAudi.matricula);

            // WHEN
            // El usuario trata de eliminar el vehículo.
            const resultado = await vehicleService.deleteVehicle(vehiculoAudi.matricula);

            // THEN
            // No se lanza ningún error. Se elimina el vehículo de la lista.
            expect(resultado).toBeTrue();

            // Se elimina la ruta "A-B-AudiA6" de la lista.
            const routes = await routeService.getRouteList();
            expect(routes.length).toBe(0);
        }, 10000);

        it('HU304-EI01: Eliminar vehículo no registrado', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → ["Ford Fiesta"].

            // WHEN
            // El usuario trata de eliminar el vehículo "Audi A6" (no registrado).
            await expectAsync(vehicleService.deleteVehicle(audi.matricula))
                .toBeRejectedWith(new MissingVehicleError());

            // THEN
            // Se lanza el error MissingVehicleError.
        });
    });

    describe('HU305: Consultar información de un vehículo', () => {

        it('HU305-EV01: Consultar información de un vehículo registrado', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → ["Ford Fiesta"].

            // WHEN
            // El usuario consulta los datos del vehículo "Ford Fiesta".
            const datosVehiculo = await vehicleService.readVehicle(ford.matricula);

            // THEN
            // Se muestran los datos del vehículo.
            expect(datosVehiculo).toEqual(jasmine.objectContaining({
                alias: ford.alias,
                matricula: ford.matricula,
                marca: ford.marca,
                modelo: ford.modelo,
                anyo: ford.anyo,
                tipoCombustible: ford.tipoCombustible,
                consumoMedio: ford.consumoMedio,
                pinned: ford.pinned,
            }));
        });

        it('HU305-EI02: Consultar información de un vehículo no registrado', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → ["Ford Fiesta"].

            // WHEN
            // El usuario consulta los datos del vehículo “Audi A6” (no registrado).
            await expectAsync(vehicleService.readVehicle(audi.matricula))
                .toBeRejectedWith(new MissingVehicleError());

            // THEN
            // Se lanza el error MissingVehicleError.
        });
    });

    describe('HU502: Fijar un vehículo', () => {

        it('HU502-EV01: Fijar un vehículo registrado', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → ["Ford Fiesta", "Audi A6"].
            const vehiculoAudi: VehicleModel = await vehicleService.createVehicle(audi);

            // Ambos vehículos no son fijados, una consulta de vehículos devuelve ["Audi A6", "Ford Fiesta"].
            let list = await vehicleService.getVehicleList();
            expect(list.at(0)?.matricula === '4321XYZ').toBeTrue();

            // WHEN
            // El usuario trata de fijar el vehículo "Ford Fiesta".
            const vehiculoFijado = await vehicleService.pinVehicle(ford.matricula);

            // THEN
            // El vehículo "Ford Fiesta" pasa a estar fijado (pinned = true).
            expect(vehiculoFijado).toBeTrue();

            // El orden ahora es ["Ford Fiesta", "Audi A6"].
            list = await vehicleService.getVehicleList();
            expect(list.at(0)?.matricula).toEqual('1234XYZ');

            // CLEANUP
            // Quitar el fijado de "Ford Fiesta".
            await vehicleService.pinVehicle(ford.matricula);

            // Borrar el vehículo "Audi".
            await vehicleService.deleteVehicle(vehiculoAudi.matricula);
        }, 10000);

        it('HU502-EI02: Fijar un vehículo no registrado', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → ["Ford Fiesta"].

            // WHEN
            // El usuario trata de fijar un vehículo no registrado.
            await expectAsync(vehicleService.pinVehicle(audi.matricula))
                .toBeRejectedWith(new MissingVehicleError());

            // THEN
            // Se lanza el error MissingVehicleError.
        });
    });

    describe('HU605: Guardar datos de vehículos', () => {

        it('HU605-EV01: Comprobación de datos guardados de vehículos ante cierre involuntario', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → ["Ford Fiesta"].
            const listaVehiculosAntes = await vehicleService.getVehicleList();

            // Se cierra la sesión involuntariamente.
            await userService.logout();

            // WHEN
            // El usuario "ramon" vuelve a iniciar sesión.
            await userService.login(ramon.email, ramon.pwd);

            // THEN
            // Los datos de vehículos de la BD son los mismos que los introducidos previamente.
            const listaVehicle = await vehicleService.getVehicleList();
            expect(listaVehicle).toEqual(listaVehiculosAntes);
        }, 10000);
    });

});
