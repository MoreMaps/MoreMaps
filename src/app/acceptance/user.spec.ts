import {TestBed} from '@angular/core/testing';
import {MOCK_USERS} from './test-data';

const dbAccessStable: boolean = false;
const requiredTestCount = 6;
let passedTestCount : number;

beforeAll(() => {passedTestCount=0;})

// it01: HU101, HU102, HU105, HU603
describe('HU101: Registrar Usuario', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            // imports: [...],
        }).compileComponents();
        // hacer comprobación de acceso estable a la BBDD
    });

    it('HU101-EV1: Registrar nuevo usuario válido', () => {
        if (!dbAccessStable) {
            pending("El acceso a la BD no es estable.");
        }
        // GIVEN
        //  lista de usuarios registrados vacía (así que el usuario no existe)
        //  un atributo session null
        //  datos del usuario

        // WHEN
        //  el usuario intenta darse de alta

        // THEN
        //  no se lanza ningún error
        //  el sistema avisa de que se ha registrado correctamente <- INTERFAZ, no se prueba
        //  lista de usuarios registrados ahora incluye al usuario
        passedTestCount++;
    });

    it('HU101-EI1: Registrar nuevo usuario con contraseña inválida', () => {
        if (!dbAccessStable) {
            pending("El acceso a la BD no es estable.");
        }
        // GIVEN
        //  lista de usuarios registrados vacía (así que el usuario no existe)
        //  un atributo session null
        /*  para esta prueba, duplicar el mock_users con la función map y editar la
            contraseña del clon de juan para que no cumpla reglas de dominio     */
        // WHEN
        //  ramon intenta darse de alta con una contraseña que no sigue la regla
        //  creo que FirebaseAuth permite comprobarlo por su cuenta, mirad el enlace que mandé
        // THEN
        //  se lanza el error WrongPasswordFormatError
        //  lista de usuarios registrados no incluye al usuario
        passedTestCount++;
    });
});

describe('HU102: Iniciar sesión', () => {
    it('HU102-EV01: Iniciar sesión con una cuenta registrada', () => {
        if (!dbAccessStable) {
            pending("El acceso a la BD no es estable.");
        }
        // GIVEN
        //  lista de usuarios registrados incluye a maría y ramón
        //  un atributo session null
        // WHEN
        //  ramon intenta iniciar sesión con su usuario/email y contraseña
        //  no sé si es con email o con usuario... creo que con email
        // THEN
        //  se lanza el error WrongPasswordFormatError
        //  session ya no es null
        passedTestCount++;
    });
    it('HU102-EI01: Iniciar sesión con una cuenta que no existe', () => {
        if (!dbAccessStable) {
            pending("El acceso a la BD no es estable.");
        }
        // GIVEN
        //  lista de usuarios registrados incluye a maría
        //  el atributo session es null
        // WHEN
        //  ramón intenta iniciar sesión sin figurar en la lista
        // THEN
        //  se lanza el error UserNotFoundError
        //  no se modifica el estado
        passedTestCount++;
    });
})

describe('HU105: Cerrar sesión', () => {
    it('HU105-EV01: Cerrar una sesión activa', () => {
        if (!dbAccessStable) {
            pending("El acceso a la BD no es estable.");
        }
        // GIVEN
        //  sesión activa con el usuario “ramon”

        // WHEN
        //  el usuario “ramon” intenta cerrar sesión

        // THEN
        //  no se lanza ningún error
        //  se invalida la sesión
        passedTestCount++;
    });
    it('HU105-EI01: Cerrar una sesión cuando la sesión ya está cerrada', () => {
        if (!dbAccessStable) {
            pending("El acceso a la BD no es estable.");
        }
        // GIVEN
        //  el atributo session es null
        //  el usuario “ramon” tiene una segunda ventana con una página en la que el atributo session seguía activo

        // WHEN
        //  el usuario “ramon” intenta cerrar sesión

        // THEN
        //  se lanza el error SessionNotActiveError
        //  no se modifica el estado
        passedTestCount++;
    });
});


describe('HU603: Guardar datos de usuarios', () => {
    it('HU603-EV01: Protección ante cierre involuntario cuando se pueden volcar los datos', () => {
        if (!dbAccessStable) {
            pending("El acceso a la BD no es estable.");
        }
        // Importante, para proceder a esta prueba tiene que pasar todas las pruebas anteriores
        if (passedTestCount!=requiredTestCount) {
            pending("Ha fallado algún test relevante a esta historia.");
        }

        // GIVEN
        //  conexión con la BD estable
        //  el atributo session pasa a ser null
        // WHEN
        //  ramón vuelve a iniciar sesión
        // THEN
        //  los datos de la BD son los mismos que los introducidos previamente
    });
})
