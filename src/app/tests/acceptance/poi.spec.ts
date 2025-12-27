// it02: HU201, HU202, HU203, HU204, HU205, HU206, HU501, HU604
import {TestBed} from '@angular/core/testing'
import {POI_TEST_DATA, USER_TEST_DATA} from '../test-data';
import {USER_REPOSITORY} from '../../services/User/UserRepository';
import {UserService} from '../../services/User/user.service';
import {UserDB} from '../../services/User/UserDB';
import {appConfig} from '../../app.config';
import {doc, Firestore, setDoc} from '@angular/fire/firestore';
import {Auth} from '@angular/fire/auth';
import {POIService} from '../../services/POI/poi.service';
import {POIModel} from '../../data/POIModel';
import {POI_REPOSITORY} from '../../services/POI/POIRepository';
import {POIDB} from '../../services/POI/POIDB';
import {LongitudeRangeError} from '../../errors/POI/LongitudeRangeError';
import {MissingPOIError} from '../../errors/POI/MissingPOIError';
import {PlaceNameNotFoundError} from '../../errors/POI/PlaceNameNotFoundError';
import {DescriptionLengthError} from '../../errors/POI/DescriptionLengthError';
import {MapSearchService} from '../../services/map-search-service/map-search.service';
import {MAP_SEARCH_REPOSITORY} from '../../services/map-search-service/MapSearchRepository';
import {MapSearchAPI} from '../../services/map-search-service/MapSearchAPI';
import {POISearchModel} from '../../data/POISearchModel';
import {geohashForLocation} from 'geofire-common';

