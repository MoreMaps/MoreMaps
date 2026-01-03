import {TestBed} from '@angular/core/testing';
import {appConfig} from '../../app.config';
import {PreferenceService} from '../../services/Preferences/preference.service';
import {UserService} from '../../services/User/user.service';
import {Auth} from '@angular/fire/auth';
import {USER_TEST_DATA, VEHICLE_TEST_DATA} from '../test-data';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {PreferenceModel} from '../../data/PreferenceModel';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {MissingVehicleError} from '../../errors/Vehicle/MissingVehicleError';
import {InvalidRouteTypeError} from '../../errors/Route/InvalidRouteTypeError';
import {SessionNotActiveError} from '../../errors/User/SessionNotActiveError';

// Pruebas de aceptación sobre preferencias
// HU504A, HU504B, HU504C, HU602
// Todos los tests dentro de este bloque usan un mayor timeout, pues son llamadas API más pesadas
fdescribe('Pruebas de aceptación sobre preferencias', () => {

    // Servicios
    let userService: UserService;
    let vehicleService: VehicleService;
    let preferenceService: PreferenceService;

    // Utilizamos Auth en beforeAll y afterAll para comprobar que se cierra sesión correctamente.
    let auth: Auth;

    // Datos de prueba de usuarios
    const ramon = USER_TEST_DATA[0];

    // Datos de prueba de vehículos
    const ford = VEHICLE_TEST_DATA[0];
    const audi = VEHICLE_TEST_DATA[1];

    beforeAll(async () => {
        await TestBed.configureTestingModule({
            providers: [appConfig.providers],
            teardown: {destroyAfterEach: false} // Previene que Angular destruya los inyectores después de cada test.
        }).compileComponents();

        // Inyección de los servicios
        userService = TestBed.inject(UserService);
        vehicleService = TestBed.inject(VehicleService);
        preferenceService = TestBed.inject(PreferenceService);

        // Inyección de Auth
        auth = TestBed.inject(Auth);

        // Iniciar sesión con ramón para todos los test
        // Puede que la sesión haya quedado activa...
        try {
            await userService.login(ramon.email, ramon.pwd);
        } catch (error) {
            console.info('No se ha podido iniciar sesión con el usuario "ramon": ' + error);
        }

        // Leer los datos del vehículo para los test de la HU504A
        // Registrar vehículo inicial "Ford Fiesta" para tener estado base en algunos tests
        try {
            await vehicleService.readVehicle(ford.matricula);
        }
        // Lanza un error si no existe, entonces se crea
        catch (error) {
            await vehicleService.createVehicle(ford);
        }

        // Borrar todas las preferencias del usuario (si hubiera)
        await preferenceService.clearPreferences();
    });

    afterEach(async () => {
        // Borrar todas las preferencias del usuario (si hubiera)
        await preferenceService.clearPreferences();
    });

    // Se cierra la sesión al terminar los tests y se informa del resultado
    afterAll(async () => {
        if (auth.currentUser) {
            try {
                await userService.logout();
            } catch (error) {
                console.error('Fallo al hacer logout en afterALl de user.spec.ts.');
            }
            console.info('Logout en afterAll de user.spec.ts funcionó correctamente.');
        }
    });

    // Las pruebas empiezan a partir de AQUÍ

    describe('HU504A: Cambiar preferencias de tipo de transporte', () => {

        it('HU504A-EV01: Establecer vehículo como transporte por defecto', async () => {
            // GIVEN
            // El usuario ramón ha iniciado sesión
            // Lista de vehículos registrados → [“Ford Fiesta”].
            // Vehículo por defecto sin especificar.

            // WHEN
            // El usuario “ramon” intenta establecer el vehículo “Ford Fiesta” como transporte por defecto.
            const res = await preferenceService.updatePreferences(
                {tipoTransporte: TIPO_TRANSPORTE.VEHICULO, matricula: ford.matricula}
            );

            // THEN
            // No se lanza ningún error.
            // Se fija el vehículo como transporte por defecto.
            expect(res).toBeTrue();
            // El vehículo por defecto pasa a ser "Ford Fiesta".
            const preferencias = await preferenceService.readPreferences();
            expect(preferencias.matricula).toBe(ford.matricula);
        });

        it('HU504A-EI01: Establecer vehículo no registrado como transporte por defecto.', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión.
            // Lista de vehículos registrados → [“Ford Fiesta”].
            // Vehículo por defecto sin especificar.

            // WHEN
            // El usuario “ramon” intenta establecer el vehículo “Audi A6” como transporte por defecto.
            await expectAsync(preferenceService.updatePreferences(
                {tipoTransporte: TIPO_TRANSPORTE.VEHICULO, matricula: audi.matricula}))
                .toBeRejectedWith(new MissingVehicleError());

            // THEN
            // Se lanza el error MissingVehicleError y no se modifica el estado.
        });
    });

    describe('HU504B: Cambiar preferencias de tipo de ruta', () => {

        it('HU504B-EV01: Establecer un tipo de ruta válido por defecto', async () => {
            // GIVEN
            // El usuario ramón ha iniciado sesión

            // WHEN
            // El usuario “ramon” intenta establecer el tipo de ruta “más rápida” por defecto.
            const res = await preferenceService.updatePreferences(
                {tipoRuta: PREFERENCIA.RAPIDA}
            );

            // THEN
            // No se lanza ningún error.
            // Se fija el tipo de ruta como tipo por defecto.
            expect(res).toBeTrue();

            // El tipo de ruta por defecto pasa a ser "más rápida".
            const preferencias = await preferenceService.readPreferences();
            expect(preferencias.tipoRuta).toBe(PREFERENCIA.RAPIDA);
        });

        it('HU504B-EI01: Establecer un tipo de ruta inválido por defecto', async () => {
            // GIVEN
            // El usuario ramón ha iniciado sesión

            // WHEN
            // El usuario “ramon” intenta establecer el tipo de ruta “más larga” por defecto.
            const tipoInvalido = 'longest' as unknown as PREFERENCIA;
            await expectAsync(preferenceService.updatePreferences({tipoRuta: tipoInvalido}))
                .toBeRejectedWith(new InvalidRouteTypeError());
            // THEN
            // Se lanza el error InvalidRouteTypeError y no se modifica el estado.
        });
    });

    describe('HU504C: Cambiar preferencias de la información mostrada en las rutas', () => {

        it('HU504C-EV01: Elegir información mostrada de ruta', async () => {
            // GIVEN
            // El usuario ramón ha iniciado sesión

            // WHEN
            // El usuario “ramon” intenta desseleccionar el campo “coste del combustible” para mostrar al buscar una ruta.
            const res = await preferenceService.updatePreferences({costeCombustible: false});

            // THEN
            // No se lanza ningún error.
            // Se modifica la preferencia.
            expect(res).toBeTrue();

            // Ya no se muestra el combustible por defecto.
            const preferencias = await preferenceService.readPreferences();
            expect(preferencias.costeCombustible).toBe(false);
        });

        it('HU504C  -EI01: Elegir información mostrada de ruta sin iniciar sesión', async () => {
            // GIVEN
            // El usuario no ha iniciado sesión
            await userService.logout();

            try{
                // WHEN
                // Se intenta desseleccionar el campo “coste del combustible” para mostrar al buscar una ruta.
                await expectAsync(preferenceService.updatePreferences({costeCombustible: false}))
                    .toBeRejectedWith(new SessionNotActiveError());
                // THEN
                // Se lanza el error SessionNotActiveError y no se modifica el estado.
            } // CLEANUP: Volvemos a iniciar sesión
            finally {await userService.login(ramon.email, ramon.pwd);}
        });

    });

    describe('EXTRA: reiniciar preferencias por defecto', () => {
        it('Reiniciar preferencias a aquellas por defecto', async () => {
            // GIVEN
            // El usuario "ramon" ha iniciado sesión
            // “ramon” tiene las preferencias por defecto, salvo por el tipo de ruta, que es “recommended”
            let preferencias = new PreferenceModel();
            preferencias.tipoRuta = PREFERENCIA.RECOMENDADA;
            let isUpdated = await preferenceService.updatePreferences(preferencias);
            //if (!isUpdated) pending('Fallo al actualizar preferencias, abortando...');

            // WHEN
            // "ramon" reinicia sus preferencias
            let res = await preferenceService.clearPreferences();

            // THEN
            // Se elimina su objeto de preferencias.
            expect(res).toBeTrue()
            let preferenciasPorDefecto = new PreferenceModel();
            let preferenciasTrasClear = await preferenceService.readPreferences();
            expect(preferenciasTrasClear).toEqual(preferenciasPorDefecto);
        });
    });

    describe('HU602: Comprobación de datos guardados de preferencias ante cierre involuntario', () => {
        it('HU602-EV01: Almacenar preferencias de un usuario con la sesión iniciada.', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión
            // “ramon” tiene las preferencias por defecto, salvo por el tipo de ruta, que es “recommended”
            let preferenciasAntesDelCierre = new PreferenceModel();
            preferenciasAntesDelCierre.tipoRuta = PREFERENCIA.RECOMENDADA;
            let isUpdated = await preferenceService.updatePreferences(preferenciasAntesDelCierre);
            //if (!isUpdated) pending('Fallo al actualizar preferencias, abortando...');

            // WHEN
            // El usuario “ramon” cierra sesión...
            await userService.logout();
            // ... la inicia de nuevo...
            await userService.login(ramon.email, ramon.pwd);
            // ... e intenta acceder a sus preferencias
            let preferenciasTrasElCierre = await preferenceService.readPreferences();

            // THEN
            // Se conservan las preferencias fijadas por el usuario antes
            expect(preferenciasTrasElCierre).toEqual(preferenciasAntesDelCierre);

            // CLEANUP no necesario; se trata en AfterEach
        });

        it('HU602-EI01: Almacenar preferencias de un usuario sin iniciar sesión.', async () => {
            // GIVEN
            // El usuario “ramon” ha iniciado sesión

            // WHEN
            // El usuario “ramon” cierra sesión...
            await userService.logout();
            try {
            // ... e intenta acceder a sus preferencias
                await expectAsync(preferenceService.readPreferences())
                    .toBeRejectedWith(new SessionNotActiveError());
            // THEN
            // Se lanza el error SessionNotActiveError
            } finally {
                // CLEANUP: Se vuelve a iniciar sesión
                await userService.login(ramon.email, ramon.pwd);
            }
        });
    });
});
