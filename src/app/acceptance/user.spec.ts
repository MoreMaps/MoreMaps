import {TestBed} from '@angular/core/testing'
import {MOCK_USERS} from './test-data';
import {UserModel} from '../data/UserModel';
import {UserService} from '../services/User/user.service';
import {UserNotFoundError} from '../errors/UserNotFoundError';
import {WrongPasswordFormatError} from '../errors/WrongPasswordFormatError';
import {SessionNotActiveError} from '../errors/DBAccessError';
import {USER_REPOSITORY} from '../services/User/UserRepository';
import {UserDB} from '../services/User/UserDB';

let userService: UserService;
let ramon: UserModel;
let maria: UserModel;
let usuarios: UserModel[];

// it01: HU101, HU102, HU105, HU603

describe('HU101: Registrar Usuario', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [UserService,
                {provide: USER_REPOSITORY, useClass: UserDB}]
        }).compileComponents();

        userService = TestBed.inject(UserService);

        // usuario "ramon"
        usuarios = [...MOCK_USERS]
        ramon = usuarios[0];
        // lista de usuarios que no contenga a ramón
        usuarios.splice(0,1);
    });

    it('HU101-EV01: Registrar nuevo usuario válido', async() => {
        // GIVEN
        //  lista de usuarios registrados en la que el usuario "ramon" no existe (hecho en beforeEach)
        expect(usuarios).not.toContain(ramon);
        //  session es null
        const nullCurrentUserPromise = await userService.currentUser();
        expect(nullCurrentUserPromise).toBeNull();
        //  datos del usuario válidos (hecho en beforeEach)

        // WHEN
        //  el usuario intenta darse de alta
        await userService.signUp(ramon);

        // THEN
        //  el usuario se registra correctamente
        //  lista de usuarios registrados ahora incluye al usuario
        const exists = await userService.userExists(ramon);
        expect(exists).toBe(true);
    });

    it('HU101-EI01: Registrar nuevo usuario con contraseña inválida', async () => {
        // GIVEN
        //  lista de usuarios registrados no incluye a 'ramón' (hecho en beforeEach)
        expect(usuarios).not.toContain(ramon);
        //  sesión null
        const nullCurrentUserPromise = await userService.currentUser();
        expect(nullCurrentUserPromise).toBeNull();
        //  datos del usuario NO válidos
        ramon.password = "password"; // no tiene mayúscula, ni número, ni símbolo especial
        expect(usuarios).not.toContain(ramon); // comprobación extra después de editar el objeto ramon

        // WHEN
        //  ramon intenta darse de alta con una contraseña que no sigue la regla
        const res = userService.signUp(ramon);

        // THEN
        //  el usuario no se registra y se lanza el error WrongPasswordFormatError
        await expectAsync(res).toBeRejectedWith(WrongPasswordFormatError);

        //  lista de usuarios registrados no incluye al usuario
        const exists = await userService.userExists(ramon);
        expect(exists).toBe(false);
    });
});

describe('HU102: Iniciar sesión', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [UserService,
                {provide: USER_REPOSITORY, useClass: UserDB}]
        }).compileComponents();

        userService = TestBed.inject(UserService);

        usuarios = [...MOCK_USERS];
        ramon = usuarios[0];
        maria = usuarios[1];
    });
    it('HU102-EV01: Iniciar sesión con una cuenta registrada', async () => {
        // GIVEN
        //  lista de usuarios registrados incluye a maría y ramón (hecho en BeforeEach)
        expect(usuarios).toContain(ramon);
        expect(usuarios).toContain(maria);

        //  un atributo session null
        const nullCurrentUserPromise = await userService.currentUser();
        expect(nullCurrentUserPromise).toBeNull();

        // WHEN
        // ramon intenta iniciar sesión con su usuario/email y contraseña
        await userService.login(ramon);

        // THEN
        //  el usuario existe en la lista de usuarios
        const exists = await userService.userExists(ramon);
        expect(exists).toBe(true);
    });

    it('HU102-EI01: Iniciar sesión con una cuenta que no existe', async () => {
        // GIVEN
        // session es null
        const nullCurrentUserPromise = await userService.currentUser();
        expect(nullCurrentUserPromise).toBeNull();

        //  lista de usuarios registrados no incluye a ramón
        usuarios.splice(0,1);
        expect(usuarios).not.toContain(ramon);
        let priorState = [...usuarios];

        // WHEN
        //  ramón intenta iniciar sesión sin figurar en la lista
        const login = userService.login(ramon);

        // THEN
        //  se lanza el error UserNotFoundError
        await expectAsync(login).toBeRejectedWith(UserNotFoundError);

        //  no se modifica el estado
        expect(priorState).toEqual(usuarios);
    });
})

describe('HU105: Cerrar sesión', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [UserService,
                {provide: USER_REPOSITORY, useClass: UserDB}]
        }).compileComponents();

        userService = TestBed.inject(UserService);
    });

    it('HU105-EV01: Cerrar una sesión activa', async () => {
        // GIVEN
        //  sesión activa con el usuario "ramon" (hecho BeforeEach)
        await expectAsync(userService.currentUser()).toBeResolvedTo(ramon);

        // WHEN
        //  el usuario “ramon” intenta cerrar sesión
        const login = userService.logout();

        // THEN
        //  no se lanza ningún error
        await expectAsync(login).toBeResolved();

        //  se invalida la sesión
        const nullCurrentUserPromise = await userService.currentUser();
        expect(nullCurrentUserPromise).toBeNull();
    });

    it('HU105-EI01: Cerrar una sesión cuando la sesión ya está cerrada', async () => {
        // GIVEN
        /*  el usuario “ramon” tiene una segunda ventana de cuando tenía sesión válida
            (asumimos que el test se llama desde esta), pero el atributo session ya es null */
        const nullCurrentUserPromise = await userService.currentUser();
        expect(nullCurrentUserPromise).toBeNull();

        // WHEN
        //  el usuario “ramon” intenta cerrar sesión
        const login = userService.logout();

        // THEN
        //  se lanza el error SessionNotActiveError
        await expectAsync(login).toBeRejectedWith(SessionNotActiveError);

        //  no se modifica el estado
        const nullSecondCurrentUserPromise = await userService.currentUser();
        expect(nullSecondCurrentUserPromise).toBeNull();
    });
});


describe('HU603: Guardar datos de usuarios', async () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [UserService,
                {provide: USER_REPOSITORY, useClass: UserDB}]
        }).compileComponents();

        userService = TestBed.inject(UserService);

        usuarios = [...MOCK_USERS];
        ramon = usuarios[0];
    })

    it('HU603-EV01: Protección ante cierre involuntario cuando se pueden volcar los datos', async () => {
        // GIVEN
        //  conexión con la BD estable
        //  el atributo session pasa a ser null habiendo iniciado sesión
        await userService.login(ramon);
        await expectAsync(userService.currentUser()).toBeResolvedTo(ramon);

        const currentRamon = await userService.currentUser();

        await userService.logout();

        const nullUserPromise = await userService.currentUser();
        expect(nullUserPromise).toBeNull();

        // WHEN
        //  ramón vuelve a iniciar sesión
        const logInPromise = userService.login(ramon);
        await expectAsync(logInPromise).toBeResolved();

        // THEN
        //  los datos de usuario de la BD son los mismos que los introducidos previamente
        const currentUserPromise = userService.currentUser();
        await expectAsync(currentUserPromise).toBeResolvedTo(currentRamon);
    });
})
