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
    let ramon;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [UserService,
                {provide: USER_REPOSITORY, useClass: UserDB}]
        }).compileComponents();

        userService = TestBed.inject(UserService);
    });

    describe('HU101: Registrar Usuario', () => {

        it('HU101-EV01: Registrar nuevo usuario válido', async() => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye a "ramon"
            //  no se ha iniciado sesión

            // WHEN
            //  el usuario intenta darse de alta
            ramon = USER_TEST_DATA[0];
            const usuarioCreado : UserModel = await userService.signUp(ramon.email, ramon.pwd, ramon.nombre, ramon.apellidos);

            // THEN
            //  el usuario se registra correctamente
            expect(usuarioCreado).toEqual(jasmine.objectContaining({
                uid: "???",
                email: "ramonejemplo@gmail.com",
                nombre: "Ramón",
                apellidos: "García García"
            }));

            // la base de datos vuelve al estado inicial
            await userService.deleteUser(usuarioCreado);
        });

        it('HU101-EI01: Registrar nuevo usuario con contraseña inválida', async () => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye a "ramon"
            //  no se ha iniciado sesión

            // WHEN
            //  el usuario intenta darse de alta con contraseña "password" (no sigue el formato correcto)
            ramon = USER_TEST_DATA[0];
            await expectAsync(userService.signUp(ramon.email, "password", ramon.nombre, ramon.apellidos)).toBeRejectedWith(new WrongPasswordFormatError());
            // THEN
            //  el usuario no se registra y se lanza el error WrongPasswordFormatError
        });
    });


    describe('HU102: Iniciar sesión', () => {

        it('HU102-EV01: Iniciar sesión con una cuenta registrada', async () => {
            // GIVEN
            //  lista de usuarios registrados que incluye a "ramon"
            //  no se ha iniciado sesión
            ramon = USER_TEST_DATA[0];
            const usuarioCreado = await userService.signUp(ramon.email, ramon.pwd, ramon.nombre, ramon.apellidos);

            // WHEN
            // ramon intenta iniciar sesión con su email y contraseña
            const respuesta = await userService.login(ramon.email, ramon.pwd);

            // THEN
            //  se inicia sesión correctamente
            expect(respuesta).toBeTrue();

            // la base de datos vuelve al estado inicial
            await userService.deleteUser(usuarioCreado);
        });

        it('HU102-EI01: Iniciar sesión con una cuenta que no existe', async () => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye a "ramon"
            //  no se ha iniciado sesión

            // WHEN
            // ramon intenta iniciar sesión con su email y contraseña
            ramon = USER_TEST_DATA[0];
            await expectAsync(userService.login(ramon.email, ramon.pwd)).toBeRejectedWith(UserNotFoundError);
            // THEN
            //  el usuario no se registra y se lanza el error UserNotFoundError
        });
    })


    describe('HU105: Cerrar sesión', () => {

        it('HU105-EV01: Cerrar una sesión activa', async () => {
            // GIVEN
            //  lista de usuarios registrados que incluye a "ramon"
            //  sesión activa con el usuario "ramon"
            ramon = USER_TEST_DATA[0];
            const usuarioCreado = await userService.signUp(ramon.email, ramon.pwd, ramon.nombre, ramon.apellidos);
            // todo: preguntar si deberíamos comprobar que se haya creado el usuario y se haya iniciado sesión correctamente
            const sesionIniciada = await userService.login(ramon.email, ramon.pwd);

            // WHEN
            //  se intenta cerrar sesión
            const respuesta = userService.logout();

            // THEN
            //  no se lanza ningún error y se invalida la sesión
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


    describe('HU106: Eliminar cuenta', async () => {

        it('HU106-EV01: Eliminar una cuenta existente', async () => {
            // GIVEN
            //  el usuario "ramon" está registrado y ha iniciado sesión
            ramon = USER_TEST_DATA[0];
            const usuarioCreado = await userService.signUp(ramon.email, ramon.pwd, ramon.nombre, ramon.apellidos);
            const sesionIniciada = await userService.login(ramon.email, ramon.pwd);

            // WHEN
            //  se intenta eliminar la cuenta
            const usuarioBorrado = userService.deleteUser(usuarioCreado);

            // THEN
            //  no se lanza ningún error, se cierra sesión y se elimina la cuenta
            expect(usuarioBorrado).toEqual(jasmine.objectContaining({
                uid: "???",
                email: "ramonejemplo@gmail.com",
                nombre: "Ramón",
                apellidos: "García García"
            }));
        });

        it('HU106-EI01: Eliminar una cuenta que no existe', async () => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye a "ramon"
            //  no se ha iniciado sesión

            // WHEN
            //  se intenta eliminar la cuenta
            const ramon = {
                uid: "???",
                email: "ramonejemplo@gmail.com",
                nombre: "Ramón",
                apellidos: "García García"
            }
            await expectAsync(userService.deleteUser(ramon)).toBeRejectedWith(new AccountNotFoundError());
            // THEN
            //  se lanza el error AccountNotFoundError y no se elimina ninguna cuenta
        });
    });

/*
    describe('HU603: Guardar datos de usuarios', async () => {

        it('HU603-EV01: Protección ante cierre involuntario cuando se pueden volcar los datos', async () => {
            // GIVEN
            //  conexión con la BD estable
            //  el atributo session pasa a ser null habiendo iniciado sesión
            ramon = USER_TEST_DATA[0];
            await userService.login(ramon.email, ramon.pwd);
            await expectAsync(userService.getCurrentUser()).toBeResolvedTo(ramon);

            const currentRamon = await userService.getCurrentUser();

            await userService.logout();

            const nullUserPromise = await userService.getCurrentUser();
            expect(nullUserPromise).toBeNull();

            // WHEN
            //  ramón vuelve a iniciar sesión
            const logInPromise = userService.login(ramon);
            await expectAsync(logInPromise).toBeResolved();

            // THEN
            //  los datos de usuario de la BD son los mismos que los introducidos previamente
            const currentUserPromise = userService.getCurrentUser();
            await expectAsync(currentUserPromise).toBeResolvedTo(currentRamon);
        });
    })

 */
})
