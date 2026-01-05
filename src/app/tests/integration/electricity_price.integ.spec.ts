import {TestBed} from '@angular/core/testing'
import {createMockRepository} from '../test-helpers';
import {
    ELECTRICITY_PRICE_REPOSITORY,
    ElectricityPriceRepository
} from '../../services/electricity-price-service/ElectricityPriceRepository';
import {ElectricityPriceService} from '../../services/electricity-price-service/electricity-price-service';
import {ElectricityPriceNotFoundError} from '../../errors/Route/ElectricityPriceNotFoundError';


// Pruebas de integración sobre el servicio de obtención del coste de la electricidad
// HU402
describe('Pruebas de integración sobre el servicio de obtención del coste de la electricidad', () => {
    // SUT
    let electricityPriceService: ElectricityPriceService;

    // Mock de acceso a la API
    let mockElectricityPriceRepository: jasmine.SpyObj<ElectricityPriceRepository>;

    beforeEach(async () => {
        mockElectricityPriceRepository = createMockRepository('electricityPrice');
        await TestBed.configureTestingModule({
            providers: [
                ElectricityPriceService,
                {provide: ELECTRICITY_PRICE_REPOSITORY, useValue: mockElectricityPriceRepository},
            ],
        }).compileComponents();

        // Inyección del servicio
        electricityPriceService = TestBed.inject(ElectricityPriceService);
    });


    // Las pruebas empiezan a partir de AQUÍ

    describe('HU402: Obtener coste asociado a ruta', () => {

        it('HU402-EV01: Obtener coste cuando el resultado es válido', async () => {
            // GIVEN
            // La API está disponible
            mockElectricityPriceRepository.getPrice.and.resolveTo(1.00);

            // WHEN
            // Se busca el precio de la electricidad
            const result = await electricityPriceService.getPrice();

            // THEN
            // Se llama a la función "searchPOIByCoords" con los parámetros pertinentes
            expect(mockElectricityPriceRepository.getPrice).toHaveBeenCalled();

            // El resultado es el esperado
            expect(result).toEqual(1.00);
        });

        it('HU402-EI01: Obtener coste cuando el resultado es inválido', async () => {
            // GIVEN
            // La API NO está disponible
            mockElectricityPriceRepository.getPrice.and.resolveTo(-1);

            // WHEN
            // Se busca el precio de la electricidad
            await expectAsync(electricityPriceService.getPrice()).toBeRejectedWith(new ElectricityPriceNotFoundError());

            // THEN
            // Se lanza la excepción ElectricityPriceNotFoundError

            // Se llama a la función "getPrice" con los parámetros pertinentes
            expect(mockElectricityPriceRepository.getPrice).toHaveBeenCalledWith();
        });
    });
});
