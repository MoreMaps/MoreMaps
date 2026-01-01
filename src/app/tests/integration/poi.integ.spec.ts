import {TestBed} from '@angular/core/testing'
import {POI_TEST_DATA} from '../test-data';
import {POIService} from '../../services/POI/poi.service';
import {POIModel} from '../../data/POIModel';
import {POI_REPOSITORY, POIRepository} from '../../services/POI/POIRepository';
import {LongitudeRangeError} from '../../errors/POI/LongitudeRangeError';
import {MissingPOIError} from '../../errors/POI/MissingPOIError';
import {PlaceNameNotFoundError} from '../../errors/POI/PlaceNameNotFoundError';
import {DescriptionLengthError} from '../../errors/POI/DescriptionLengthError';
import {MapSearchService} from '../../services/map-search-service/map-search.service';
import {MAP_SEARCH_REPOSITORY, MapSearchRepository} from '../../services/map-search-service/MapSearchRepository';
import {POISearchModel} from '../../data/POISearchModel';
import {createMockRepository} from '../helpers/test-helpers';
import {USER_REPOSITORY, UserRepository} from '../../services/User/UserRepository';
import {POIAlreadyExistsError} from '../../errors/POI/POIAlreadyExistsError';


// Pruebas de integración sobre POI
// HU201-202, HU203, HU204, HU205, HU206, HU501
// Se excluye HU604 por ser sobre el guardado y recuperación de datos en la BBDD
describe('Pruebas de integración sobre POI', () => {
    // SUT
    let poiService: POIService;

    // Mock de acceso a la BD (usuario)
    let mockUserRepository: jasmine.SpyObj<UserRepository>;

    // Mock de acceso a la BD (POI)
    let mockPoiRepository: jasmine.SpyObj<POIRepository>;

    // Datos de prueba
    const poiA: POIModel = POI_TEST_DATA[0];
    const poiB: POIModel = POI_TEST_DATA[1];

    beforeEach(async () => {
        mockUserRepository = createMockRepository('user');
        mockPoiRepository = createMockRepository('poi');

        await TestBed.configureTestingModule({
            providers: [
                POIService,
                MapSearchService,
                {provide: USER_REPOSITORY, useValue: mockUserRepository},
                {provide: POI_REPOSITORY, useValue: mockPoiRepository}
            ],
        }).compileComponents();

        // Inyección del servicio
        poiService = TestBed.inject(POIService);
    });


    // Las pruebas empiezan a partir de AQUÍ

    // Corresponde a más de una HU, puesto que utilizan el mismo method
    describe('HU201 Y HU202: Registrar POI', () => {

        it('EV01: Dar de alta un POI nuevo', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI es ["A"]
            const mockSearchPOI: POISearchModel = new POISearchModel(poiB.lat, poiB.lon, poiB.placeName);
            const mockPOIB: POIModel = new POIModel(mockSearchPOI.lat, mockSearchPOI.lon, mockSearchPOI.placeName,
                poiB.geohash, poiB.pinned);

            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPoiRepository.poiExists.and.resolveTo(false);
            mockPoiRepository.createPOI.and.resolveTo(mockPOIB);

            // WHEN
            // Se intenta dar de alta el POI "B" mediante sus coordenadas
            const poiCreado = await poiService.createPOI(mockSearchPOI);

            // THEN
            // Se llama a la función "createPOI" con los parámetros pertinentes
            expect(mockPoiRepository.createPOI).toHaveBeenCalledWith(mockPOIB);

            // Se da de alta el POI
            expect(poiCreado).toEqual(jasmine.objectContaining({
                    lat: poiB.lat,
                    lon: poiB.lon,
                    placeName: poiB.placeName,
                    geohash: poiB.geohash,
                    pinned: false,
                })
            );
        });

        it('EI03: Dar de alta un POI ya existente', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            const mockSearchPOI: POISearchModel = new POISearchModel(poiB.lat, poiB.lon, poiB.placeName);
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPoiRepository.poiExists.and.resolveTo(true);

            // WHEN
            // Se intenta dar de alta el mismo POI 2 veces consecutivas
            await expectAsync(poiService.createPOI(mockSearchPOI)).toBeRejectedWith(new POIAlreadyExistsError());
            // THEN
            // Se lanza el error POIAlreadyExistsError

            // No se llama a la función "createPOI"
            expect(mockPoiRepository.createPOI).not.toHaveBeenCalled();
        });
    });


    describe('HU203: Consultar el listado de POI', () => {

        it('HU203-EV01 Consultar el listado vacío de POI', async () => {
            // GIVEN
            // El usuario maria se ha registrado y ha iniciado sesión
            // Lista de POI registrados vacía
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPoiRepository.getPOIList.and.resolveTo([]);

            // WHEN
            // El usuario maria consulta su lista de POI registrados
            let list = await poiService.getPOIList();

            // THEN
            // Se llama a la función "getPOIList"
            expect(mockPoiRepository.getPOIList).toHaveBeenCalled();

            // Se devuelve una lista vacía y se indica que no hay POI registrados.
            expect(list.length).toBe(0);
        });

        it('HU203-EV02: Consultar el listado no vacío de POI', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A"]
            const mockPOI: POIModel = new POIModel(poiA.lat, poiA.lon, poiA.placeName, poiA.geohash, poiA.pinned);

            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPoiRepository.getPOIList.and.resolveTo([mockPOI]);

            // WHEN
            // El usuario consulta su lista de POI registrados
            const listaPoi = await poiService.getPOIList();

            // THEN
            // Se llama a la función "getPOIList"
            expect(mockPoiRepository.getPOIList).toHaveBeenCalled();

            // Se devuelve el listado de POI
            expect(listaPoi.length).toBe(1);
        });
    });


    describe('HU204: Consultar información de POI', () => {

        it('HU204-EV01: Consultar información de un POI registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A"]
            const mockPOI: POIModel = new POIModel(poiA.lat, poiA.lon, poiA.placeName, poiA.geohash, poiA.pinned);

            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPoiRepository.poiExists.and.resolveTo(true);
            mockPoiRepository.getPOI.and.resolveTo(mockPOI);

            // WHEN
            // El usuario consulta los datos del POI “A”
            const poiConsultado = await poiService.readPOI(poiA.geohash);

            // THEN
            // Se llama a la función "getPOI" con los parámetros pertinentes
            expect(mockPoiRepository.getPOI).toHaveBeenCalledWith(poiA.geohash);

            // Se obtienen los datos del POI
            expect(poiConsultado).toEqual(jasmine.objectContaining({
                    lat: poiA.lat,
                    lon: poiA.lon,
                    geohash: poiA.geohash,
                    placeName: poiA.placeName,
                    pinned: false,
                })
            );
        });

        it('HU204-EI02: Consultar información de un POI no registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es [“A”]
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPoiRepository.poiExists.and.resolveTo(false);

            // WHEN
            // El usuario consulta los datos del POI con geohash vacío (no registrado)
            await expectAsync(poiService.readPOI(" "))
                .toBeRejectedWith(new MissingPOIError());
            // THEN
            // Se lanza el error MissingPOIError

            // No se llama a la función "getPOI"
            expect(mockPoiRepository.getPOI).not.toHaveBeenCalled();
        });
    });


    describe('HU205: Modificar información de POI', () => {

        it('HU205-EV01: Modificar información de un POI registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A"]
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPoiRepository.poiExists.and.resolveTo(true);
            mockPoiRepository.updatePOI.and.resolveTo(true);

            // WHEN
            // El usuario modifica el alias del POI “A” a "Al y Canto"
            const poiModificado = await poiService.updatePOI(poiA.geohash, {alias: "Al y Canto"})

            // THEN
            // Se llama a la función "updatePOI" con los parámetros pertinentes
            expect(mockPoiRepository.updatePOI).toHaveBeenCalledWith(poiA.geohash, {alias: "Al y Canto"});

            // Se actualiza el POI
            expect(poiModificado).toBeTrue();
        });

        it('HU205-EI02: Modificar información de un POI no registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es [“A”]
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPoiRepository.poiExists.and.resolveTo(false);

            // WHEN
            // El usuario modifica el alias del POI con geohash vacío (no registrado) a "Castellón de la Nada"
            await expectAsync(poiService.updatePOI(" ", {alias: "Castellón de la Nada"}))
                .toBeRejectedWith(new MissingPOIError());
            // THEN
            // Se lanza el error MissingPOIError

            // No se llama a la función "updatePOI"
            expect(mockPoiRepository.updatePOI).not.toHaveBeenCalled();
        });

        it('HU205-EI03: Modificar información de un POI sin seguir las reglas de dominio', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es [“A”]
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPoiRepository.poiExists.and.resolveTo(true);

            // WHEN
            // El usuario modifica la descripción del POI "A" a un texto con 151 caracteres (el máximo es 150)
            await expectAsync(poiService.updatePOI(poiA.geohash, {
                description: "The descriptive text is deliberately engineered " +
                    "to exceed the maximum character limit of 150. " +
                    "As such, it serves as a perfect test case for validation."
            }))
                .toBeRejectedWith(new DescriptionLengthError());

            // THEN
            // Se lanza el error DescriptionLengthError

            // No se llama a la función "updatePOI"
            expect(mockPoiRepository.updatePOI).not.toHaveBeenCalled();
        });
    });


    describe('HU206: Eliminar un POI', () => {

        it('HU206-EV01: Eliminar un POI registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A, B"]
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPoiRepository.poiExists.and.resolveTo(true);
            mockPoiRepository.deletePOI.and.resolveTo(true);

            // WHEN
            // El usuario trata de borrar el POI "B"
            const poiBorrado = await poiService.deletePOI(poiB.geohash);

            // THEN
            // Se llama a la función "deletePOI" con los parámetros pertinentes
            expect(mockPoiRepository.deletePOI).toHaveBeenCalledWith(poiB.geohash);

            // El POI "B" se elimina
            expect(poiBorrado).toBeTrue();
        });

        it('HU206-EI02: Eliminar un POI no registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A"]
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPoiRepository.poiExists.and.resolveTo(false);

            // WHEN
            // El usuario trata de borrar el POI con geohash vacío (no registrado).
            await expectAsync(poiService.deletePOI(" "))
                .toBeRejectedWith(new MissingPOIError());
            // THEN
            // Se lanza el error MissingPOIError

            // No se llama a la función "deletePOI"
            expect(mockPoiRepository.deletePOI).not.toHaveBeenCalled();
        });
    });


    describe('HU501: Fijar un POI', () => {

        it('HU501-EV01: Fijar un POI registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es ["A", "B"] (registrar B)
            const mockPOIB: POIModel = new POIModel(poiB.lat, poiB.lon, poiB.placeName, poiB.geohash, poiB.pinned);
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPoiRepository.poiExists.and.resolveTo(true);
            mockPoiRepository.pinPOI.and.resolveTo(true);

            // WHEN
            // El usuario trata de fijar el POI "B"
            const poiFijado = await poiService.pinPOI(mockPOIB);

            // THEN
            // El punto B pasa a estar fijado (pinned = true)
            expect(poiFijado).toBeTrue();

            // Se llama a la función "pinPOI" con los parámetros pertinentes
            expect(mockPoiRepository.pinPOI).toHaveBeenCalledWith(mockPOIB);
        });

        it('HU501-EI02: Fijar un POI no registrado', async () => {
            // GIVEN
            // El usuario ramon ha iniciado sesión
            // Lista de POI registrados es [“A”]
            mockUserRepository.sessionActive.and.resolveTo(true);
            mockPoiRepository.poiExists.and.resolveTo(false);

            // WHEN
            // El usuario trata de fijar un POI no registrado
            await expectAsync(poiService.pinPOI(poiB)).toBeRejectedWith(new MissingPOIError());
            // THEN
            // Se lanza el error MissingPOIError

            // No se llama a la función "pinPOI"
            expect(mockPoiRepository.pinPOI).not.toHaveBeenCalled();
        });
    });
});
