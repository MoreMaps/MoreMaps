import {InjectionToken} from '@angular/core';
import {PreferenceModel} from '../../data/PreferenceModel';

export const PREFERENCE_REPOSITORY = new InjectionToken<PreferenceRepository>('PreferenceRepository');

export interface PreferenceRepository {
    // Crear preferencias
    setPreferences(model: PreferenceModel): Promise<boolean>;

    // Modificar preferencias
    updatePreferences(update: Partial<PreferenceModel>): Promise<boolean>;

    // Enumerar preferencias
    getPreferenceList(): Promise<PreferenceModel>;

    // Limpiar preferencias
    clear(): Promise<boolean>;

    // Métodos auxiliares
    preferencesExist(): Promise<boolean>;
}
