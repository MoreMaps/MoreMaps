import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';

// ---- DEFINICIONES DE TIPOS ---

export interface FlowPoint {
    hash?: string;
    name: string;
    lat: number;
    lon: number;
}

// Datos acumulados del flujo
export interface RouteFlowData {
    origin?: FlowPoint;
    destination?: FlowPoint;
    transport?: TIPO_TRANSPORTE;
    preference?: PREFERENCIA;
    matricula?: string;
}

// Configuración inicial (para saber qué saltar)
export interface RouteFlowConfig {
    fixedOrigin?: FlowPoint;
    fixedDest?: FlowPoint;
    fixedVehicle?: { matricula: string, alias?: string };
}

// Interfaz del Estado
export interface FlowState {
    /**
     * Ejecuta la lógica del paso (mostrar diálogo, etc.).
     * Retorna el SIGUIENTE estado, o NULL si el flujo termina/cancela.
     */
    execute(context: RouteFlowContext): Promise<FlowState | null>;
}

export class RouteFlowContext {
    data: RouteFlowData = {};

    constructor(
        public config: RouteFlowConfig,
        public service: any // Inyectaremos RouteFlowService aquí para usar sus métodos
    ) {
        // Pre-rellenar datos si vienen fijos
        if (config.fixedOrigin) this.data.origin = config.fixedOrigin;
        if (config.fixedDest) this.data.destination = config.fixedDest;
        if (config.fixedVehicle) this.data.matricula = config.fixedVehicle.matricula;
    }
}
