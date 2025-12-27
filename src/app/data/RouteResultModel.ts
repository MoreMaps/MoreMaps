import {Geometry} from 'geojson'

export class RouteResultModel {
    tiempo: number;             // Duración de la ruta
    distancia: number;          // Distancia que cubre la ruta
    geometry: Geometry;           // Cadena para representar la ruta

    constructor(tiempo: number, distancia: number, geometry: Geometry) {
        this.tiempo = tiempo;
        this.distancia = distancia;
        this.geometry = geometry;
    }
}
