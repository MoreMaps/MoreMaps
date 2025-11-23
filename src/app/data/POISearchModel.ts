export class POISearchModel {
    lat: number;            // 6 decimales
    lon: number;            // 6 decimales
    placeName: string;      // topónimo dado por la API

    constructor(lat: number, lon: number, placeName: string) {
        this.lat = lat;
        this.lon = lon;
        this.placeName = placeName;
    }
}
