import {TestBed} from '@angular/core/testing'
import {createMockRepository} from '../helpers/test-helpers';
import {FuelPriceService} from '../../services/fuel-price-service/fuel-price-service';
import {
    FUEL_PRICE_REPOSITORY,
    FuelPriceRepository
} from '../../services/fuel-price-service/FuelPriceRepository';
import {FUEL_TYPE} from '../../data/VehicleModel';
import {FuelPriceNotFoundError} from '../../errors/Route/FuelPriceNotFoundError';


// Pruebas de integración sobre el servicio de obtención del coste del combustible
// HU402
describe('Pruebas de integración sobre el servicio de obtención del coste del combustible', () => {
    // SUT
    let fuelPriceService: FuelPriceService;

    // Mock de acceso a la API
    let mockFuelPriceRepository: jasmine.SpyObj<FuelPriceRepository>;

    beforeEach(async () => {
        mockFuelPriceRepository = createMockRepository('fuelPrice');
        await TestBed.configureTestingModule({
            providers: [
                FuelPriceService,
                {provide: FUEL_PRICE_REPOSITORY, useValue: mockFuelPriceRepository},
            ],
        }).compileComponents();

        // Inyección del servicio
        fuelPriceService = TestBed.inject(FuelPriceService);
    });


    // Las pruebas empiezan a partir de AQUÍ

    describe('HU402: Obtener coste asociado a ruta', () => {

        it('HU402-EV01: Obtener coste cuando el resultado es válido', async () => {
            // GIVEN
            mockFuelPriceRepository.processStations.and.resolveTo(new Map());
            mockFuelPriceRepository.getPrice.and.resolveTo(1.00);

            // WHEN
            // Se busca el precio del tipo de combustible "Diésel"
            const result = await fuelPriceService.getPrice(FUEL_TYPE.DIESEL);

            // THEN
            // Se llama a la función "searchPOIByCoords" con los parámetros pertinentes
            expect(mockFuelPriceRepository.getPrice).toHaveBeenCalledWith(FUEL_TYPE.DIESEL, new Map());

            // El resultado es el esperado
            expect(result).toEqual(1.00);
        });

        it('HU402-EI01: Obtener coste cuando el resultado es inválido', async () => {
            // GIVEN
            mockFuelPriceRepository.processStations.and.resolveTo(new Map());
            mockFuelPriceRepository.getPrice.and.resolveTo(-1);

            // WHEN
            // Se busca el precio del tipo de combustible vacío (que no existe)
            await expectAsync(fuelPriceService.getPrice("" as FUEL_TYPE)).toBeRejectedWith(new FuelPriceNotFoundError());

            // THEN
            // Se lanza la excepción FuelPriceNotFoundError

            // Se llama a la función "getPrice" con los parámetros pertinentes
            expect(mockFuelPriceRepository.getPrice).toHaveBeenCalledWith("" as FUEL_TYPE, new Map());
        });
    });
});
