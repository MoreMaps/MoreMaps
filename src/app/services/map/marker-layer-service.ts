import {Injectable} from '@angular/core';
import * as L from 'leaflet';
import {MapCoreService} from './map-core-service';
import {POISearchModel} from '../../data/POISearchModel';

const CUSTOM_ICON = L.icon({
    iconUrl: 'assets/images/poi/customMarker.png',
    iconSize: [27, 35],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const SELECTED_ICON = L.icon({
    iconUrl: 'assets/images/poi_active.png',
    iconSize: [27, 35],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

/** Se encarga de la gestión visual de los POIs (o Puntos de Interés).
 *  Gestiona los iconos y L.Markers, y su selección.
 * */
@Injectable( {
    providedIn: 'root'
})
export class MarkerLayerService {

    private markers: L.Marker[] = [];

    constructor(private mapCore: MapCoreService) {}

    /**
     * Recibe una lista de POIs, limpia los anteriores y pinta los nuevos.
     */
    renderMarkers(pois: POISearchModel[]): void {
        this.clearMarkers();

        const map = this.mapCore.getMapInstance();
        if (!map) return;

        pois.forEach(poi => {
            const marker = L.marker([poi.lat, poi.lon], { icon: CUSTOM_ICON })
                .addTo(map)
                .bindPopup(`Encontrado: ${poi.placeName}`);

            this.markers.push(marker);
        });

        // Ajustamos la vista automáticamente a los nuevos puntos
        this.fitBounds();
    }

    /**
     * Resalta visualmente un marcador específico (cambio de icono y z-index).
     */
    highlightMarker(index: number): void {
        if (!this.markers.length || index < 0 || index >= this.markers.length) return;

        // Restaurar todos al estado normal
        this.markers.forEach(marker => {
            marker.setIcon(CUSTOM_ICON);
            marker.setZIndexOffset(0);
        });

        // Resaltar el seleccionado
        const activeMarker = this.markers[index];
        if (activeMarker) {
            activeMarker.setIcon(SELECTED_ICON);
            activeMarker.setZIndexOffset(700);
            activeMarker.openPopup();
        }
    }

    /**
     * Elimina todos los marcadores de búsqueda del mapa y vacía la lista.
     */
    clearMarkers(): void {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];
    }

    /**
     * Ajusta el zoom del mapa para que quepan todos los marcadores.
     */
    private fitBounds(): void {
        if (this.markers.length === 0) return;

        // Caso 1 marcador: Vuelo directo y apertura de popup
        if (this.markers.length === 1) {
            const marker = this.markers[0];
            this.mapCore.flyTo(marker.getLatLng().lat, marker.getLatLng().lng, 16);
            marker.openPopup();
            return;
        }

        // Caso N marcadores: Ajustar límites
        const group = L.featureGroup(this.markers);
        this.mapCore.fitBounds(group.getBounds(), [50, 50]);
    }
}
