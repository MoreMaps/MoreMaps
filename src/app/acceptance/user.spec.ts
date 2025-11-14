import {TestBed} from '@angular/core/testing'
import {USER_TEST_DATA} from './test-data';
import {USER_REPOSITORY} from '../services/User/UserRepository';
import {UserModel} from '../data/UserModel';
import {UserService} from '../services/User/user.service';
import {UserDB} from '../services/User/UserDB';
import {UserNotFoundError} from '../errors/UserNotFoundError';
import {WrongPasswordFormatError} from '../errors/WrongPasswordFormatError';
import {SessionNotActiveError} from '../errors/DBAccessError';
import {AccountNotFoundError} from '../errors/AccountNotFoundError';


// it01: HU101, HU102, HU105, HU106, HU603
describe('Pruebas sobre usuarios', () => {
    let userService: UserService;
    let ramon = USER_TEST_DATA[0];

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [UserService,
                {provide: USER_REPOSITORY, useClass: UserDB}]
        }).compileComponents();

        userService = TestBed.inject(UserService);
    });

    describe('HU101: Registrar Usuario', () => {

        it('HU101-EV01: Registrar nuevo usuario válido', async () => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye a "ramon"
            //  no se ha iniciado sesión

            // WHEN
            //  el usuario "ramon" intenta darse de alta
            const usuarioCreado : UserModel = await userService.signUp(ramon.email, ramon.pwd, ramon.nombre, ramon.apellidos);

            // THEN
            //  el usuario "ramon" se registra correctamente
            expect(usuarioCreado).toEqual(jasmine.objectContaining({
                uid: jasmine.any(String),    // UID válido cualquiera
                email: ramon.email,
                nombre: ramon.nombre,
                apellidos: ramon.apellidos
            }));

            // la base de datos vuelve al estado inicial
            await userService.deleteUser(usuarioCreado);
        });

        it('HU101-EI01: Registrar nuevo usuario con contraseña inválida', async () => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye al usuario "ramon"
            //  no se ha iniciado sesión

            // WHEN
            //  el usuario "ramon" intenta darse de alta con contraseña "password" (no sigue el formato correcto)
            await expectAsync(userService.signUp(ramon.email, "password", ramon.nombre, ramon.apellidos)).toBeRejectedWith(new WrongPasswordFormatError());
            // THEN
            //  el usuario "ramon" no se registra y se lanza el error WrongPasswordFormatError
        });
    });


    describe('HU102: Iniciar sesión', () => {

        it('HU102-EV01: Iniciar sesión con una cuenta registrada', async () => {
            // GIVEN
            //  lista de usuarios registrados que incluye a "ramon"
            //  no se ha iniciado sesión
            const usuarioCreado = await userService.signUp(ramon.email, ramon.pwd, ramon.nombre, ramon.apellidos);

            // WHEN
            // el usuario "ramon" intenta iniciar sesión con su email y contraseña
            const sesionIniciada = await userService.login(ramon.email, ramon.pwd);

            // THEN
            //  el usuario "ramon" inicia sesión correctamente
            expect(sesionIniciada).toBeTrue();

            // la base de datos vuelve al estado inicial
            await userService.deleteUser(usuarioCreado);
        });

        it('HU102-EI01: Iniciar sesión con una cuenta que no existe', async () => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye a "ramon"
            //  no se ha iniciado sesión

            // WHEN
            // ramon intenta iniciar sesión con su email y contraseña
            await expectAsync(userService.login(ramon.email, ramon.pwd)).toBeRejectedWith(UserNotFoundError);
            // THEN
            //  el usuario no se registra y se lanza el error UserNotFoundError
        });
    })


    describe('HU105: Cerrar sesión', () => {

        it('HU105-EV01: Cerrar una sesión activa', async () => {
            // GIVEN
            //  lista de usuarios registrados que incluye a "ramon"
            const usuarioCreado = await userService.signUp(ramon.email, ramon.pwd, ramon.nombre, ramon.apellidos);

             //  sesión activa con el usuario "ramon"
            await userService.login(ramon.email, ramon.pwd);

            // WHEN
            //  se intenta cerrar sesión
            const respuesta = await userService.logout();

            // THEN
            //  se cierra la sesión
            expect(respuesta).toBeTrue();

            // la base de datos vuelve al estado inicial
            await userService.deleteUser(usuarioCreado);
        });

        it('HU105-EI01: Cerrar una sesión cuando no hay sesión activa', async () => {
            // GIVEN
            //  no hay ninguna sesión activa

            // WHEN
            //  se intenta cerrar sesión
            await expectAsync(userService.logout()).toBeRejectedWith(SessionNotActiveError);
            // THEN
            //  se lanza el error SessionNotActiveError y no se cierra la sesión
        });
    });


    describe('HU106: Eliminar cuenta', () => {

        it('HU106-EV01: Eliminar una cuenta existente', async () => {
            // GIVEN
            //  el usuario "ramon" está registrado y ha iniciado sesión
            const usuarioCreado = await userService.signUp(ramon.email, ramon.pwd, ramon.nombre, ramon.apellidos);
            await userService.login(ramon.email, ramon.pwd);

            // WHEN
            //  se intenta eliminar la cuenta
            const usuarioBorrado = await userService.deleteUser(usuarioCreado);

            // THEN
            //  se elimina la cuenta
            expect(usuarioBorrado).toEqual(usuarioCreado);
        });

        it('HU106-EI01: Eliminar una cuenta que no existe', async () => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye a "ramon"
            //  no se ha iniciado sesión

            // WHEN
            //  se intenta eliminar la cuenta
            const usuarioQueNoExiste = {
                uid: "?",                        // UID que NO existe
                email: ramon.email,
                nombre: ramon.nombre,
                apellidos: ramon.apellidos
            }
            await expectAsync(userService.deleteUser(usuarioQueNoExiste)).toBeRejectedWith(new AccountNotFoundError());
            // THEN
            //  se lanza el error AccountNotFoundError y no se elimina ninguna cuenta
        });
    });

    describe('HU603: Guardar datos de usuarios', () => {

        it('HU603-EV01: Protección ante cierre involuntario cuando se pueden volcar los datos', async () => {
            // GIVEN
            //  el usuario "ramon" ha iniciado sesión
            const usuarioCreado = await userService.signUp(ramon.email, ramon.pwd, ramon.nombre, ramon.apellidos);
            await userService.login(ramon.email, ramon.pwd);
            
            //  se cierra la sesión involuntariamente
            await userService.logout();

            // WHEN
            //  el usuario "ramon" vuelve a iniciar sesión
            await userService.login(ramon.email, ramon.pwd);
            const usuarioActual = await userService.getCurrentUser();

            // THEN
            //  los datos de usuario de la BD son los mismos que los introducidos previamente
            expect(usuarioActual).toEqual(usuarioCreado);

            // la base de datos vuelve al estado inicial
            await userService.deleteUser(usuarioCreado);
        });


        // No hay caso inválido, ya que la base de datos es una dependencia externa.
    })
})
