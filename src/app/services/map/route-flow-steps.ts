import {FlowPoint, FlowState, RouteFlowContext} from './route-flow-state';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';

// AUXILIAR: Comparación robusta de puntos
function arePointsEqual(p1?: FlowPoint, p2?: FlowPoint): boolean {
    if (!p1 || !p2) return false;
    // 1. Si ambos tienen hash, comparamos hash
    if (p1.hash && p2.hash) return p1.hash === p2.hash;
    // 2. Si no, comparamos coordenadas con un pequeño margen (epsilon)
    const epsilon = 0.0001;
    return Math.abs(p1.lat - p2.lat) < epsilon && Math.abs(p1.lon - p2.lon) < epsilon;
}

// --- ESTADO 1: ORIGEN ---
export class OriginState implements FlowState {
    async execute(ctx: RouteFlowContext): Promise<FlowState | null> {
        if (ctx.config.fixedOrigin) return new DestinationState();

        const res = await ctx.service.getPointFromUser(
            'Punto de Origen', '¿Desde dónde quieres salir?', 1, 4, true
        );

        if (!res || res === 'BACK') return null;

        // VALIDACIÓN: Si el nuevo origen es igual al destino actual, REPETIR
        if (arePointsEqual(res, ctx.data.destination)) {
            ctx.service.showFeedback('El origen no puede ser igual al destino.');
            return this;
        }

        ctx.data.origin = res;
        return new DestinationState();
    }
}

// --- ESTADO 2: DESTINO ---
export class DestinationState implements FlowState {
    async execute(ctx: RouteFlowContext): Promise<FlowState | null> {
        if (ctx.config.fixedDest) return new TransportState();

        const res = await ctx.service.getPointFromUser(
            'Punto de Destino', '¿A dónde quieres ir?', 2, 4, true
        );

        if (res === 'BACK') return new OriginState();
        if (!res) return null;

        // VALIDACIÓN: Si el destino es igual al origen, REPETIR
        if (arePointsEqual(res, ctx.data.origin)) {
            ctx.service.showFeedback('El destino no puede ser igual al origen.');
            return this;
        }

        ctx.data.destination = res;

        // LIMPIEZA CLAVE: Al avanzar hacia transporte, limpiamos cualquier selección previa
        // o bandera de "ignorar preferencias" para que el paso TransportState se evalúe limpio.
        ctx.data.transport = undefined;
        ctx.data.matricula = undefined;
        ctx.data.ignorePreferences = false;

        return new TransportState();
    }
}

// --- ESTADO 3: TRANSPORTE ---
export class TransportState implements FlowState {
    async execute(ctx: RouteFlowContext): Promise<FlowState | null> {
        // A. Configuración Fija (Prioridad absoluta)
        if (ctx.config.fixedVehicle) {
            ctx.data.transport = TIPO_TRANSPORTE.VEHICULO;
            return new PreferenceState();
        }

        // B. Preferencias Automáticas
        // Se ejecutan SI: no hay transporte seleccionado Y hay preferencia Y no hemos dicho explícitamente "ignóralas"
        if (!ctx.data.transport && ctx.preferences?.tipoTransporte && !ctx.data.ignorePreferences) {
            const pref = ctx.preferences.tipoTransporte;

            if (pref === TIPO_TRANSPORTE.VEHICULO) {
                ctx.data.transport = TIPO_TRANSPORTE.VEHICULO;
                // Si hay matrícula guardada, la usamos y saltamos
                if (ctx.preferences.matricula) {
                    ctx.data.matricula = ctx.preferences.matricula;
                    return new PreferenceState();
                }
                // Si no hay matrícula, caemos al selector manual de abajo
            } else {
                // Si es Pie/Bici, aplicamos y saltamos
                ctx.data.transport = pref;
                ctx.data.matricula = undefined;
                return new PreferenceState();
            }
        }

        // C. Selección Manual (Si no aplicó A ni B)
        if (!ctx.data.transport) {
            const res = await ctx.service.getRouteOption('transport', 3, 4);

            if (res === 'BACK') {
                if (ctx.config.fixedDest) {
                    return ctx.config.fixedOrigin ? null : new OriginState();
                }
                return new DestinationState();
            }
            if (!res) return null;

            ctx.data.transport = res as TIPO_TRANSPORTE;
            // Al elegir manualmente, reseteamos la bandera por si volvemos atrás en el futuro
            ctx.data.ignorePreferences = false;
        }

        // D. Selector de Vehículo (Si es coche y no tenemos matrícula)
        if (ctx.data.transport === TIPO_TRANSPORTE.VEHICULO && !ctx.data.matricula) {
            const savedVehicle = await ctx.service.selectSavedItem('vehiculos', 'Selecciona tu vehículo', true);

            if (savedVehicle === 'BACK') {
                // CLAVE: Si cancelamos selección de vehículo, volvemos a este mismo estado (this),
                // PERO activamos ignorePreferences para que no vuelva a intentar autoseleccionar "Vehículo"
                // y fuerce al usuario a ver el menú de "Pie / Bici / Coche".
                ctx.data.transport = undefined;
                ctx.data.ignorePreferences = true;
                return this;
            }
            if (!savedVehicle) return null;

            ctx.data.matricula = savedVehicle.matricula;
        } else if (ctx.data.transport !== TIPO_TRANSPORTE.VEHICULO) {
            ctx.data.matricula = undefined;
        }

        return new PreferenceState();
    }
}

// --- ESTADO 4: PREFERENCIA ---
export class PreferenceState implements FlowState {
    async execute(ctx: RouteFlowContext): Promise<FlowState | null> {
        // 1. Preferencia Automática de Ruta
        if (!ctx.data.preference && ctx.preferences?.tipoRuta) {
            ctx.data.preference = ctx.preferences.tipoRuta;
            return null; // Fin
        }

        // 2. Manual
        const res = await ctx.service.getRouteOption('preference', 4, 4);

        if (res === 'BACK') {
            ctx.data.preference = undefined;

            // Lógica de Retroceso Inteligente
            if (ctx.config.fixedVehicle) {
                if (ctx.config.fixedDest) return ctx.config.fixedOrigin ? null : new OriginState();
                return new DestinationState();
            }

            // Si el transporte fue seleccionado AUTOMÁTICAMENTE por preferencias (y no lo hemos ignorado),
            // al dar "Atrás" queremos saltarnos el paso de transporte e ir directo a Destino.
            if (ctx.preferences?.tipoTransporte && !ctx.data.ignorePreferences) {
                ctx.data.transport = undefined;
                ctx.data.matricula = undefined;
                return new DestinationState();
            }

            // Si fue manual, volvemos a TransportState (que mostrará el diálogo porque transport ya está set,
            // pero lo limpiamos aquí para forzar reevaluación o menú)
            ctx.data.transport = undefined;
            return new TransportState();
        }

        if (!res) return null;

        ctx.data.preference = res as PREFERENCIA;
        return null; // Fin
    }
}
