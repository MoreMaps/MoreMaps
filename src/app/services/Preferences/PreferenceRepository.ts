import {InjectionToken} from '@angular/core';
import {PreferenceModel} from '../../data/PreferenceModel';

export const PREFERENCE_REPOSITORY = new InjectionToken<PreferenceRepository>('PreferenceRepository');

export interface PreferenceRepository {
    // Modificar preferencias
    updatePreferences(update: PreferenceModel): Promise<boolean>;

    // Enumerar preferencias
    getPreferenceList(): Promise<PreferenceModel>;

    // Limpiar preferencias
    clear(): Promise<boolean>;
}
