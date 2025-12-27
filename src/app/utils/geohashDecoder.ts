export class GeohashDecoder {
    /**
     * Decodifica un Geohash directamente a [Lon., Lat.]
     * Formato compatible con OpenRouteService
     */
    static decodeGeohash(geohash: string): [number, number] {
        const BITS = [16, 8, 4, 2, 1];
        const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
        let is_even = true;
        let lat = [-90.0, 90.0];
        let lon = [-180.0, 180.0];
        let lat_err = 90.0;
        let lon_err = 180.0;

        for (let i = 0; i < geohash.length; i++) {
            const c = geohash[i];
            const cd = BASE32.indexOf(c);
            for (let j = 0; j < 5; j++) {
                const mask = BITS[j];
                if (is_even) {
                    lon_err /= 2;
                    if (cd & mask) {
                        lon[0] = (lon[0] + lon[1]) / 2;
                    } else {
                        lon[1] = (lon[0] + lon[1]) / 2;
                    }
                } else {
                    lat_err /= 2;
                    if (cd & mask) {
                        lat[0] = (lat[0] + lat[1]) / 2;
                    } else {
                        lat[1] = (lat[0] + lat[1]) / 2;
                    }
                }
                is_even = !is_even;
            }
        }
        // Devolvemos [Longitud, Latitud]
        return [(lon[0] + lon[1]) / 2, (lat[0] + lat[1]) / 2];
    }
}
