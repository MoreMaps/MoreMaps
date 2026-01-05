import {TestBed} from '@angular/core/testing';
import {VEHICLE_TEST_DATA} from '../test-data';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {VehicleModel} from '../../data/VehicleModel';
import {VehicleAlreadyExistsError} from '../../errors/Vehicle/VehicleAlreadyExistsError';
import {MissingVehicleError} from '../../errors/Vehicle/MissingVehicleError';
import {USER_REPOSITORY, UserRepository} from '../../services/User/UserRepository';
import {VEHICLE_REPOSITORY, VehicleRepository} from '../../services/Vehicle/VehicleRepository';
import {createMockRepository} from '../test-helpers';
import {PREFERENCE_REPOSITORY, PreferenceRepository} from '../../services/Preferences/PreferenceRepository';
import {PreferenceModel} from '../../data/PreferenceModel';


// Pruebas de integración sobre vehículos
// HU301, HU302, HU303, HU304, HU305, HU502
// // Se excluye HU605 por ser sobre el guardado y recuperación de datos en la BBDD
describe('Pruebas de integración sobre vehículos', () => {
    // SUT
    let vehicleService: VehicleService;

    // Mock de acceso a la BD (usuario)
    let mockUserRepository: jasmine.SpyObj<UserRepository>;

    // Mock de acceso a la BD (vehículo)
    let mockVehicleRepository: jasmine.SpyObj<VehicleRepository>;

    // Mock de acceso a la BD (preferencias)
    let mockPreferenceRepository: jasmine.SpyObj<PreferenceRepository>;

    // Datos de prueba
    const ford: VehicleModel = VEHICLE_TEST_DATA[0] as VehicleModel;
    const audi: VehicleModel = VEHICLE_TEST_DATA[1] as VehicleModel;

    beforeEach(async () => {
        mockUserRepository = createMockRepository('user');
        mockVehicleRepository = createMockRepository('vehicle');
        mockPreferenceRepository = createMockRepository('preference');

        await TestBed.configureTestingModule({
            providers: [
                VehicleService,
                {provide: VEHICLE_REPOSITORY, useValue: mockVehicleRepository},
                {provide: USER_REPOSITORY, useValue: mockUserRepository},
                {provide: PREFERENCE_REPOSITORY, useValue: mockPreferenceRepository},
            ],
        }).compileComponents();

        // Inyección del servicio
        vehicleService = TestBed.inject(VehicleService);

        // Se asume que la sesión está activa en todos los tests.
        mockUserRepository.sessionActive.and.resolveTo(true);
    });


    // Las pruebas empiezan a partir de AQUÍ

    describe('HU301: Registrar nuevo vehículo', () => {

        it('HU301-EV01: Registrar nuevo vehículo "Ford Fiesta"', async () => {
            // GIVEN
            // El usuario "ramon" ha iniciado sesión
            // Lista de vehículos registrados → ["Ford Fiesta"] (No contiene "Audi A6")
            const mockVehicle: VehicleModel = new VehicleModel(audi.alias, audi.matricula, audi.marca,
                audi.modelo, audi.anyo, audi.tipoCombustible, audi.consumoMedio, audi.pinned);

            mockVehicleRepository.vehicleExists.and.resolveTo(false);
            mockVehicleRepository.createVehicle.and.resolveTo(mockVehicle);

            // WHEN
            // El usuario intenta registrar el vehículo
            const vehiculoCreado = await vehicleService.createVehicle(mockVehicle);

            // THEN
            // Se llama a la función "createVehicle" con los parámetros pertinentes
            expect(mockVehicleRepository.createVehicle).toHaveBeenCalledWith(mockVehicle);

            // Se da de alta el vehículo
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
        });

        it('HU301-EI01: Registrar vehículo ya existente', async () => {
            // GIVEN
            // El usuario "ramon" ha iniciado sesión
            // Lista de vehículos registrados → ["Ford Fiesta"]
            const mockVehicle: VehicleModel = new VehicleModel(ford.alias, ford.matricula, ford.marca,
                ford.modelo, ford.anyo, ford.tipoCombustible, ford.consumoMedio, ford.pinned);

            mockVehicleRepository.vehicleExists.and.resolveTo(true);

            // WHEN
            // El usuario intenta registrar el vehículo "Ford Fiesta" nuevamente.
            await expectAsync(vehicleService.createVehicle(mockVehicle))
                .toBeRejectedWith(new VehicleAlreadyExistsError());

            // THEN
            // Se lanza el error VehicleAlreadyExistsError

            // No se llama a la función "createVehicle"
            expect(mockVehicleRepository.createVehicle).not.toHaveBeenCalled();
        });
    });

    describe('HU302: Consultar lista de vehículos', () => {

        it('HU302-EV01: Consultar el listado vacío de vehículos', async () => {
            // GIVEN
            // El usuario maria se ha registrado y ha iniciado sesión
            mockVehicleRepository.getVehicleList.and.resolveTo([]);

            // WHEN
            // El usuario maria consulta su lista de vehículos registrados (vacía)
            let list: VehicleModel[] = await vehicleService.getVehicleList();

            // THEN
            // Se llama a la función "getVehicleList"
            expect(mockVehicleRepository.getVehicleList).toHaveBeenCalled();

            // Se devuelve una lista vacía y se indica que no hay vehículos registrados.
            expect(list.length).toBe(0);
        });

        it('HU302-EV02: Consultar lista no vacía de vehículos', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta"]
            const mockVehicle: VehicleModel = new VehicleModel(ford.alias, ford.matricula, ford.marca,
                ford.modelo, ford.anyo, ford.tipoCombustible, ford.consumoMedio, ford.pinned);

            mockVehicleRepository.getVehicleList.and.resolveTo([mockVehicle]);

            // WHEN
            // El usuario consulta su lista de vehículos registrados.
            const listaVehiculos = await vehicleService.getVehicleList();

            // THEN
            // Se llama a la función "getVehicleList"
            expect(mockVehicleRepository.getVehicleList).toHaveBeenCalled();

            // Se muestra el listado de vehículos registrados, con un elemento.
            expect(listaVehiculos.length).toEqual(1);
        });
    });

    describe('HU303: Modificar datos de un vehículo', () => {

        it('HU303-EV01: Modificar datos de un vehículo registrado', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta"] (con matrícula "1234XYZ")
            const mockVehicle: VehicleModel = new VehicleModel(ford.alias, ford.matricula, ford.marca,
                ford.modelo, ford.anyo, ford.tipoCombustible, ford.consumoMedio, ford.pinned);

            mockVehicleRepository.vehicleExists.and.returnValues(
                Promise.resolve(true),
                Promise.resolve(false)
            );
            mockVehicleRepository.updateVehicle.and.resolveTo(true);

            // WHEN
            // El usuario trata de modificar la matrícula del vehículo "Ford Fiesta" a "1235ZYX".
            const nuevaMatricula = "1235ZYX";

            const vehiculoModificado = await vehicleService
                .updateVehicle(mockVehicle.matricula, {matricula: nuevaMatricula});

            // THEN
            // Se llama a la función "updateVehicle" con los parámetros pertinentes
            expect(mockVehicleRepository.updateVehicle)
                .toHaveBeenCalledWith(mockVehicle.matricula, {matricula: nuevaMatricula});

            // Se modifica la matrícula.
            expect(vehiculoModificado).toBeTrue();
        });

        it('HU303-EI01: Modificar matrícula de un vehículo para que coincida con la de otro', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta", "Audi A6"]
            const mockVehicleFord: VehicleModel = new VehicleModel(ford.alias, ford.matricula, ford.marca,
                ford.modelo, ford.anyo, ford.tipoCombustible, ford.consumoMedio, ford.pinned);
            const mockVehicleAudi: VehicleModel = new VehicleModel(audi.alias, audi.matricula, audi.marca,
                audi.modelo, audi.anyo, audi.tipoCombustible, audi.consumoMedio, audi.pinned);

            mockVehicleRepository.vehicleExists.and.resolveTo(true);

            // WHEN
            // El usuario trata de modificar la matrícula del vehículo Audi (4321XYZ) a la del "Ford Fiesta" (1234XYZ)
            await expectAsync(vehicleService
                .updateVehicle(mockVehicleAudi.matricula, {matricula: mockVehicleFord.matricula}))
                .toBeRejectedWith(new VehicleAlreadyExistsError());

            // THEN
            // Se lanza el error VehicleAlreadyExistsError.

            // No se llama a la función "updateVehicle"
            expect(mockVehicleRepository.updateVehicle).not.toHaveBeenCalled();
        });
    });

    describe('HU304: Eliminar un vehículo', () => {

        it('HU304-EV01: Eliminar vehículo registrado', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta", "Audi A6"]
            const mockVehicle: VehicleModel = new VehicleModel(audi.alias, audi.matricula, audi.marca,
                audi.modelo, audi.anyo, audi.tipoCombustible, audi.consumoMedio, audi.pinned);
            const mockPreferences: PreferenceModel = PreferenceModel.fromJSON({matricula: audi.matricula});

            mockVehicleRepository.vehicleExists.and.resolveTo(true);
            mockVehicleRepository.deleteVehicle.and.resolveTo(true);
            mockPreferenceRepository.getPreferenceList.and.resolveTo(mockPreferences);
            mockPreferenceRepository.updatePreferences.and.resolveTo(true);

            // WHEN
            // El usuario trata de eliminar el vehículo.
            const resultado = await vehicleService.deleteVehicle(mockVehicle.matricula);

            // THEN
            // Se llama a la función "deleteVehicle" con los parámetros pertinentes
            expect(mockVehicleRepository.deleteVehicle).toHaveBeenCalledWith(mockVehicle.matricula);

            // No se lanza ningún error. Se elimina el vehículo de la lista.
            expect(resultado).toBeTrue();
        });

        it('HU304-EI01: Eliminar vehículo no registrado', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta"].
            mockVehicleRepository.vehicleExists.and.resolveTo(false);

            // WHEN
            // El usuario trata de eliminar el vehículo "Audi A6" (no registrado).
            await expectAsync(vehicleService.deleteVehicle(audi.matricula))
                .toBeRejectedWith(new MissingVehicleError());

            // THEN
            // Se lanza el error MissingVehicleError.

            // No se llama a la función "deleteVehicle"
            expect(mockVehicleRepository.deleteVehicle).not.toHaveBeenCalled();
        });
    });

    describe('HU305: Consultar información de un vehículo', () => {

        it('HU305-EV01: Consultar información de un vehículo registrado', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta"].
            const mockVehicle: VehicleModel = new VehicleModel(ford.alias, ford.matricula, ford.marca,
                ford.modelo, ford.anyo, ford.tipoCombustible, ford.consumoMedio, ford.pinned);

            mockVehicleRepository.vehicleExists.and.resolveTo(true);
            mockVehicleRepository.getVehicle.and.resolveTo(mockVehicle);

            // WHEN
            // El usuario consulta los datos del vehículo "Ford Fiesta".
            const datosVehiculo = await vehicleService.readVehicle(mockVehicle.matricula);

            // THEN
            // Se llama a la función "getVehicle" con los parámetros pertinentes
            expect(mockVehicleRepository.getVehicle).toHaveBeenCalledWith(mockVehicle.matricula);

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
            // Lista de vehículos registrados → ["Ford Fiesta"].
            mockVehicleRepository.vehicleExists.and.resolveTo(false);

            // WHEN
            // El usuario consulta los datos del vehículo “Audi A6” (no registrado).
            await expectAsync(vehicleService.readVehicle(audi.matricula))
                .toBeRejectedWith(new MissingVehicleError());

            // THEN
            // Se lanza el error MissingVehicleError.

            // No se llama a la función "getVehicle"
            expect(mockVehicleRepository.getVehicle).not.toHaveBeenCalled();
        });
    });

    describe('HU502: Fijar un vehículo', () => {

        it('HU502-EV01: Fijar un vehículo registrado', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta", "Audi A6"].
            // Los vehículos no están fijados.
            const mockVehicle: VehicleModel = new VehicleModel(ford.alias, ford.matricula, ford.marca,
                ford.modelo, ford.anyo, ford.tipoCombustible, ford.consumoMedio, ford.pinned);

            mockVehicleRepository.vehicleExists.and.resolveTo(true);
            mockVehicleRepository.pinVehicle.and.resolveTo(true);

            // WHEN
            // El usuario trata de fijar el vehículo "Ford Fiesta".
            const vehiculoFijado = await vehicleService.pinVehicle(mockVehicle.matricula);

            // THEN
            // Se llama a la función "pinVehicle" con los parámetros pertinentes
            expect(mockVehicleRepository.pinVehicle).toHaveBeenCalledWith(mockVehicle.matricula);

            // El vehículo "Ford Fiesta" pasa a estar fijado (pinned = true).
            expect(vehiculoFijado).toBeTrue();
        });

        it('HU502-EI02: Fijar un vehículo no registrado', async () => {
            // GIVEN
            // Lista de vehículos registrados → ["Ford Fiesta"].
            mockVehicleRepository.vehicleExists.and.resolveTo(false);

            // WHEN
            // El usuario trata de fijar un vehículo no registrado.
            await expectAsync(vehicleService.pinVehicle(audi.matricula))
                .toBeRejectedWith(new MissingVehicleError());

            // THEN
            // Se lanza el error MissingVehicleError.

            // No se llama a la función "pinVehicle"
            expect(mockVehicleRepository.pinVehicle).not.toHaveBeenCalled();
        });
    });
});
