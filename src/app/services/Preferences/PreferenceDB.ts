import {inject, Injectable} from '@angular/core';
import {PreferenceRepository} from './PreferenceRepository';
import {Auth} from '@angular/fire/auth';
import {deleteDoc, doc, Firestore, getDoc, setDoc} from '@angular/fire/firestore';
import {PreferenceModel} from "../../data/PreferenceModel";
import {DBAccessError} from '../../errors/DBAccessError';

@Injectable({
    providedIn: 'root'
})
export class PreferenceDB implements PreferenceRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);

    /**
     * Crea un nuevo documento de preferencias.
     * @param update El objeto con las preferencias a crear.
     */
    async updatePreferences(update: PreferenceModel): Promise<boolean> {
        try {
            // Obtener los datos del documento que se va a crear
            const path = `preferences/${this.auth.currentUser!.uid}`;
            const preferenceRef = doc(this.firestore, path);

            // Crear documento
            await setDoc(preferenceRef, update.toJSON());
            return true;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Obtiene las preferencias del usuario actual.
     */
    async getPreferenceList(): Promise<PreferenceModel> {
        try {
            const path = `preferences/${this.auth.currentUser!.uid}`;
            const preferenceRef = await getDoc(doc(this.firestore, path));
            return PreferenceModel.fromJSON(preferenceRef.data());
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Limpia las preferencias del usuario actual.
     * @returns Promise con true si se han borrado correctamente todos los datos, false si no.
     */
    async clear(): Promise<boolean> {
        try {
            // Obtener los datos del documento que se va a borrar
            const path = `preferences/${this.auth.currentUser!.uid}`;
            const preferenceRef = doc(this.firestore, path);

            // Borrar documento
            await deleteDoc(preferenceRef);
            return true;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }
}