describe('Pruebas sobre POI', () => {
    let userService: UserService;
    let poiService: POIService;
    let mapSearchService: MapSearchService;

    let poiRegistrado: POIModel;

    let firestore: Firestore;
    let auth: Auth;

    const ramon = USER_TEST_DATA[0];
    const maria = USER_TEST_DATA[1];

    const poiA: POIModel = POI_TEST_DATA[0];
    const poiB: POIModel = POI_TEST_DATA[1];

    beforeAll(async () => {
        await TestBed.configureTestingModule({
            providers: [
                UserService,
                POIService,
                MapSearchService,
                {provide: USER_REPOSITORY, useClass: UserDB},
                {provide: POI_REPOSITORY, useClass: POIDB},
                {provide: MAP_SEARCH_REPOSITORY, useClass: MapSearchAPI},
                appConfig.providers],

            // This prevents Angular from destroying the injector after the first test.
            teardown: {destroyAfterEach: false}
        }).compileComponents();

        // Inyección de los servicios
        userService = TestBed.inject(UserService);
        poiService = TestBed.inject(POIService);
        mapSearchService = TestBed.inject(MapSearchService);

        // Inyección de Firestore y Auth
        firestore = TestBed.inject(Firestore);
        auth = TestBed.inject(Auth);

        // Iniciar sesión con ramón para todos los test
        await userService.login(ramon.email, ramon.pwd);
    });

    // Se comprueba si el POI A existe en la base de datos y se crea en caso contrario.
    beforeEach(async () => {
        try {
            const poiRef = doc(firestore, `/items/${auth.currentUser?.uid}/pois/${poiA.geohash}`);
            poiRegistrado = new POIModel(poiA.lat, poiA.lon, poiA.placeName, poiA.geohash, false, poiA.alias, poiA.description);
            await setDoc(poiRef, poiRegistrado.toJSON(), {merge: true});
        } catch (error) {
            console.error(error);
            throw error;
        }
    });

    // Jasmine no garantiza el orden de ejecución entre archivos .spec. Limpiamos auth
    afterAll(async () => {
        try {
            if (auth.currentUser) await userService.logout();
            if (auth.currentUser) throw new Error('Fallo al hacer logout en afterALl de vehicle.spec.ts.');
            else { console.info('Logout en afterAll de vehicle.spec.ts funcionó correctamente.'); }
        } catch (error) {
            console.error(error);
        }
    })

    // Las pruebas empiezan a partir de AQUÍ

    describe('HU201: Registrar POI por coordenadas', () => {

        it('HU201-EV01: Dar de alta un POI por coordenadas', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A"]

            // WHEN
            // Se intenta dar de alta el POI "B" mediante sus coordenadas
            const poiBuscado = await mapSearchService.searchPOIByCoords(poiB.lat, poiB.lon);
            const poiCreado = await poiService.createPOI(poiBuscado)

            try {
                // THEN
                // Se da de alta el POI
                expect(poiCreado).toEqual(jasmine.objectContaining({
                        lat: poiBuscado.lat,
                        lon: poiBuscado.lon,
                        placeName: poiBuscado.placeName,
                        geohash: geohashForLocation([poiBuscado.lat, poiBuscado.lon], 7),
                        pinned: false
                    })
                );
            } finally {
                // CLEANUP
                // Se borra el POI "B"
                await poiService.deletePOI(poiCreado.geohash);
            }
        });

        it('HU201-EI03: Dar de alta un POI por coordenadas no válidas', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A"]

            // WHEN
            // Se intenta dar de alta un POI de latitud 89 y longitud 999 (inválida)
            await expectAsync(mapSearchService.searchPOIByCoords(89, 999))
                .toBeRejectedWith(new LongitudeRangeError());
            // THEN
            // Se lanza el error LongitudeRangeError
            // No se modifica el estado
        });
    });


    describe('HU202: Registrar POI por topónimo', () => {

        it('HU202-EV01: Dar de alta un POI por topónimo', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A"]

            // WHEN
            // Se intenta dar de alta el POI “B” por topónimo ("Valencia")
            const listaPoiEncontrados: POISearchModel[] = await mapSearchService.searchPOIByPlaceName(poiB.placeName);
            const poiBuscado: POISearchModel = listaPoiEncontrados[0];
            const poiCreado = await poiService.createPOI(poiBuscado)

            // THEN
            // Se da de alta el POI
            // La lista de POI es ["A", "B"]
            expect(poiCreado).toEqual(jasmine.objectContaining({
                    lat: poiBuscado.lat,
                    lon: poiBuscado.lon,
                    placeName: poiBuscado.placeName,
                    geohash: geohashForLocation([poiBuscado.lat, poiBuscado.lon], 7),
                    pinned: false
                })
            );

            // CLEANUP
            // Se borra el POI "B"
            await poiService.deletePOI(poiCreado.geohash);
        });

        it('HU202-EI03: Dar de alta un POI por topónimo que no corresponde a ningún sitio', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A"]

            // WHEN
            // Se intenta dar de alta un POI buscando el lugar "lkasdñfjalksdjf" (que no existe)
            const toponimoInexistente = "lkasdñfjalksdjf";
            await expectAsync(mapSearchService.searchPOIByPlaceName(toponimoInexistente))
                .toBeRejectedWith(new PlaceNameNotFoundError(toponimoInexistente));
            // THEN
            // Se lanza el error MissingPOIError
            // No se modifica el estado
        });
    });


    describe('HU203: Consultar el listado de POI', () => {

        it('HU203-EV01 Consultar el listado vacío de POI', async () => {
            // GIVEN
            // El usuario maria se ha registrado y ha iniciado sesión
            await userService.signUp(maria.email, maria.pwd, maria.nombre, maria.apellidos);
            try {
                // WHEN
                // El usuario maria consulta su lista de POI registrados
                let list = await poiService.getPOIList();

                // THEN
                // Se devuelve una lista vacía y se indica que no hay POI registrados.
                expect(list.length).toBe(0);
            } finally {
                // CLEANUP
                // borrar a maria
                await userService.deleteUser();
                // volver a ramon
                await userService.login(ramon.email, ramon.pwd);
            }
        });

        it('HU203-EV02: Consultar el listado no vacío de POI', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A"]

            // WHEN
            // El usuario consulta su lista de POI registrados
            const listaPoi = await poiService.getPOIList()

            // THEN
            // Se devuelve el listado de POI
            /* Conforme el desarrollo va avanzando, el usuario ramón tiene más de 1 elemento,
            con especial atención a probar temas como la paginación.
            Para evitar problemas de tests, se ha cambiado la condición a >=1.
            * */
            expect(listaPoi.length).toBeGreaterThanOrEqual(1);

            // No se modifica el estado
        });
    });


    describe('HU204: Consultar información de POI', () => {

        it('HU204-EV01: Consultar información de un POI registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A"]

            // WHEN
            // El usuario consulta los datos del POI “A”
            const poiConsultado = await poiService.readPOI(poiRegistrado.geohash);

            // THEN
            // Se obtienen los datos del POI
            expect(poiConsultado).toEqual(jasmine.objectContaining({
                    lat: poiA.lat,
                    lon: poiA.lon,
                    geohash: poiA.geohash,
                    placeName: poiA.placeName,
                    alias: poiA.alias,
                    description: poiA.description,
                    pinned: false
                })
            );
            // No se modifica el estado
        });

        it('HU204-EI02: Consultar información de un POI no registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es [“A”]

            // WHEN
            // El usuario consulta los datos del POI con geohash vacío (no registrado)
            await expectAsync(poiService.readPOI(" "))
                .toBeRejectedWith(new MissingPOIError());
            // THEN
            // Se lanza el error MissingPOIError
            // No se modifica el estado
        });
    });


    describe('HU205: Modificar información de POI', () => {

        it('HU205-EV01: Modificar información de un POI registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A"]

            // WHEN
            // El usuario modifica el alias del POI “A” a "Al y Canto"
            const poiModificado = await poiService.updatePOI(poiRegistrado.geohash, {alias: "Al y Canto"})
            try {
                // THEN
                // Se actualiza el POI
                expect(poiModificado).toBeTrue();
            } finally {
                // CLEANUP
                // Modificar el alias del POI "A" de nuevo a "Alicante"
                await poiService.updatePOI(poiRegistrado.geohash, {alias: "Alicante"});
            }
        });

        it('HU205-EI02: Modificar información de un POI no registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es [“A”]

            // WHEN
            // El usuario modifica el alias del POI con geohash vacío a "Castellón de la Nada"
            await expectAsync(poiService.updatePOI(" ", {alias: "Castellón de la Nada"}))
                .toBeRejectedWith(new MissingPOIError());
            // THEN
            // Se lanza el error MissingPOIError
            // No se modifica el estado
        });

        it('HU205-EI03: Modificar información de un POI sin seguir las reglas de dominio', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es [“A”]

            // WHEN
            // El usuario modifica la descripción del POI "A" a un texto con 151 caracteres (el máximo es 150)
            await expectAsync(poiService.updatePOI(poiRegistrado.geohash, {
                description: "The descriptive text is deliberately engineered " +
                    "to exceed the maximum character limit of 150. " +
                    "As such, it serves as a perfect test case for validation."
            }))
                .toBeRejectedWith(new DescriptionLengthError());

            // THEN
            // Se lanza el error DescriptionLengthError
            // No se modifica el estado
        });
    });


    describe('HU206: Eliminar un POI', () => {

        it('HU206-EV01: Eliminar un POI registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A, B"] (registrar "B")
            const nuevoPoi: POISearchModel = new POISearchModel(poiB.lat, poiB.lon, poiB.placeName);
            const poiCreado: POIModel = await poiService.createPOI(nuevoPoi)

            // WHEN
            // El usuario trata de borrar el POI "B"
            const poiBorrado = await poiService.deletePOI(poiCreado.geohash);

            // THEN
            // El POI "B" se elimina
            expect(poiBorrado).toBeTrue();
        });

        it('HU206-EI02: Eliminar un POI no registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es [“A”]

            // WHEN
            // El usuario trata de borrar el POI con geohash vacío (no registrado).
            await expectAsync(poiService.deletePOI(" "))
                .toBeRejectedWith(new MissingPOIError());
            // THEN
            // Se lanza el error MissingPOIError
        });
    });


    describe('HU501: Fijar un POI', () => {

        it('HU501-EV01: Fijar un POI registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A", "B"] (registrar B)
            const nuevoPoi: POISearchModel = new POISearchModel(poiB.lat, poiB.lon, poiB.placeName);
            const poiCreado: POIModel = await poiService.createPOI(nuevoPoi)

            // Ambos puntos no son fijados, una consulta de POI devuelve ["A", "B"]
            try {
                let list = await poiService.getPOIList();
                expect(list.at(0)?.placeName === 'Alicante').toBeTrue();

                // WHEN
                // El usuario trata de fijar el POI "B"
                const poiFijado = await poiService.pinPOI(poiCreado);

                // THEN
                // El punto B pasa a estar fijado (pinned = true)
                expect(poiFijado).toBeTrue();

                // el orden ahora es ["B", "A"]
                list = await poiService.getPOIList();
                expect(list.at(0)?.placeName).toEqual('Valencia');
            } finally {
                // CLEANUP
                // Borrar el POI "B"
                await poiService.deletePOI(poiCreado.geohash);
            }

        });

        it('HU501-EI02: Fijar un POI no registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es [“A”]

            // WHEN
            // El usuario trata de fijar un POI no registrado
            await expectAsync(poiService.pinPOI(poiB))
                .toBeRejectedWith(new MissingPOIError());
            // THEN
            // Se lanza el error MissingPOIError
            // No se modifica el estado
        });
    });


    describe('HU604: Guardar datos de POI', () => {

        it('HU604-EV01: Comprobación de datos guardados de POI ante cierre involuntario', async () => {
            // GIVEN
            //  el usuario "ramon" está registrado y ha iniciado sesión
            //  la lista de POI registrados es [A]
            const listaPoiAntes = await poiService.getPOIList();

            //  se cierra la sesión involuntariamente
            await userService.logout();

            // WHEN
            //  el usuario "ramon" vuelve a iniciar sesión
            await userService.login(ramon.email, ramon.pwd);

            // THEN
            //  los datos de POI de la BD son los mismos que los introducidos previamente
            const listaPoi = await poiService.getPOIList();
            expect(listaPoi).toEqual(listaPoiAntes);
        });
    });

});
