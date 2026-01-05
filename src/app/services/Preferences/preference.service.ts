import {inject, Injectable} from '@angular/core';
import {USER_REPOSITORY, UserRepository} from '../User/UserRepository';
import {PreferenceModel} from '../../data/PreferenceModel';
import {PREFERENCE_REPOSITORY, PreferenceRepository} from './PreferenceRepository';
import {SessionNotActiveError} from '../../errors/User/SessionNotActiveError';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {VEHICLE_REPOSITORY, VehicleRepository} from '../Vehicle/VehicleRepository';
import {MissingVehicleError} from '../../errors/Vehicle/MissingVehicleError';
import {InvalidRouteTypeError} from '../../errors/Route/InvalidRouteTypeError';
import {InvalidTransportTypeError} from '../../errors/Vehicle/InvalidTransportTypeError';

@Injectable({providedIn: 'root'})
export class PreferenceService {
    private userDb: UserRepository = inject(USER_REPOSITORY);
    private vehicleDb: VehicleRepository = inject(VEHICLE_REPOSITORY);
    private preferenceDb: PreferenceRepository = inject(PREFERENCE_REPOSITORY);

    // HU602
    /** Recupera las preferencias del usuario.
     * A esta función se le llama cuando se inicia sesión, para guardar el objeto en localStorage.
     * También se le llama cuando intentamos acceder a una preferencia, y el objeto no se encuentra en localStorage.
     * @returns PreferenceModel con las preferencias del usuario
     * @throws SessionNotActiveError Si la sesión no está activa.
     */
    async readPreferences(): Promise<PreferenceModel> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Se devuelven las preferencias actuales
        return this.preferenceDb.getPreferenceList();
    }

    // HU504
    /** Modifica las preferencias del usuario y guarda el resultado final en localStorage.
     * Crea el objeto PreferenceModel si no existe previamente.
     * @returns Promise con true si se han modificado correctamente los datos.
     * @throws SessionNotActiveError Si la sesión no está activa.
     * @throws MissingVehicleError Si el vehículo a establecer como preferencia no existe.
     */
    async updatePreferences(update: Partial<PreferenceModel>): Promise<boolean> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Si el objeto no tiene preferencias, no hay que actualizar nada.
        if (!(Object.keys(update).length > 0)) {
            return true;
        }

        // Comprueba que el tipo de transporte sea válido
        if (update.tipoTransporte && !(Object.values(TIPO_TRANSPORTE).includes(update.tipoTransporte))) {
            throw new InvalidTransportTypeError();
        }

        // Comprueba que, si se actualiza el tipo de transporte a "vehículo", el vehículo exista.
        const esVehiculo = update.tipoTransporte === TIPO_TRANSPORTE.VEHICULO;

        if (esVehiculo) {
            if (!update.matricula || !await this.vehicleDb.vehicleExists(update.matricula)) {
                throw new MissingVehicleError();
            }
        }

        // Comprueba que el tipo de ruta sea válido
        if (update.tipoRuta && !(Object.values(PREFERENCIA).includes(update.tipoRuta))) {
            throw new InvalidRouteTypeError();
        }

        // Actualizar documento (únicamente los campos enviados)
        // Si no existe, lo crea e inserta los datos.
        const updateForDB: PreferenceModel = new PreferenceModel(update);
        return this.preferenceDb.updatePreferences(updateForDB);
    }

    /**
     * Limpia las preferencias del usuario.
     * @returns Promise con true si se han borrado correctamente todos los datos, false si no.
     */
    async clearPreferences(): Promise<boolean> {
        return this.preferenceDb.clear();
    }
}
