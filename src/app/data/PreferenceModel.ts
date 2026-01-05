import {PREFERENCIA, TIPO_TRANSPORTE} from './RouteModel';

/** Clase que engloba las preferencias del usuario.
 * @param costeCombustible inicializado a true: mostrar o no el coste del combustible de una ruta
 * @param costeCalorias inicializado a true: mostrar o no el coste de calorías de una ruta
 * @param tipoTransporte Opcional: tipo de transporte predeterminado para las rutas
 * @param tipoRuta Opcional: tipo de ruta predeterminado para las rutas
 * @param matricula Opcional: solo debe estar si tipoTransporte es vehículo
 * */
// Interfaz para el argumento del constructor
interface PreferenceOptions {
    costeCombustible?: boolean;
    costeCalorias?: boolean;
    tipoTransporte?: TIPO_TRANSPORTE;
    tipoRuta?: PREFERENCIA;
    matricula?: string;
}

export class PreferenceModel {
    // HU504A: Modificar transporte por defecto
    tipoTransporte?: TIPO_TRANSPORTE;
    matricula?: string;

    // HU505B: Modificar preferencia de ruta por defecto
    tipoRuta?: PREFERENCIA;

    // HU506C: Elegir información mostrada
    costeCombustible: boolean;
    costeCalorias: boolean;

    /**
     * @param options Objeto de configuración parcial.
     */
    constructor(options: PreferenceOptions = {}) {
        this.costeCombustible = options.costeCombustible ?? true;
        this.costeCalorias = options.costeCalorias ?? true;
        this.tipoTransporte = options.tipoTransporte;
        this.tipoRuta = options.tipoRuta;
        this.matricula = options.matricula;
    }

    toJSON(): any {
        return JSON.parse(JSON.stringify({
            costeCombustible: this.costeCombustible,
            costeCalorias: this.costeCalorias,
            tipoTransporte: this.tipoTransporte,
            tipoRuta: this.tipoRuta,
            matricula: this.matricula
        }));
    }

    static fromJSON(json: any): PreferenceModel {
        return new PreferenceModel(json);
    }
}
