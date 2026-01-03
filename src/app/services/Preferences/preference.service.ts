import {inject, Injectable} from '@angular/core';
import {USER_REPOSITORY, UserRepository} from '../User/UserRepository';
import {PreferenceModel} from '../../data/PreferenceModel';
import {PREFERENCE_REPOSITORY, PreferenceRepository} from './PreferenceRepository';

@Injectable({providedIn: 'root'})
export class PreferenceService {
    private userDb: UserRepository = inject(USER_REPOSITORY);
    private preferenceDb: PreferenceRepository = inject(PREFERENCE_REPOSITORY);

    // HU602
    /** Recupera las preferencias del usuario.
     * A esta función se le llama cuando se inicia sesión, para guardar el objeto en localStorage.
     * También se le llama cuando intentamos acceder a una preferencia, y el objeto no se encuentra en localStorage.
     * @returns PreferenceModel con las preferencias del usuario
     */
    async readPreferences(): Promise<PreferenceModel> {
        return new PreferenceModel(false, false)
    }

    // HU504, HU505, HU506
    /** Modifica las preferencias del usuario y guarda el resultado final en localStorage.
     * Crea el objeto PreferenceModel si no existe previamente.
     * @returns Promise con true si se han modificado correctamente los datos.
     */
    async updatePreferences(update: Partial<PreferenceModel>): Promise<boolean> {
        return false;
    }

    /**
     * Limpia las preferencias del usuario.
     * @returns Promise con true si se han borrado correctamente todos los datos, false si no.
     */
    async clearPreferences(): Promise<boolean> {
        return false;
    }
}
