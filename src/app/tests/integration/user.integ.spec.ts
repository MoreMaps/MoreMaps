import {TestBed} from '@angular/core/testing'
import {USER_TEST_DATA} from '../test-data';
import {USER_REPOSITORY, UserRepository} from '../../services/User/UserRepository';
import {UserModel} from '../../data/UserModel';
import {UserService} from '../../services/User/user.service';
import {UserNotFoundError} from '../../errors/User/UserNotFoundError';
import {WrongPasswordFormatError} from '../../errors/User/WrongPasswordFormatError';
import {SessionNotActiveError} from '../../errors/User/SessionNotActiveError';
import {createMockRepository} from '../helpers/test-helpers';


// Pruebas de integración sobre usuarios
// HU101, HU102, HU105, HU106
// Se excluye HU603 por ser sobre el guardado y recuperación de datos en la BBDD
describe('Pruebas de integración sobre usuarios', () => {
    // SUT
    let userService: UserService;

    // Mock de acceso a la BD
    let mockUserRepository: jasmine.SpyObj<UserRepository>;

    // Datos de prueba
    const ramon = USER_TEST_DATA[0];
    const maria = USER_TEST_DATA[1];

    beforeEach(async () => {
        mockUserRepository = createMockRepository('user');
        await TestBed.configureTestingModule({
            providers: [
                UserService,
                {provide: USER_REPOSITORY, useValue: mockUserRepository},
            ]
        }).compileComponents();

        // Inyección del servicio
        userService = TestBed.inject(UserService);
    });


    describe('HU101: Registrar Usuario', () => {

        it('HU101-EV01: Registrar nuevo usuario válido', async () => {
            // GIVEN
            const mockUser : UserModel = new UserModel('mock_uid', maria.email, maria.nombre, maria.apellidos);

            //  lista de usuarios registrados que no incluye a "maria"
            mockUserRepository.userExists.and.resolveTo(false);
            mockUserRepository.passwordValid.and.resolveTo(true);
            mockUserRepository.createUser.and.resolveTo(mockUser);

            // WHEN
            //  el usuario "maria" intenta darse de alta con datos inválidos
            const usuarioCreado: UserModel = await userService
                .signUp(maria.email, maria.pwd, maria.nombre, maria.apellidos);

            // THEN
            // se llama a la función "createUser"
            expect(mockUserRepository.createUser).toHaveBeenCalledWith(maria.email, maria.pwd, maria.nombre, maria.apellidos);

            //  se da de alta a "maria"
            expect(usuarioCreado).toEqual(jasmine.objectContaining({
                uid: 'mock_uid',
                email: maria.email,
                nombre: maria.nombre,
                apellidos: maria.apellidos,
            }));
        });

        it('HU101-EI01: Registrar nuevo usuario con contraseña inválida', async () => {
            // GIVEN
            //  lista de usuarios registrados que no incluye a "maria"
            mockUserRepository.userExists.and.resolveTo(false);

            // WHEN
            //  el usuario "maria" intenta darse de alta con contraseña "password" (no sigue el formato correcto)
            await expectAsync(userService.signUp(maria.email, "password", maria.nombre, maria.apellidos))
                .toBeRejectedWith(new WrongPasswordFormatError());
            // THEN
            //  el usuario "maria" no se registra y se lanza el error WrongPasswordFormatError

            //  no se llama a la función "createUser"
            expect(mockUserRepository.createUser).not.toHaveBeenCalled();
        });
    });

    describe('HU102: Iniciar sesión', () => {

        it('HU102-EV01: Iniciar sesión con una cuenta registrada', async () => {
            // GIVEN
            //  lista de usuarios registrados que incluye a "ramon"
            //  la sesión no está activa
            mockUserRepository.userExists.and.resolveTo(true);
            mockUserRepository.sessionActive.and.resolveTo(false);
            mockUserRepository.validateCredentials.and.resolveTo(true);

            // WHEN
            // el usuario "ramon" intenta iniciar sesión con su email y contraseña
            const sesionIniciada = await userService.login(ramon.email, ramon.pwd);

            // THEN
            // se llama a la función "validateCredentials" con los parámetros pertinentes
            expect(mockUserRepository.validateCredentials).toHaveBeenCalledWith(ramon.email, ramon.pwd);

            //  el usuario "ramon" inicia sesión correctamente
            expect(sesionIniciada).toBeTrue();
        });

        it('HU102-EI01: Iniciar sesión con una cuenta que no existe', async () => {
            // GIVEN
            //  lista de usuarios registrados que no incluye a "maria"
            mockUserRepository.userExists.and.resolveTo(false);

            // WHEN
            // se intenta iniciar sesión con los datos del usuario "maria"
            await expectAsync(userService.login(maria.email, maria.pwd)).toBeRejectedWith(new UserNotFoundError());
            // THEN
            //  el usuario no se registra y se lanza el error UserNotFoundError

            //  no se llama a la función "validateCredentials"
            expect(mockUserRepository.validateCredentials).not.toHaveBeenCalled();
        });
    })

    describe('HU105: Cerrar sesión', () => {

        it('HU105-EV01: Cerrar una sesión activa', async () => {
            // GIVEN
            //  lista de usuarios registrados que incluye a "ramon"
            //  sesión activa con el usuario "ramon"
            const mockUser : UserModel = new UserModel('mock_uid', ramon.email, ramon.nombre, ramon.apellidos);

            mockUserRepository.sessionActive.and.resolveTo(true);
            mockUserRepository.getCurrentUser.and.resolveTo(mockUser);
            mockUserRepository.userExists.and.resolveTo(true);
            mockUserRepository.logoutUser.and.resolveTo(true);

            // WHEN
            //  se intenta cerrar sesión
            const sesionCerrada = await userService.logout();

            // THEN
            // se llama a la función "logoutUser"
            expect(mockUserRepository.logoutUser).toHaveBeenCalled();

            //  se cierra la sesión
            expect(sesionCerrada).toBeTrue();
        });

        it('HU105-EI01: Cerrar una sesión cuando no hay sesión activa', async () => {
            // GIVEN
            //  no hay ninguna sesión activa
            mockUserRepository.sessionActive.and.resolveTo(false);

            // WHEN
            //  se intenta cerrar sesión
            await expectAsync(userService.logout()).toBeRejectedWith(new SessionNotActiveError());
            // THEN
            //  se lanza el error SessionNotActiveError y no se cierra la sesión

            //  no se llama a la función "logoutUser"
            expect(mockUserRepository.logoutUser).not.toHaveBeenCalled();
        });
    });

    describe('HU106: Eliminar cuenta', () => {

        it('HU106-EV01: Eliminar una cuenta existente', async () => {
            // GIVEN
            //  lista de usuarios registrados incluye a "maria"
            //  "maria" ha iniciado sesión
            const mockUser : UserModel = new UserModel('mock_uid', maria.email, maria.nombre, maria.apellidos);

            mockUserRepository.sessionActive.and.resolveTo(true);
            mockUserRepository.getCurrentUser.and.resolveTo(mockUser);
            mockUserRepository.userExists.and.resolveTo(true);
            mockUserRepository.deleteAuthUser.and.resolveTo(true);

            // WHEN
            //  se intenta eliminar la cuenta
            const usuarioBorrado = await userService.deleteUser();

            // THEN
            // se llama a la función "deleteAuthUser"
            expect(mockUserRepository.deleteAuthUser).toHaveBeenCalled();

            //  se elimina la cuenta
            expect(usuarioBorrado).toBeTrue();

        });

        it('HU106-EI01: Eliminar una cuenta existente cuya sesión está inactiva', async () => {
            // GIVEN
            //  lista de usuarios registrados incluye a "ramon"
            //  no se ha iniciado sesión
            mockUserRepository.userExists.and.resolveTo(true);
            mockUserRepository.sessionActive.and.resolveTo(false);

            // WHEN
            //  se intenta eliminar la cuenta "ramon" sin haber iniciado sesión
            await expectAsync(userService.deleteUser())
                .toBeRejectedWith(new SessionNotActiveError());
            // THEN
            //  se lanza el error SessionNotActiveError y no se elimina ninguna cuenta

            //  no se llama a la función "deleteAuthUser"
            expect(mockUserRepository.deleteAuthUser).not.toHaveBeenCalled();
        });
    });
});
