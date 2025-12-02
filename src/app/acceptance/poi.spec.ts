// it02: HU201, HU202, HU203, HU204, HU205, HU206, HU501, HU604
import {TestBed} from '@angular/core/testing'
import {POI_TEST_DATA, USER_TEST_DATA} from './test-data';
import {USER_REPOSITORY} from '../services/User/UserRepository';
import {UserService} from '../services/User/user.service';
import {UserDB} from '../services/User/UserDB';
import {appConfig} from '../app.config';
import {doc, Firestore, setDoc} from '@angular/fire/firestore';
import {Auth} from '@angular/fire/auth';
import {POIService} from '../services/POI/poi.service';
import {POIModel} from '../data/POIModel';
import {POI_REPOSITORY} from '../services/POI/POIRepository';
import {POIDB} from '../services/POI/POIDB';
import {LongitudeRangeError} from '../errors/LongitudeRangeError';
import {MissingPOIError} from '../errors/MissingPOIError';
import {ForbiddenContentError} from '../errors/ForbiddenContentError';
import {PlaceNameNotFoundError} from '../errors/PlaceNameNotFoundError';
import {DescriptionLengthError} from '../errors/DescriptionLengthError';
import {MapSearchService} from '../services/map-search-service/map-search.service';
import {MAP_SEARCH_REPOSITORY} from '../services/map-search-service/MapSearchRepository';
import {MapSearchAPI} from '../services/map-search-service/MapSearchAPI';
import {POISearchModel} from '../data/POISearchModel';
import {geohashForLocation} from 'geofire-common';

describe('Pruebas sobre POI', () => {
    let userService: UserService;
    let poiService: POIService;
    let mapSearchService: MapSearchService;

    let poiRegistrado: POIModel;

    let firestore: Firestore;
    let auth: Auth;

    const ramon = USER_TEST_DATA[0];

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

            // 👇 THIS IS THE KEY FIX 👇
            // This prevents Angular from destroying the injector after the first test,
            // allowing your 'userService' and 'auth' variables to survive the whole suite.
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        // Injection (Done once)
        userService = TestBed.inject(UserService);
        poiService = TestBed.inject(POIService);
        mapSearchService = TestBed.inject(MapSearchService);
        firestore = TestBed.inject(Firestore);
        auth = TestBed.inject(Auth);

        // Login (Done once - saves you from Rate Limiting!)
        await userService.login(ramon.email, ramon.pwd);
    });

    // Keep your beforeEach for data setup only
    beforeEach(async () => {
        // Do NOT configure TestBed here.
        // Just do your data setup (creating the POI document).
        try {
            const poiRef = doc(firestore, `/items/${auth.currentUser?.uid}/pois/${poiA.geohash}`);
            poiRegistrado = new POIModel(poiA.lat, poiA.lon, poiA.placeName, poiA.geohash, false, poiA.alias, poiA.description);
            await setDoc(poiRef, poiRegistrado.toJSON(), {merge: true});
        } catch (error) {
            console.error(error);
            throw error;
        }
    });

    beforeEach(async () => {
        try {
            // 1. Referencia al documento
            const poiRef = doc(firestore,
                `/items/${auth.currentUser?.uid}/pois/${poiA.geohash}`);

            // 2. Definir los datos a escribir en formato JSON
            poiRegistrado = new POIModel(poiA.lat, poiA.lon, poiA.placeName, poiA.geohash, false, poiA.alias, poiA.description);

            // 3. Con merge = true, "escribir" el documento.
            // Si este existe, se actualiza
            // Si no existe, se crea
            await setDoc(poiRef, poiRegistrado.toJSON(), {merge: true});
            console.log(`Documento del POI A existe con geohash: ${poiA.geohash}`);

        } catch (error) {
            console.error(error);
            throw error;
        }
    });

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

            // CLEANUP
            // Se borra el POI "B"
            await poiService.deletePOI(auth, poiCreado.geohash);
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
            // Se intenta dar de alta el POI “B” por topónimo ("València")
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
            await poiService.deletePOI(auth, poiCreado.geohash);
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
        it('HU203-EV02: Consultar el listado no vacío de POI', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A"]

            // WHEN
            // El usuario consulta su lista de POI registrados
            const listaPoi = await poiService.getPOIList(auth)

            // THEN
            // Se devuelve el listado de POI
            /* Conforme el desarrollo va avanzando, el usuario ramón tiene más de 1 elemento,
            con especial atención a probar temas como la paginación.
            Para evitar problemas de tests, se ha cambiado la condición a >=1.
            * */
            expect(listaPoi.length).toBeGreaterThanOrEqual(1);

            // No se modifica el estado
        });

        it('HU203-EI02: Consultar la lista de POI de otro usuario', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // El usuario ramon tiene los datos de otro usuario
            const authBadUser: Auth = {
                currentUser: {
                    uid: 'notARealUser',
                }
            } as unknown as Auth;

            // WHEN
            // El usuario ramon consulta la lista usando el UID de otro
            await expectAsync(poiService.getPOIList(authBadUser))
                .toBeRejectedWith(new ForbiddenContentError());
            // THEN
            // Se lanza el error ForbiddenContentError
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
            const poiConsultado = await poiService.readPOI(auth, poiRegistrado.geohash);

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
            await expectAsync(poiService.readPOI(auth, " "))
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
            const poiModificado = await poiService.updatePOI(auth, poiRegistrado.geohash, {alias: "Al y Canto"})

            // THEN
            // Se actualiza el POI
            expect(poiModificado).toBeTrue();

            // CLEANUP
            // Modificar el alias del POI "A" de nuevo a "Alicante"
            await poiService.updatePOI(auth, poiRegistrado.geohash, {alias: "Alicante"});
        });

        it('HU205-EI02: Modificar información de un POI no registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es [“A”]

            // WHEN
            // El usuario modifica el alias del POI con geohash vacío a "Castellón de la Nada"
            await expectAsync(poiService.updatePOI(auth, " ", {alias: "Castellón de la Nada"}))
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
            await expectAsync(poiService.updatePOI(auth, poiRegistrado.geohash,
                {
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
            const poiBorrado = await poiService.deletePOI(auth, poiCreado.geohash);

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
            await expectAsync(poiService.deletePOI(auth, " "))
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
            let list = await poiService.getPOIList(auth);
            expect(list.at(0)?.placeName === 'Alicante').toBeTrue();

            // WHEN
            // El usuario trata de fijar el POI "B"
            const poiFijado = await poiService.pinPOI(auth, poiCreado);

            // THEN
            // El punto B pasa a estar fijado (pinned = true)
            expect(poiFijado).toBeTrue();

            // el orden ahora es ["B", "A"]
            list = await poiService.getPOIList(auth);
            expect(list.at(0)?.placeName).toEqual('Valencia');

            // CLEANUP
            // Borrar el POI "B"
            await poiService.deletePOI(auth, poiCreado.geohash);
        });

        it('HU501-EI02: Fijar un POI no registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es [“A”]

            // WHEN
            // El usuario trata de fijar un POI no registrado
            await expectAsync(poiService.pinPOI(auth, poiB))
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
            const listaPoiAntes = await poiService.getPOIList(auth);

            //  se cierra la sesión involuntariamente
            await userService.logout();

            // WHEN
            //  el usuario "ramon" vuelve a iniciar sesión
            await userService.login(ramon.email, ramon.pwd);

            // THEN
            //  los datos de POI de la BD son los mismos que los introducidos previamente
            const listaPoi = await poiService.getPOIList(auth);
            expect(listaPoi).toEqual(listaPoiAntes);
        });
    });

});
