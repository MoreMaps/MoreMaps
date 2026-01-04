import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {PreferenceModel} from '../../data/PreferenceModel';

// ---- DEFINICIONES DE TIPOS ---

export interface FlowPoint {
    hash?: string;
    name: string;
    lat: number;
    lon: number;
}

export interface FlowVehicle {
    matricula: string,
    alias?: string
}

export interface RouteFlowData {
    origin?: FlowPoint;
    destination?: FlowPoint;
    transport?: TIPO_TRANSPORTE;
    preference?: PREFERENCIA;
    matricula?: string;

    // BANDERA CLAVE: Para saber si el usuario rechazó explícitamente la preferencia automática
    ignorePreferences?: boolean;
}

export interface RouteFlowConfig {
    fixedOrigin?: FlowPoint;
    fixedDest?: FlowPoint;
    fixedVehicle?: FlowVehicle;
}

export interface FlowState {
    execute(context: RouteFlowContext): Promise<FlowState | null>;
}

export interface IRouteFlowService {
    getPointFromUser(title: string, subtitle: string, currentStep: number, totalSteps: number, showBack: boolean): Promise<any>;

    getRouteOption(type: string, currentStep: number, totalSteps: number): Promise<any>;

    selectSavedItem(type: string, title: string, showBack: boolean): Promise<any>;

    showFeedback(message: string): void;
}

export class RouteFlowContext {
    data: RouteFlowData = {};
    preferences?: PreferenceModel;

    constructor(
        public config: RouteFlowConfig,
        public service: IRouteFlowService,
        preferences?: PreferenceModel // Recibimos las preferencias
    ) {
        this.preferences = preferences; // Las guardamos

        if (config.fixedOrigin) this.data.origin = config.fixedOrigin;
        if (config.fixedDest) this.data.destination = config.fixedDest;
        if (config.fixedVehicle) {
            this.data.matricula = config.fixedVehicle.matricula;
            this.data.transport = TIPO_TRANSPORTE.VEHICULO;
        }
    }
}
