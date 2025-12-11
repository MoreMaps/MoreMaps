export class RouteResultModel {
    tiempo: number;             // Duración de la ruta
    distancia: number;          // Distancia que cubre la ruta
    geometry: string;           // Cadena para representar la ruta

    constructor(tiempo: number, distancia: number, geometry: string) {
        this.tiempo = tiempo;
        this.distancia = distancia;
        this.geometry = geometry;
    }
}
