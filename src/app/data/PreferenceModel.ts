import {PREFERENCIA, TIPO_TRANSPORTE} from './RouteModel';

/** Objeto que engloba las preferencias del usuario.
 * @param costeCombustible inicializado a true: mostrar o no el coste del combustible de una ruta
 * @param costeCalorias inicializado a true: mostrar o no el coste de calorías de una ruta
 * @param tipoTransporte Opcional: tipo de transporte predeterminado para las rutas
 * @param tipoRuta Opcional: tipo de ruta predeterminado para las rutas
 * @param matricula Opcional: solo debe estar si tipoTransporte es vehículo
 * */
export class PreferenceModel {
    // HU504: Modificar transporte por defecto
    tipoTransporte?: TIPO_TRANSPORTE;
    matricula?: string;

    // HU505: Modificar preferencia de ruta por defecto
    tipoRuta?: PREFERENCIA;

    // HU506: Elegir información mostrada
    costeCombustible: boolean;
    costeCalorias: boolean;

    /** Si se usa el constructor por defecto (vacío) solo aparecen los costes inicializados a true.
     * */
    constructor(costeCombustible?: boolean, costeCalorias?: boolean, tipoTransporte?: TIPO_TRANSPORTE,
                tipoRuta?: PREFERENCIA, matricula?: string) {
        this.costeCombustible = costeCombustible ?? true;
        this.costeCalorias = costeCalorias ?? true;
        if (tipoTransporte !== undefined) {this.tipoTransporte = tipoTransporte;}
        if (tipoRuta !== undefined) {this.tipoRuta = tipoRuta;}
        if (matricula !== undefined) {this.matricula = matricula;}
    }

    toJSON(): any {
        return {
            costeCombustible: this.costeCombustible,
            costeCalorias: this.costeCalorias,
            tipoTransporte: this.tipoTransporte,
            tipoRuta: this.tipoRuta,
            ...(this.matricula !== undefined ? {matricula: this.matricula} : {})
        }
    }

    static fromJSON(json: any) {
        return new PreferenceModel(json.costeCombustible, json.costeCalorias,
            json.tipoTransporte, json.tipoRuta, json.matricula);
    }
}
