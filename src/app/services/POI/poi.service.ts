import {inject, Injectable} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {POI_REPOSITORY, POIRepository} from './POIRepository';
import {Geohash, geohashForLocation} from 'geofire-common';
import {POISearchModel} from '../../data/POISearchModel';
import {USER_REPOSITORY, UserRepository} from '../User/UserRepository';
import {SessionNotActiveError} from '../../errors/User/SessionNotActiveError';
import {POIAlreadyExistsError} from '../../errors/POI/POIAlreadyExistsError';
import {MissingPOIError} from '../../errors/POI/MissingPOIError';
import {DescriptionLengthError} from '../../errors/POI/DescriptionLengthError';

@Injectable({providedIn: 'root'})
export class POIService {
    private userDb: UserRepository = inject(USER_REPOSITORY);
    private poiDb: POIRepository = inject(POI_REPOSITORY);

    // HU201 y HU202 Crear POI
    /**
     * Crea un punto de interés (POI) para el usuario actual.
     * @param poi El resultado de búsqueda de la API; incluye latitud, longitud y topónimo.
     * @returns El POI creado.
     * @throws SessionNotActiveError si la sesión no está activa.
     * @throws POIAlreadyExistsError si el POI ya existe.
     */
    async createPOI(poi: POISearchModel): Promise<POIModel> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Declara el POI a insertar y obtiene su geohash
        const poiForDB : POIModel = new POIModel(poi.lat, poi.lon, poi.placeName, geohashForLocation([poi.lat, poi.lon], 7));

        // Comprueba que el POI NO exista
        if (await this.poiDb.poiExists(poiForDB.geohash)) {
            throw new POIAlreadyExistsError();
        }

        // Crea el POI
        return this.poiDb.createPOI(poiForDB);
    }

    // HU203 Consultar lista de POI
    /**
     * Obtiene la lista de POI del usuario actual, ordenada por "pinned" y luego por orden alfabético.
     * @returns La lista de POIModel del usuario actual.
     * @throws SessionNotActiveError si la sesión no está activa.
     */
    async getPOIList(): Promise<POIModel[]> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Obtener lista de POI
        let poiList = await this.poiDb.getPOIList();
        if (poiList.length > 0) {
            poiList.sort((a, b) => {
                // Ordenar por pinned (true > false)
                if (a.pinned !== b.pinned) {
                    return a.pinned ? -1 : 1;
                }
                // Ordenar alfabéticamente por alias o placeName
                const nameA = this.getDisplayName(a).toLowerCase();
                const nameB = this.getDisplayName(b).toLowerCase();
                return nameA.localeCompare(nameB, 'es', {sensitivity: 'base'});
            });
            return poiList;
        }
        return [];
    }

    /**
     * Obtiene el alias que se muestra al leer el POI.
     * @param item El POIModel leído.
     * @returns El alias visible del POI.
     * @private
     */
    private getDisplayName(item: POIModel): string {
        // Usar alias si existe y no está vacío, si no, usar placeName
        return (item.alias && item.alias.trim() !== '') ? item.alias : item.placeName;
    }

    // HU204 Consultar POI
    /**
     * Consulta los datos de un POI.
     * @param geohash El geohash del POI a leer.
     * @returns El POI leído.
     * @throws SessionNotActiveError si la sesión no está activa.
     * @throws MissingPOIError si el POI no existe.
     */
    async readPOI(geohash: Geohash): Promise<POIModel> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que el POI exista
        if (!await this.poiDb.poiExists(geohash)) {
            throw new MissingPOIError();
        }

        // Devuelve el POI leído
        return this.poiDb.getPOI(geohash);
    }

    // HU205 Modificar información de POI
    /**
     * Modifica los datos de un POI concreto.
     * @param geohash El geohash del POI a actualizar.
     * @param update Partial con los atributos que se van a actualizar.
     * @returns Promise con true si se ha actualizado, false si no.
     * @throws SessionNotActiveError si la sesión no está activa.
     * @throws MissingPOIError si el POI no existe.
     */
    async updatePOI(geohash: string, update: Partial<POIModel>): Promise<boolean> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que el POI exista
        if (!await this.poiDb.poiExists(geohash)) {
            throw new MissingPOIError();
        }

        // Comprobar reglas de negocio (el formulario también lo hace)
        // Descripción demasiado larga (>150 chars)
        if (update.description && update.description?.length > 150) throw new DescriptionLengthError();

        // Actualizar POI
        return this.poiDb.updatePOI(geohash, update);
    }

    // HU206 Eliminar POI
    /**
     * Elimina un POI específico.
     * @param geohash El geohash del POI a eliminar.
     * @returns Promise con true si se ha eliminado, false si no.
     * @throws SessionNotActiveError si la sesión no está activa.
     * @throws MissingPOIError si el POI no existe.
     */
    async deletePOI(geohash: Geohash): Promise<boolean> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que el POI exista
        if (!await this.poiDb.poiExists(geohash)) {
            throw new MissingPOIError();
        }

        // Eliminar POI
        return this.poiDb.deletePOI(geohash);
    }

    // HU501 Fijar POI
    /**
     * Fija un POI específico.
     * @param poi El POI a fijar.
     * @returns Promise con true si se ha fijado, false si no.
     * @throws SessionNotActiveError si la sesión no está activa.
     * @throws MissingPOIError si el POI no existe.
     */
    async pinPOI(poi: POIModel): Promise<boolean> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que el POI exista
        if (!await this.poiDb.poiExists(poi.geohash)) {
            throw new MissingPOIError();
        }

        // Fija el POI
        return await this.poiDb.pinPOI(poi);
    }
}
