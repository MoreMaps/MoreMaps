import {TestBed} from '@angular/core/testing';
import {appConfig} from '../app.config';
import {doc, Firestore, setDoc} from '@angular/fire/firestore';
import {Auth} from '@angular/fire/auth';
// Usuarios
import {USER_TEST_DATA, VEHICLE_TEST_DATA} from './test-data';
import {USER_REPOSITORY} from '../services/User/UserRepository';
import {UserService} from '../services/User/user.service';
import {UserDB} from '../services/User/UserDB';
// Vehículos
import {VEHICLE_REPOSITORY} from '../services/Vehicle/VehicleRepository';
import {VehicleService} from '../services/Vehicle/vehicle.service';
import {VehicleDB} from '../services/Vehicle/VehicleDB';
import {VehicleModel} from '../data/VehicleModel';
// Errores
import {VehicleAlreadyExistsError} from '../errors/Vehicle/VehicleAlreadyExistsError';
import {MissingVehicleError} from '../errors/Vehicle/MissingVehicleError';

fdescribe('Pruebas sobre vehículos', () => {
    let userService: UserService;
    let vehicleService: VehicleService;

    let firestore: Firestore;
    let auth: Auth;

    const ramon = USER_TEST_DATA[0];
    const maria = USER_TEST_DATA[1];

    const datosFord: VehicleModel = new VehicleModel(
        VEHICLE_TEST_DATA[0].alias,
        VEHICLE_TEST_DATA[0].matricula,
        VEHICLE_TEST_DATA[0].marca,
        VEHICLE_TEST_DATA[0].modelo,
        VEHICLE_TEST_DATA[0].anyo,
        VEHICLE_TEST_DATA[0].tipoCombustible,
        VEHICLE_TEST_DATA[0].consumoMedio,
    );
    const datosAudi: VehicleModel = new VehicleModel(
        VEHICLE_TEST_DATA[1].alias,
        VEHICLE_TEST_DATA[1].matricula,
        VEHICLE_TEST_DATA[1].marca,
        VEHICLE_TEST_DATA[1].modelo,
        VEHICLE_TEST_DATA[1].anyo,
        VEHICLE_TEST_DATA[1].tipoCombustible,
        VEHICLE_TEST_DATA[1].consumoMedio,
        );

    let vehiculoRegistrado: VehicleModel;

    beforeAll(async () => {
        await TestBed.configureTestingModule({
            providers: [
                UserService,
                VehicleService,
                {provide: USER_REPOSITORY, useClass: UserDB},
                {provide: VEHICLE_REPOSITORY, useClass: VehicleDB},
                appConfig.providers],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        // Inyección de los servicios
        userService = TestBed.inject(UserService);
        vehicleService = TestBed.inject(VehicleService);

        // Inyección de Firestore y Auth
        firestore = TestBed.inject(Firestore);
        auth = TestBed.inject(Auth);

        // Iniciar sesión con ramón para todos los test
        await userService.login(ramon.email, ramon.pwd);
    });

    beforeEach(async () => {
        // Registrar Vehículo inicial "Ford Fiesta" para tener estado base en algunos tests
        try {
            // 1. Referencia al documento
            const vehicleRef = doc(firestore, `/items/${auth.currentUser?.uid}/vehicles/${datosFord.matricula}`);

            // 2. Definir los datos a escribir en formato JSON
            vehiculoRegistrado = new VehicleModel(datosFord.alias, datosFord.matricula, datosFord.marca, datosFord.modelo, datosFord.anyo, datosFord.tipoCombustible, datosFord.consumoMedio);

            // 3. Con merge = true, "escribir" el documento.
            // Si este existe, se actualiza
            // Si no existe, se crea
            await setDoc(vehicleRef, vehiculoRegistrado.toJSON(), {merge: true});
        } catch (error) {
            console.error(error);
            throw error;
        }
    })

    // Las pruebas empiezan a partir de AQUÍ

    describe('HU301: Registrar nuevo vehículo', () => {

        it('HU301-EV01: Registrar nuevo vehículo "Ford Fiesta"', async () => {
            // GIVEN
            // El usuario "ramon" ha iniciado sesión
            // Lista de vehículos registrados → ["Ford Fiesta"] (No contiene "Audi A6")

            // WHEN
            // El usuario intenta registrar el vehículo
            const vehiculoCreado = await vehicleService.createVehicle(datosAudi);

            // THEN
            // No se lanza ningún error
            // Se da de alta el vehículo
            expect(vehiculoCreado).toEqual(jasmine.objectContaining({
                alias: datosAudi.alias,
                matricula: datosAudi.matricula,
                marca: datosAudi.marca,
                modelo: datosAudi.modelo,
                anyo: datosAudi.anyo,
                tipoCombustible: datosAudi.tipoCombustible,
                consumoMedio: datosAudi.consumoMedio,
                pinned: datosAudi.pinned,
            }));

            // CLEANUP
            await vehicleService.deleteVehicle(vehiculoCreado.matricula);
        });

        it('HU301-EI01: Registrar vehículo ya existente', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta"]

            // WHEN
            // El usuario intenta registrar el vehículo "Ford Fiesta" nuevamente.
            await expectAsync(vehicleService.createVehicle(datosFord))
                .toBeRejectedWith(new VehicleAlreadyExistsError());

            // THEN
            // Se lanza el error VehicleAlreadyExistsError
            // No se modifica el estado.
        });
    });

    describe('HU302: Consultar lista de vehículos', () => {

        it('HU302-EV01: Consultar el listado vacío de vehículos', async () => {
            // GIVEN
            // El usuario maria se ha registrado y ha iniciado sesión
            await userService.signUp(maria.email, maria.pwd, maria.nombre, maria.apellidos);

            // WHEN
            // El usuario maria consulta su lista de vehículos registrados (vacía)
            let list: VehicleModel[] = await vehicleService.getVehicleList();

            // THEN
            // Se devuelve una lista vacía y se indica que no hay vehículos registrados.
            expect(list.length).toBe(0);

            // CLEANUP
            // borrar a maria
            await userService.deleteUser();
            // volver a iniciar sesión con ramon
            await userService.login(ramon.email, ramon.pwd);
        });

        it('HU302-EV02: Consultar lista no vacía de vehículos', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta"]

            // WHEN
            // El usuario consulta su lista de vehículos registrados.
            const listaVehiculos = await vehicleService.getVehicleList();

            // THEN
            // Se muestra el listado de vehículos registrados (con al menos 1 resultado).
            expect(listaVehiculos.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('HU303: Modificar datos de un vehículo', () => {

        it('HU303-EV01: Modificar datos de un vehículo registrado', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta"] (con matrícula "1234XYZ")

            // WHEN
            // El usuario trata de modificar la matrícula del vehículo "Ford Fiesta" a "1235ZYX".
            const nuevaMatricula = "1235ZYX";
            const vehiculoModificado = await vehicleService
                .updateVehicle(vehiculoRegistrado.matricula, {matricula: nuevaMatricula});

            // THEN
            // No se lanza ningún error. Se modifica la matrícula.
            expect(vehiculoModificado).toBeTrue();

            // TODO descomentar al integrar readVehicle
            /*
            // Comprobación adicional de la modificación.
            let vehiculoLeido = await vehicleService.readVehicle(nuevaMatricula);
            expect(vehiculoLeido.matricula).toBe(nuevaMatricula);*/

            // CLEANUP
            // Restaurar matrícula original.
            await vehicleService.updateVehicle(nuevaMatricula, {matricula: datosFord.matricula});
        });

        it('HU303-EI01: Modificar matrícula de un vehículo para que coincida con la de otro', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta", "Audi A6"]
            const vehiculoAudi = await vehicleService.createVehicle(datosAudi);

            console.log(vehiculoAudi);
            // WHEN
            // El usuario trata de modificar la matrícula del vehículo Audi (4321XYZ) a la del "Ford Fiesta" (1234XYZ)
            await expectAsync(vehicleService.updateVehicle(vehiculoAudi.matricula, {matricula: datosFord.matricula}))
                .toBeRejectedWith(new VehicleAlreadyExistsError());

            // THEN
            // Se lanza el error VehicleAlreadyExistsError.
            // Estado esperado: no se modifica el estado.

            // CLEANUP
            await vehicleService.deleteVehicle(vehiculoAudi.matricula);
        });
    });

    describe('HU304: Eliminar un vehículo', () => {

        it('HU304-EV01: Eliminar vehículo registrado', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta", "Audi A6"]
            const vehiculoAudi = await vehicleService.createVehicle(datosAudi);

            // WHEN
            // El usuario trata de eliminar el vehículo.
            const resultado = await vehicleService.deleteVehicle(vehiculoAudi.matricula);

            // THEN
            // No se lanza ningún error. Se elimina el vehículo de la lista.
            expect(resultado).toBeTrue();
        });

        it('HU304-EI01: Eliminar vehículo no registrado', async () => {
            // GIVEN
            // Lista de vehículos registrados  →  [“Ford Fiesta”].

            // WHEN
            // El usuario trata de eliminar el vehículo "Ford Fiesta" (que no existe).
            await expectAsync(vehicleService.deleteVehicle(datosAudi.matricula))
                .toBeRejectedWith(new MissingVehicleError());

            // THEN
            // Se lanza el error MissingVehicleError.
        });
    });

    xdescribe('HU305: Consultar información de un vehículo', () => {

        it('HU305-EV01: Consultar información de un vehículo registrado', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta"].

            // WHEN
            // El usuario consulta los datos del vehículo "Ford Fiesta".
            const datosVehiculo = await vehicleService.readVehicle(datosFord.matricula);

            // THEN
            // Se muestran los datos del vehículo.
            expect(datosVehiculo).toEqual(jasmine.objectContaining({
                alias: datosFord.matricula,
                matricula: datosFord.matricula,
                marca: datosFord.marca,
                modelo: datosFord.modelo,
                anyo: datosFord.anyo,
                tipoCombustible: datosFord.tipoCombustible,
                consumoMedio: datosFord.consumoMedio,
                pinned: datosFord.pinned,
            }));
        });

        it('HU305-EI02: Consultar información de un vehículo no registrado', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta"].

            // WHEN
            // El usuario consulta los datos del vehículo “Audi A6” (no registrado).
            await expectAsync(vehicleService.readVehicle(datosAudi.matricula))
                .toBeRejectedWith(new MissingVehicleError());

            // THEN
            // Se lanza el error MissingVehicleError.
        });
    });

    xdescribe('HU502: Fijar un vehículo', () => {

        it('HU502-EV01: Fijar un vehículo registrado', async () => {
            // GIVEN
            // Lista de vehículos registrados  → ["Ford Fiesta", "Audi A6"].
            const vehiculoAudi: VehicleModel = await vehicleService.createVehicle(datosAudi);

            // Ambos vehículos no son fijados, una consulta de vehículos devuelve ["Audi A6", "Ford Fiesta"].
            let list = await vehicleService.getVehicleList();
            expect(list.at(0)?.matricula === '4321XYZ').toBeTrue();

            // WHEN
            // El usuario trata de fijar el vehículo "Ford Fiesta".
            const vehiculoFijado = await vehicleService.pinVehicle(datosFord.matricula);

            // THEN
            // El vehículo "Ford Fiesta" pasa a estar fijado (pinned = true).
            expect(vehiculoFijado).toBeTrue();

            // El orden ahora es ["Ford Fiesta", "Audi A6"].
            list = await vehicleService.getVehicleList();
            expect(list.at(0)?.matricula).toEqual('1234XYZ');

            // CLEANUP
            // Quitar el fijado de "Ford Fiesta".
            await vehicleService.pinVehicle(datosFord.matricula);
            list = await vehicleService.getVehicleList();
            expect(list.at(0)?.matricula === '4321XYZ').toBeTrue();

            // Borrar el vehículo "Audi".
            await vehicleService.deleteVehicle(vehiculoAudi.matricula);
        });

        it('HU502-EI02: Fijar un vehículo no registrado', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta"].
            // WHEN
            // El usuario trata de fijar un vehículo no registrado.
            await expectAsync(vehicleService.pinVehicle(datosAudi.matricula))
                .toBeRejectedWith(new MissingVehicleError());

            // THEN
            // Se lanza el error MissingVehicleError.
        });
    });

    describe('HU605: Guardar datos de vehículos', () => {

        it('HU605-EV01: Comprobación de datos guardados de vehículos ante cierre involuntario', async () => {
            // GIVEN
            //  El usuario "ramon" está registrado y ha iniciado sesión.
            //  Lista de vehículos registrados → ["Ford Fiesta"].
            const listaVehiculosAntes = [datosFord];

            //  Se cierra la sesión involuntariamente.
            await userService.logout();

            // WHEN
            //  El usuario "ramon" vuelve a iniciar sesión.
            await userService.login(ramon.email, ramon.pwd);

            // THEN
            //  Los datos de vehículos de la BD son los mismos que los introducidos previamente.
            const listaVehicle = await vehicleService.getVehicleList();
            expect(listaVehicle).toEqual(listaVehiculosAntes);
        });
    });

});
