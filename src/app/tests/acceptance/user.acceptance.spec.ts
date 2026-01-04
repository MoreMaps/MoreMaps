import {TestBed} from '@angular/core/testing'
import {UserService} from '../../services/User/user.service';
import {POIService} from '../../services/POI/poi.service';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {RouteService} from '../../services/Route/route.service';
import {UserModel} from '../../data/UserModel';
import {POI_TEST_DATA, ROUTE_TEST_DATA, USER_TEST_DATA, VEHICLE_TEST_DATA} from '../test-data';
import {appConfig} from '../../app.config';
import {UserNotFoundError} from '../../errors/User/UserNotFoundError';
import {WrongPasswordFormatError} from '../../errors/User/WrongPasswordFormatError';
import {SessionNotActiveError} from '../../errors/User/SessionNotActiveError';
import {RouteResultModel} from '../../data/RouteResultModel';
import {RegisterModel} from '../../data/RegisterModel';
import {PreferenceService} from '../../services/Preferences/preference.service';


// it01: HU101, HU102, HU105, HU106, HU603
describe('Pruebas sobre usuarios', () => {
    let userService: UserService;
    let poiService: POIService;
    let vehicleService: VehicleService;
    let routeService: RouteService;
    let preferenceService: PreferenceService;
    let usuarioRegistradoRamon: UserModel;

    // Datos de prueba
    const ramon = USER_TEST_DATA[0];
    const maria = USER_TEST_DATA[1];

    const poiA = POI_TEST_DATA[0];
    const poiB = POI_TEST_DATA[1];

    const ford = VEHICLE_TEST_DATA[0];

    const rutaC = ROUTE_TEST_DATA[0];

    beforeAll( async() => {
        await TestBed.configureTestingModule({
            providers: [appConfig.providers]
        }).compileComponents();

        // Inyección de servicios
        userService = TestBed.inject(UserService);
        poiService = TestBed.inject(POIService);
        vehicleService = TestBed.inject(VehicleService);
        routeService = TestBed.inject(RouteService);
        preferenceService = TestBed.inject(PreferenceService);
    });


    describe('HU101: Registrar Usuario', () => {

        it('HU101-EV01: Registrar nuevo usuario válido', async () => {
            // GIVEN
            // Lista de usuarios registrados vacía que no incluye a "maria"
            // No se ha iniciado sesión

            // WHEN
            // El usuario "maria" intenta darse de alta
            const usuarioCreado: UserModel = await userService.signUp(maria);

            // THEN
            // El usuario "maria" se registra correctamente
            expect(usuarioCreado).toEqual(jasmine.objectContaining({
                uid: jasmine.any(String),    // UID válido cualquiera
                email: maria.email,
                nombre: maria.nombre,
                apellidos: maria.apellidos,
            }));

            // LIMPIEZA: la base de datos vuelve al estado inicial
            await userService.deleteUser();
        }, 10000);

        it('HU101-EI01: Registrar nuevo usuario con contraseña inválida', async () => {
            // GIVEN
            // Lista de usuarios registrados vacía que no incluye al usuario "maria"
            // No se ha iniciado sesión

            // WHEN
            // El usuario "maria" intenta darse de alta con contraseña "password" (no sigue el formato correcto)
            const mariaPwdIncorrect = new RegisterModel(maria.email, maria.nombre, maria.apellidos, "password");
            await expectAsync(userService.signUp(mariaPwdIncorrect))
                .toBeRejectedWith(new WrongPasswordFormatError());
            // THEN
            // El usuario "maria" no se registra y se lanza el error WrongPasswordFormatError
        });
    });


    describe('HU102: Iniciar sesión', () => {

        it('HU102-EV01: Iniciar sesión con una cuenta registrada', async () => {
            // GIVEN
            // Lista de usuarios registrados que incluye a "ramon"
            // No se ha iniciado sesión

            // WHEN
            // el usuario "ramon" intenta iniciar sesión con su email y contraseña
            const sesionIniciada = await userService.login(ramon.email, ramon.pwd);

            // THEN
            //  el usuario "ramon" inicia sesión correctamente
            expect(sesionIniciada).toBeTrue();

            // se cierra la sesion
            await userService.logout();
        }, 10000);

        it('HU102-EI01: Iniciar sesión con una cuenta que no existe', async () => {
            // GIVEN
            // Lista de usuarios registrados vacía que no incluye a "maria"
            // No se ha iniciado sesión

            // WHEN
            // Se intenta iniciar sesión con los datos del usuario "maria"
            await expectAsync(userService.login(maria.email, maria.pwd)).toBeRejectedWith(new UserNotFoundError());
            // THEN
            // El usuario no se registra y se lanza el error UserNotFoundError
        });
    })


    describe('HU105: Cerrar sesión', () => {

        it('HU105-EV01: Cerrar una sesión activa', async () => {
            // GIVEN
            // Lista de usuarios registrados que incluye a "ramon"
            // Sesión activa con el usuario "ramon"
            await userService.login(ramon.email, ramon.pwd);

            // WHEN
            // Se intenta cerrar sesión
            const sesionCerrada = await userService.logout();

            // THEN
            // Se cierra la sesión
            expect(sesionCerrada).toBeTrue();
        }, 10000);

        it('HU105-EI01: Cerrar una sesión cuando no hay sesión activa', async () => {
            // GIVEN
            // No hay ninguna sesión activa

            // WHEN
            // Se intenta cerrar sesión
            await expectAsync(userService.logout()).toBeRejectedWith(new SessionNotActiveError());
            // THEN
            // Se lanza el error SessionNotActiveError y no se cierra la sesión
        });
    });

    describe('HU106: Eliminar cuenta', () => {

        // Este test es bastante intensivo, así que el timeout son 30s.
        it('HU106-EV01: Eliminar una cuenta existente', async () => {
            // GIVEN
            // Lista de usuarios registrados incluye a "maria"
            await userService.signUp(maria);

            // El usuario "maria" tiene los POI "A" y "B", el vehículo "Ford Fiesta" y la ruta "A - B" dados de alta
            // Simulamos el coste para no llamar a la API.
            await poiService.createPOI(poiA)
            await poiService.createPOI(poiB)
            await vehicleService.createVehicle(ford);
            const result = new RouteResultModel(rutaC.distancia, rutaC.tiempo, undefined as any);
            await routeService.createRoute(rutaC.geohash_origen, rutaC.geohash_destino, '',
                rutaC.transporte, rutaC.nombre_origen, rutaC.nombre_destino,
                rutaC.preferencia, result, rutaC.matricula);

            // El usuario "maria" establece el vehículo "Ford Fiesta" como vehículo por defecto
            await preferenceService.updatePreferences({matricula: ford.matricula});

            // WHEN
            // Se intenta eliminar la cuenta
            const usuarioBorrado = await userService.deleteUser();

            // THEN
            // Se elimina la cuenta y todos sus datos asociados (lugares, vehículos, rutas y preferencias)
            expect(usuarioBorrado).toBeTrue();
        }, 30000);

        it('HU106-EI01: Eliminar una cuenta existente cuya sesión está inactiva', async () => {
            // GIVEN
            // Lista de usuarios registrados incluye a "ramon"
            //  No se ha iniciado sesión

            // WHEN
            // Se intenta eliminar la cuenta "ramon" sin haber iniciado sesion
            await expectAsync(userService.deleteUser())
                .toBeRejectedWith(new SessionNotActiveError());
            // THEN
            // Se lanza el error SessionNotActiveError y no se elimina ninguna cuenta
        });
    });

    describe('HU603: Guardar datos de usuarios', () => {

        it('HU603-EV01: Comprobación de datos de usuario guardados ante cierre involuntario', async () => {
            // GIVEN
            // El usuario "ramon" está registrado y ha iniciado sesión
            await userService.login(ramon.email, ramon.pwd);
            usuarioRegistradoRamon = await userService.getCurrentUser();

            // Se cierra la sesión involuntariamente
            await userService.logout();

            // WHEN
            // El usuario "ramon" vuelve a iniciar sesión
            await userService.login(ramon.email, ramon.pwd);


            // THEN
            // Los datos de usuario de la BD son los mismos que los introducidos previamente
            expect(await userService.getCurrentUser()).toEqual(usuarioRegistradoRamon);

            // LIMPIEZA
            // "ramon" cierra sesión
            await userService.logout();
        });
    })
})
