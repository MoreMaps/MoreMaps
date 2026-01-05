import {TestBed} from '@angular/core/testing';
import {createMockRepository} from '../test-helpers';
import {PreferenceService} from '../../services/Preferences/preference.service';
import {PREFERENCE_REPOSITORY, PreferenceRepository} from '../../services/Preferences/PreferenceRepository';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {USER_REPOSITORY, UserRepository} from '../../services/User/UserRepository';
import {VEHICLE_TEST_DATA} from '../test-data';
import {VehicleModel} from '../../data/VehicleModel';
import {MissingVehicleError} from '../../errors/Vehicle/MissingVehicleError';
import {VEHICLE_REPOSITORY, VehicleRepository} from '../../services/Vehicle/VehicleRepository';
import {SessionNotActiveError} from '../../errors/User/SessionNotActiveError';
import {InvalidRouteTypeError} from '../../errors/Route/InvalidRouteTypeError';
import {PreferenceModel} from '../../data/PreferenceModel';


// Pruebas de integración sobre el servicio de obtención del coste de la electricidad
// HU504, HU505, HU506
// Se excluye HU602 por ser sobre el guardado y recuperación de datos en la BBDD
describe('Pruebas de integración sobre el servicio de preferencias', () => {
    // SUT
    let preferenceService: PreferenceService;

    // Mock de acceso a la BD (preferencias)
    let mockPreferenceRepository: jasmine.SpyObj<PreferenceRepository>;

    // Mock de acceso a la BD (usuarios)
    let mockUserRepository: jasmine.SpyObj<UserRepository>;

    // Mock de acceso a la BD (vehículos)
    let mockVehicleRepository: jasmine.SpyObj<VehicleRepository>;

    // Datos de prueba
    let ford: VehicleModel = VEHICLE_TEST_DATA[0];
    let audi: VehicleModel = VEHICLE_TEST_DATA[1];

    beforeEach(async () => {
        mockPreferenceRepository = createMockRepository('preference');
        mockUserRepository = createMockRepository('user');
        mockVehicleRepository = createMockRepository('vehicle');

        await TestBed.configureTestingModule({
            providers: [
                PreferenceService,
                {provide: PREFERENCE_REPOSITORY, useValue: mockPreferenceRepository},
                {provide: USER_REPOSITORY, useValue: mockUserRepository},
                {provide: VEHICLE_REPOSITORY, useValue: mockVehicleRepository},
            ],
        }).compileComponents();

        // Inyección del servicio
        preferenceService = TestBed.inject(PreferenceService);
    });


    // Las pruebas empiezan a partir de AQUÍ

    describe('HU504: Cambiar preferencias de tipo de transporte', () => {

        it('HU504-EV01: Cambiar preferencias de tipo de transporte a un vehículo registrado', async () => {
            // GIVEN
            // El usuario ramón ha iniciado sesión
            // Lista de vehículos registrados → [“Ford Fiesta”].
            // Vehículo por defecto sin especificar.
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockVehicleRepository.vehicleExists.and.resolveTo(true);
            mockPreferenceRepository.updatePreferences.and.resolveTo(true);
            const mockPreferences = new PreferenceModel(
                {tipoTransporte: TIPO_TRANSPORTE.VEHICULO, matricula: ford.matricula}
            );

            // WHEN
            // El usuario “ramon” intenta establecer el vehículo “Ford Fiesta” como transporte por defecto.
            const result = await preferenceService.updatePreferences(
                {tipoTransporte: TIPO_TRANSPORTE.VEHICULO, matricula: ford.matricula}
            );

            // THEN
            // No se lanza ningún error.
            // Se fija el vehículo como transporte por defecto.
            // El vehículo por defecto pasa a ser "Ford Fiesta".
            expect(result).toBeTrue();

            // Se llama a la función "updatePreferences" con los parámetros pertinentes.
            expect(mockPreferenceRepository.updatePreferences).toHaveBeenCalledWith(mockPreferences);
        });

        it('HU504-EI01: Cambiar preferencias de tipo de transporte a un vehículo no registrado', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → [“Ford Fiesta”].
            // Vehículo por defecto sin especificar.
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockVehicleRepository.vehicleExists.and.resolveTo(false);

            // WHEN
            // El usuario “ramon” intenta establecer el vehículo “Audi A6” (no registrado) como transporte por defecto.
            await expectAsync(preferenceService.updatePreferences(
                {tipoTransporte: TIPO_TRANSPORTE.VEHICULO, matricula: audi.matricula}))
                .toBeRejectedWith(new MissingVehicleError());

            // THEN
            // Se lanza el error MissingVehicleError

            // No se llama a la función "updatePreferences"
            expect(mockPreferenceRepository.updatePreferences).not.toHaveBeenCalled();
        });
    });

    describe('HU505: Cambiar preferencias de tipo de ruta', () => {

        it('HU505-EV01: Establecer un tipo de ruta válido por defecto', async () => {
            // GIVEN
            // El usuario ramón ha iniciado sesión
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPreferenceRepository.updatePreferences.and.resolveTo(true);
            const mockPreferences = new PreferenceModel({tipoRuta: PREFERENCIA.RAPIDA});

            // WHEN
            // El usuario “ramon” intenta establecer el tipo de ruta “más rápida” por defecto.
            const result = await preferenceService.updatePreferences({tipoRuta: PREFERENCIA.RAPIDA});

            // THEN
            // No se lanza ningún error.
            // Se fija el tipo de ruta como tipo por defecto.
            expect(result).toBeTrue();

            // Se llama a la función "updatePreferences" con los parámetros pertinentes.
            expect(mockPreferenceRepository.updatePreferences).toHaveBeenCalledWith(mockPreferences);
        });

        it('HU505-EI01: Establecer un tipo de ruta inválido por defecto', async () => {
            // GIVEN
            // El usuario ramón ha iniciado sesión
            mockUserRepository.sessionActive.and.resolveTo(true);

            // WHEN
            // El usuario “ramon” intenta establecer el tipo de ruta “más larga” (inválido) por defecto.
            const tipoInvalido = 'longest' as unknown as PREFERENCIA;
            await expectAsync(preferenceService.updatePreferences({tipoRuta: tipoInvalido}))
                .toBeRejectedWith(new InvalidRouteTypeError());

            // THEN
            // Se lanza el error InvalidRouteTypeError y no se modifica el estado.

            // No se llama a la función "updatePreferences"
            expect(mockPreferenceRepository.updatePreferences).not.toHaveBeenCalled();
        });
    });

    describe('HU506: Cambiar preferencias de la información mostrada en las rutas', async () => {

        it('HU506-EV01: Elegir información mostrada de ruta', async () => {
            // GIVEN
            // El usuario ramón ha iniciado sesión
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPreferenceRepository.updatePreferences.and.resolveTo(true);
            const mockPreferences = new PreferenceModel({costeCombustible: false});

            // WHEN
            // El usuario “ramon” intenta deseleccionar el campo “coste del combustible” para mostrar al buscar una ruta.
            const res = await preferenceService.updatePreferences({costeCombustible: false});

            // THEN
            // No se lanza ningún error.
            // Se modifica la preferencia.
            expect(res).toBeTrue();

            // Se llama a la función "updatePreferences" con los parámetros pertinentes.
            expect(mockPreferenceRepository.updatePreferences).toHaveBeenCalledWith(mockPreferences);
        });

        it('HU506-EI01: Elegir información mostrada de ruta sin iniciar sesión', async () => {
            // GIVEN
            // El usuario no ha iniciado sesión
            mockUserRepository.sessionActive.and.resolveTo(false);

            // WHEN
            // Se intenta deseleccionar el campo “coste del combustible” para mostrar al buscar una ruta.
            await expectAsync(preferenceService.updatePreferences({costeCombustible: false}))
                .toBeRejectedWith(new SessionNotActiveError());

            // THEN
            // Se lanza el error SessionNotActiveError y no se modifica el estado.

            // No se llama a la función "updatePreferences"
            expect(mockPreferenceRepository.updatePreferences).not.toHaveBeenCalled();
        });
    });

    describe('EXTRA: Actualizar preferencias vacías', async () => {

        it('EV01: Actualizar preferencias sin cambiar ninguna preferencia', async () => {
            // GIVEN
            // El usuario ramón ha iniciado sesión
            mockUserRepository.sessionActive.and.resolveTo(true);

            // WHEN
            // El usuario “ramon” intenta actualizar las preferencias sin especificar ninguna.
            const res = await preferenceService.updatePreferences({});

            // THEN
            // No se lanza ningún error.
            // No se modifican las preferencias.
            expect(res).toBeTrue();

            // No llama a la función "updatePreferences".
            expect(mockPreferenceRepository.updatePreferences).not.toHaveBeenCalled();
        });
    });
})
