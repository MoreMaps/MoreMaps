import {TestBed} from '@angular/core/testing'
import {USER_TEST_DATA} from '../test-data';
import {USER_REPOSITORY} from '../../services/User/UserRepository';
import {UserModel} from '../../data/UserModel';
import {UserService} from '../../services/User/user.service';
import {UserDB} from '../../services/User/UserDB';
import {UserNotFoundError} from '../../errors/User/UserNotFoundError';
import {WrongPasswordFormatError} from '../../errors/User/WrongPasswordFormatError';
import {SessionNotActiveError} from '../../errors/User/SessionNotActiveError';
import {appConfig} from '../../app.config';
import {doc, Firestore, getDoc} from '@angular/fire/firestore';
import {Auth} from '@angular/fire/auth';


// it01: HU101, HU102, HU105, HU106, HU603
fdescribe('Pruebas sobre usuarios', () => {
    let userService: UserService;
    let usuarioRegistradoRamon: UserModel
    let firestore: Firestore;
    let auth: Auth;

    const ramon = USER_TEST_DATA[0];
    const maria = USER_TEST_DATA[1];

    beforeAll(async () => {
        await TestBed.configureTestingModule({
            providers: [
                UserService,
                {provide: USER_REPOSITORY, useClass: UserDB},
                appConfig.providers]
        }).compileComponents();

        userService = TestBed.inject(UserService);
        firestore = TestBed.inject(Firestore);
        auth = TestBed.inject(Auth);

        // PASO 0: Borrado preventivo de María
        try {
            await userService.login(maria.email, maria.pwd);
            await userService.deleteUser(); // Borra Auth y Firestore
            console.log("Limpieza preventiva: Usuario 'María' eliminado correctamente.");
        } catch (e) {
            // Si el login falla, significa que María no existe.
            // No hacemos nada y continuamos.
        }

        // Aseguramos que no quede ninguna sesión abierta antes de empezar con Ramón
        if (auth.currentUser) {
            await userService.logout();
        }

        // Indica si el usuario ya existe de forma consistente (o no)
        let needsCreate: boolean = false;

        // PASO 1: Intentamos Loguearnos
        try {
            if (!auth.currentUser) {
                await userService.login(ramon.email, ramon.pwd);
            }

            // Obtener UID
            const uid = auth.currentUser ? auth.currentUser.uid :  "";
            await userService.logout();

            const docRef = doc(firestore, `users/${uid}`);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                // CASO ideal: Existe en Auth y en Firestore
                const data = snap.data();
                usuarioRegistradoRamon = new UserModel(uid, data['email'], data['nombre'], data['apellidos']);
                console.log("Usuario Ramón cargado correctamente en la BD.");
            } else {
                // CASO ZOMBIE: Existe en Auth, pero NO en Firestore
                console.warn("Detectado usuario Ramón corrupto (Auth sí, DB no). Eliminando para regenerar...");
                await userService.deleteUser(); // Lo borramos para empezar de cero
                needsCreate = true;
            }

        } catch (e) {
            // Si falla el login (porque no existe o password incorrecto), procedemos a crear
            needsCreate = true;
        }

        // PASO 2: Creación desde cero (si fue necesario)
        if (needsCreate) {
            console.log("Creando usuario Ramón desde cero...");
            try {
                // signUp crea Auth + Firestore y devuelve el modelo lleno.
                // Asignamos DIRECTAMENTE el resultado a la variable global.
                usuarioRegistradoRamon = await userService.signUp(
                    ramon.email,
                    ramon.pwd,
                    ramon.nombre,
                    ramon.apellidos
                );
            } catch (error: any) {
                // Caso extremo: Existe en Auth con OTRA contraseña distinta a la del test
                if (error.code === 'auth/email-already-in-use') {
                    throw new Error("FATAL: El email de Ramón ya está en uso con otra contraseña. Borra el usuario manualmente en Firebase Console.");
                }
                throw error;
            }
        }

        // Verificación final de seguridad para que HU603 no falle con 'undefined'
        if (!usuarioRegistradoRamon) {
            throw new Error("FATAL: La variable usuarioRegistradoRamon no se inicializó correctamente en beforeAll");
        }
    });



    describe('HU101: Registrar Usuario', () => {

        it('HU101-EV01: Registrar nuevo usuario válido', async () => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye a "maria"
            //  no se ha iniciado sesión
            if (auth.currentUser) {
                await auth.signOut();
            }

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

            // LIMPIEZA: la base de datos vuelve al estado inicial
            await userService.deleteUser();
        });

        it('HU101-EI01: Registrar nuevo usuario con contraseña inválida', async () => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye al usuario "maria"
            //  no se ha iniciado sesión
            if (auth.currentUser) {
                await auth.signOut();
            }

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
            if (auth.currentUser) {
                await auth.signOut();
            }

            // WHEN
            // el usuario "ramon" intenta iniciar sesión con su email y contraseña
            const sesionIniciada = await userService.login(ramon.email, ramon.pwd);

            // THEN
            //  el usuario "ramon" inicia sesión correctamente
            expect(sesionIniciada).toBeTrue();

            // LIMPIEZA: ramon hace logout
            await userService.logout();
        });

        it('HU102-EI01: Iniciar sesión con una cuenta que no existe', async () => {
            // GIVEN
            //  lista de usuarios registrados vacía que no incluye a "maria"
            //  no se ha iniciado sesión
            if (auth.currentUser) {
                await auth.signOut();
            }

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
            if (auth.currentUser) {
                await auth.signOut();
            }
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
            //  lista de usuarios registrados incluye a "maria"
            await userService.signUp(maria.email, maria.pwd, maria.nombre, maria.apellidos);

            // WHEN
            //  se intenta eliminar la cuenta
            const usuarioBorrado = await userService.deleteUser();

            // THEN
            //  se elimina la cuenta
            expect(usuarioBorrado).toBeTrue();
        });

        it('HU106-EI01: Eliminar una cuenta existente cuya sesión está inactiva', async () => {
            // GIVEN
            //  lista de usuarios registrados incluye a "ramon"
            //   no se ha iniciado sesión
            if (auth.currentUser) {
                await auth.signOut();
            }

            // WHEN
            //  se intenta eliminar la cuenta "ramon" sin haber iniciado sesión
            await expectAsync(userService.deleteUser())
                .toBeRejectedWith(new SessionNotActiveError());
            // THEN
            //  se lanza el error SessionNotActiveError y no se elimina ninguna cuenta
        });
    });

    describe('HU603: Guardar datos de usuarios', () => {

        it('HU603-EV01: Comprobación de datos de usuario guardados ante cierre involuntario', async () => {
            // GIVEN
            //  el usuario "ramon" está registrado y ha iniciado sesión
            await userService.login(ramon.email, ramon.pwd);

            //  se cierra la sesión involuntariamente
            await userService.logout();

            // WHEN
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

            // LIMPIEZA
            // "ramon" cierra sesión
            await userService.logout();
        });
    })
})
