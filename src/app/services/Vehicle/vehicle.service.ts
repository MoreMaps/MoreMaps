import {inject, Injectable} from '@angular/core';
import {VEHICLE_REPOSITORY, VehicleRepository} from './VehicleRepository';
import {FUEL_TYPE, VehicleModel} from '../../data/VehicleModel';
import {SessionNotActiveError} from '../../errors/User/SessionNotActiveError';
import {USER_REPOSITORY, UserRepository} from '../User/UserRepository';
import {VehicleAlreadyExistsError} from '../../errors/Vehicle/VehicleAlreadyExistsError';
import {InvalidDataError} from '../../errors/InvalidDataError';
import {MissingVehicleError} from '../../errors/Vehicle/MissingVehicleError';


@Injectable({providedIn: 'root'})
export class VehicleService {
    private userDb: UserRepository = inject(USER_REPOSITORY);
    private vehicleDb: VehicleRepository = inject(VEHICLE_REPOSITORY);

    // HU301 Crear vehículo
    /**
     * Crea un vehículo para el usuario actual.
     * @param model El VehicleModel con los datos del vehículo.
     * @returns El vehículo creado.
     * @throws SessionNotActiveError si la sesión no está activa.
     * @throws VehicleAlreadyExistsError si el vehículo ya existe.
     * @throws InvalidDataError si los datos no siguen las reglas de negocio.
     */
    async createVehicle(model: VehicleModel): Promise<VehicleModel> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que el vehículo NO exista
        if (await this.vehicleDb.vehicleExists(model.matricula)) {
            throw new VehicleAlreadyExistsError();
        }

        // Comprueba que los datos son válidos
        try {
            this.validateVehicle(model, true);
        }
        catch (error: any) {
            throw new InvalidDataError();
        }

        // Crear vehículo
        return this.vehicleDb.createVehicle(model);
    }

    // HU302 Consultar lista de vehículos
    async getVehicleList(): Promise<VehicleModel[]> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Obtener lista de vehículos
        let vehicleList: VehicleModel[] = await this.vehicleDb.getVehicleList();
        if (vehicleList.length > 0) {
            vehicleList.sort((a, b) => {
                // Ordenar por pinned (true > false)
                if (a.pinned !== b.pinned) {
                    return a.pinned ? -1 : 1;
                }
                // Ordenar alfabéticamente por alias
                return a.alias.localeCompare(b.alias, 'es', {sensitivity: 'base'});
            });
            return vehicleList;
        }
        return [];
    }

    // HU303 Modificar información de un vehículo
    async updateVehicle(matricula: string, update: Partial<VehicleModel>): Promise<boolean> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que el vehículo exista
        if (!await this.vehicleDb.vehicleExists(matricula)) {
            throw new MissingVehicleError();
        }

        // Comprueba que el nuevo vehículo NO exista (siempre que se cambie la matrícula)
        if (update.matricula && update.matricula != matricula && await this.vehicleDb.vehicleExists(update.matricula)) {
            throw new VehicleAlreadyExistsError();
        }

        // Comprueba que los datos son válidos
        try {
            this.validateVehicle(update, false);
        }
        catch (error: any) {
            throw new InvalidDataError();
        }

        // Actualizar vehículo
        return this.vehicleDb.updateVehicle(matricula, update);
    }

    // HU304 Eliminar vehículo
    async deleteVehicle(matricula: string): Promise<boolean> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que el vehículo exista
        if (!await this.vehicleDb.vehicleExists(matricula)) {
            throw new MissingVehicleError();
        }

        // Eliminar vehículo
        return this.vehicleDb.deleteVehicle(matricula);
    }

    /**
     * Elimina todos los vehículos del usuario de forma atómica.
     * @returns Promise con true si se han borrado, o false si no se han borrado.
     */
    async clear(): Promise<boolean> {
        return await this.vehicleDb.clear();
    }

    // HU305 Consultar vehículo
    async readVehicle(matricula: string): Promise<VehicleModel> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que el vehículo exista
        if (!await this.vehicleDb.vehicleExists(matricula)) {
            throw new MissingVehicleError();
        }

        // Devuelve el vehículo leído
        return this.vehicleDb.getVehicle(matricula);
    }

    // HU502 Fijar vehículo
    async pinVehicle(matricula: string): Promise<boolean> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que el vehículo exista
        if (!await this.vehicleDb.vehicleExists(matricula)) {
            throw new MissingVehicleError();
        }

        // Fijar vehículo
        return this.vehicleDb.pinVehicle(matricula);
    }

    /**
     * Comprueba que los datos recibidos siguen las reglas de negocio.
     * @param vehiculo Partial con los datos a consultar
     * @param creating true si se crea el vehículo, false si no (antes "strictMode")
     * @private
     */
    private validateVehicle(vehiculo: Partial<VehicleModel>, creating: boolean) {
        const year = vehiculo.anyo;
        const tipoCombustible = vehiculo.tipoCombustible;
        const consumoMedio = vehiculo.consumoMedio;
        const curYear = new Date().getFullYear();
        const minYear = 1900;
        const MIN_CONSUMO_MEDIO = 0.1; // Consumo mínimo razonable (0.1 L/100km)

        // MATRÍCULA
        // Debe ser una cadena
        if (typeof vehiculo.matricula !== 'string') {
            if (creating)
                throw new Error(`El campo 'matrícula' es obligatorio.`);
        }
        else {
            // No debe contener vocales
            if (/[AEIOU]/i.test(vehiculo.matricula)) {
                throw new Error(`Una matrícula no debe contener vocales.`);
            }
        }

        // AÑO
        // Debe ser un entero
        if (creating && (typeof year !== 'number' || !Number.isInteger(year))) {
            throw new Error('El año del vehículo debe ser un número entero válido')
        }

        // En la industria automotriz es común registrar vehículos a finales de año como del año siguiente
        if (year && (year < minYear || year > curYear + 1)) {
            throw new Error(`El año debe estar entre ${minYear} y ${curYear + 1}`);
        }

        // COMBUSTIBLE
        // Debe ser una cadena
        if (creating && typeof tipoCombustible !== 'string') {
            throw new Error(`El campo de combustible es obligatorio`)
        }
        // Debe existir en la enum "FUEL_TYPE"
        if (tipoCombustible && !Object.values(FUEL_TYPE).includes(tipoCombustible as FUEL_TYPE)) {
            throw new Error(`Tipo de combustible "${tipoCombustible}" inválido.`)
        }

        // CONSUMO MEDIO
        // Debe ser un número
        if (creating && typeof consumoMedio !== 'number') {
            throw new Error(`El campo de consumo medio es obligatorio y debe ser un número positivo y mayor o igual que ${MIN_CONSUMO_MEDIO}`)
        }
        // Debe ser mayor que el consumo medio mínimo
        if (consumoMedio && consumoMedio < MIN_CONSUMO_MEDIO) {
            throw new Error(`El consumo medio debe ser mayor o igual que ${MIN_CONSUMO_MEDIO}`)
        }
    }
}
