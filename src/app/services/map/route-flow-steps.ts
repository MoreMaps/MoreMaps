// --- ESTADO 1: ORIGEN ---
import {FlowState, RouteFlowContext} from './route-flow-state';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';

export class OriginState implements FlowState {
    async execute(ctx: RouteFlowContext): Promise<FlowState | null> {
        // 1. Si ya está fijo, pasamos al siguiente automáticamente
        if (ctx.config.fixedOrigin) {
            return new DestinationState();
        }

        // 2. Pedir dato al usuario usando el servicio existente
        const res = await ctx.service.getPointFromUser(
            'Punto de Origen',
            '¿Desde dónde quieres salir?',
            1, 4, true // showBack
        );

        if (!res || res === 'BACK') return null; // Cancelar flujo

        ctx.data.origin = res;

        // Validación cruzada (Origen != Destino)
        if (ctx.data.destination && ctx.data.destination.hash === ctx.data.origin!.hash) {
            return this;
        }

        return new DestinationState();
    }
}

// --- ESTADO 2: DESTINO ---
export class DestinationState implements FlowState {
    async execute(ctx: RouteFlowContext): Promise<FlowState | null> {
        if (ctx.config.fixedDest) {
            return new TransportState();
        }

        const res = await ctx.service.getPointFromUser(
            'Punto de Destino',
            '¿A dónde quieres ir?',
            2, 4, true
        );

        // MANEJO DEL "BACK":
        if (res === 'BACK') {
            // Si el origen era fijo, no podemos volver atrás -> cancelamos
            if (ctx.config.fixedOrigin) return null;
            // Si no, volvemos a Origen
            return new OriginState();
        }
        if (!res) return null;

        ctx.data.destination = res;
        return new TransportState();
    }
}

// --- ESTADO 3: TRANSPORTE ---
export class TransportState implements FlowState {
    async execute(ctx: RouteFlowContext): Promise<FlowState | null> {
        // Si hay vehículo fijo, asumimos transporte VEHICULO y saltamos
        if (ctx.config.fixedVehicle) {
            ctx.data.transport = TIPO_TRANSPORTE.VEHICULO;
            return new PreferenceState();
        }

        const res = await ctx.service.getRouteOption('transport', 3, 4);

        if (res === 'BACK') {
            // Si destino fijo -> Ir a Origen (o cancelar si origen tb fijo)
            if (ctx.config.fixedDest) {
                return ctx.config.fixedOrigin ? null : new OriginState();
            }
            return new DestinationState();
        }
        if (!res) return null;

        ctx.data.transport = res as TIPO_TRANSPORTE;

        // Sub-lógica de Vehículo (antes paso 3.5)
        if (ctx.data.transport === TIPO_TRANSPORTE.VEHICULO) {
            const savedVehicle = await ctx.service.selectSavedItem('vehiculos', 'Selecciona tu vehículo', true);

            if (savedVehicle === 'BACK') return this; // Reintentar transporte
            if (!savedVehicle) return null;

            ctx.data.matricula = savedVehicle.matricula;
        } else {
            ctx.data.matricula = undefined;
        }

        return new PreferenceState();
    }
}

// --- ESTADO 4: PREFERENCIA ---
export class PreferenceState implements FlowState {
    async execute(ctx: RouteFlowContext): Promise<FlowState | null> {
        const res = await ctx.service.getRouteOption('preference', 4, 4);

        if (res === 'BACK') {
            // Lógica compleja de retroceso que tenías en saved.ts
            if (ctx.config.fixedVehicle) {
                // Si vehículo es fijo, saltamos transporte hacia atrás
                if (ctx.config.fixedDest) return ctx.config.fixedOrigin ? null : new OriginState();
                return new DestinationState();
            }
            return new TransportState();
        }
        if (!res) return null;

        ctx.data.preference = res as PREFERENCIA;

        // ¡FIN DEL FLUJO! Retornamos null, pero los datos están completos en ctx.data
        return null;
    }
}
