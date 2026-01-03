import {inject, Injectable} from '@angular/core';
import {PreferenceRepository} from './PreferenceRepository';
import {Auth} from '@angular/fire/auth';
import {Firestore} from '@angular/fire/firestore';
import {PreferenceModel} from "../../data/PreferenceModel";

@Injectable({
    providedIn: 'root'
})
export class PreferenceDB implements PreferenceRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);

    updatePreferences(update: Partial<PreferenceModel>): Promise<PreferenceModel> {
        throw new Error("Method not implemented.");
    }

    getPreferenceList(): Promise<PreferenceModel> {
        throw new Error("Method not implemented.");
    }

    clear(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
}
