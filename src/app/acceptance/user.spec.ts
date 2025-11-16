import {TestBed} from '@angular/core/testing'
import {USER_TEST_DATA} from './test-data';
import {USER_REPOSITORY} from '../services/User/UserRepository';
import {UserModel} from '../data/UserModel';
import {UserService} from '../services/User/user.service';
import {UserDB} from '../services/User/UserDB';
import {UserNotFoundError} from '../errors/UserNotFoundError';
import {WrongPasswordFormatError} from '../errors/WrongPasswordFormatError';
import {SessionNotActiveError} from '../errors/SessionNotActiveError';
import {AccountNotFoundError} from '../errors/AccountNotFoundError';


// it01: HU101, HU102, HU105, HU106, HU603
describe('Pruebas sobre usuarios', () => {
    let userService: UserService;
    let usuarioRegistradoRamon: UserModel

    const ramon = USER_TEST_DATA[0];
    const maria = USER_TEST_DATA[1];

    beforeAll( async() => {
        await TestBed.configureTestingModule({
            providers: [UserService, {provide: USER_REPOSITORY, useClass: UserDB}]
        }).compileComponents();

        // inyección del servicio
        userService = TestBed.inject(UserService);

        // creación de un usuario
        usuarioRegistradoRamon = await userService.signUp(ramon.email, ramon.pwd, ramon.nombre, ramon.apellidos);
    });

    afterAll( async() => {
        // eliminación del usuario creado al terminar las pruebas
        await userService.deleteUser(usuarioRegistradoRamon);
    });

    describe('HU101: Registrar Usuario', () => {

        it('HU101-EV01: Registrar nuevo usuario válido', async () => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye a "maria"
            //  no se ha iniciado sesión

            // WHEN
            //  el usuario "maria" intenta darse de alta
            const usuarioCreado: UserModel = await userService
                .signUp(maria.email, maria.pwd, maria.nombre, maria.apellidos);

            // THEN
            //  el usuario "maria" se registra correctamente
            expect(usuarioCreado).toEqual(jasmine.objectContaining({
                uid: jasmine.any(String),    // UID válido cualquiera
                email: maria.email,
                nombre: maria.nombre,
                apellidos: maria.apellidos,
            }));

            // la base de datos vuelve al estado inicial
            await userService.deleteUser(usuarioCreado);
        });

        it('HU101-EI01: Registrar nuevo usuario con contraseña inválida', async () => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye al usuario "maria"
            //  no se ha iniciado sesión

            // WHEN
            //  el usuario "maria" intenta darse de alta con contraseña "password" (no sigue el formato correcto)
            await expectAsync(userService.signUp(maria.email, "password", maria.nombre, maria.apellidos))
                .toBeRejectedWith(new WrongPasswordFormatError());
            // THEN
            //  el usuario "maria" no se registra y se lanza el error WrongPasswordFormatError
        });
    });


    describe('HU102: Iniciar sesión', () => {

        it('HU102-EV01: Iniciar sesión con una cuenta registrada', async () => {
            // GIVEN
            //  lista de usuarios registrados que incluye a "ramon"
            //  no se ha iniciado sesión

            // WHEN
            // el usuario "ramon" intenta iniciar sesión con su email y contraseña
            const sesionIniciada = await userService.login(ramon.email, ramon.pwd);

            // THEN
            //  el usuario "ramon" inicia sesión correctamente
            expect(sesionIniciada).toBeTrue();

            // se cierra la sesion
            await userService.logout();
        });

        it('HU102-EI01: Iniciar sesión con una cuenta que no existe', async () => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye a "maria"
            //  no se ha iniciado sesión

            // WHEN
            // se intenta iniciar sesión con los datos del usuario "maria"
            await expectAsync(userService.login(maria.email, maria.pwd)).toBeRejectedWith(new UserNotFoundError());
            // THEN
            //  el usuario no se registra y se lanza el error UserNotFoundError
        });
    })


    describe('HU105: Cerrar sesión', () => {

        it('HU105-EV01: Cerrar una sesión activa', async () => {
            // GIVEN
            //  lista de usuarios registrados que incluye a "ramon"
             //  sesión activa con el usuario "ramon"
            await userService.login(ramon.email, ramon.pwd);

            // WHEN
            //  se intenta cerrar sesión
            const sesionCerrada = await userService.logout();

            // THEN
            //  se cierra la sesión
            expect(sesionCerrada).toBeTrue();
        });

        it('HU105-EI01: Cerrar una sesión cuando no hay sesión activa', async () => {
            // GIVEN
            //  no hay ninguna sesión activa

            // WHEN
            //  se intenta cerrar sesión
            await expectAsync(userService.logout()).toBeRejectedWith(new SessionNotActiveError());
            // THEN
            //  se lanza el error SessionNotActiveError y no se cierra la sesión
        });
    });


    describe('HU106: Eliminar cuenta', () => {

        it('HU106-EV01: Eliminar una cuenta existente', async () => {
            // GIVEN
            //  el usuario "maria" está registrado y ha iniciado sesión
            const usuarioCreado: UserModel = await userService
                .signUp(maria.email, maria.pwd, maria.nombre, maria.apellidos);
            await userService.login(maria.email, maria.pwd);

            // WHEN
            //  se intenta eliminar la cuenta
            const usuarioBorrado = await userService.deleteUser(usuarioCreado);

            // THEN
            //  se elimina la cuenta
            expect(usuarioBorrado).toBeTrue();
        });

        it('HU106-EI01: Eliminar una cuenta que no existe', async () => {
            // GIVEN
            //  lista de usuarios registrados que no incluye a "maria"
            //  no se ha iniciado sesión

            // WHEN
            //  se intenta eliminar la cuenta
            const usuarioQueNoExiste = {
                uid: "?",                        // UID que NO existe
                email: maria.email,
                nombre: maria.nombre,
                apellidos: maria.apellidos,
            }
            await expectAsync(userService.deleteUser(usuarioQueNoExiste))
                .toBeRejectedWith(new AccountNotFoundError());
            // THEN
            //  se lanza el error AccountNotFoundError y no se elimina ninguna cuenta
        });
    });

    describe('HU603: Guardar datos de usuarios', () => {

        it('HU603-EV01: Comprobación de datos guardados ante cierre involuntario', async () => {
            // GIVEN
            //  el usuario "ramon" está registrado y ha iniciado sesión
            await userService.login(ramon.email, ramon.pwd);

            // WHEN
            //  se cierra la sesión involuntariamente
            await userService.logout();
            //  el usuario "ramon" vuelve a iniciar sesión
            await userService.login(ramon.email, ramon.pwd);

            // THEN
            //  los datos de usuario de la BD son los mismos que los introducidos previamente
            expect(usuarioRegistradoRamon).toEqual(jasmine.objectContaining({
                uid: jasmine.any(String),
                email: ramon.email,
                nombre: ramon.nombre,
                apellidos: ramon.apellidos,
            }));
        });

        // No hay caso inválido, ya que la base de datos es una dependencia externa.
    })
})
