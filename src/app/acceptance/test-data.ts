/**
 * Datos de prueba para los tests
 */
import {POIModel} from '../data/POIModel';
import {geohashForLocation} from 'geofire-common';
import {VehicleModel} from '../data/VehicleModel';
import {PREFERENCIA, RouteModel, TIPO_TRANSPORTE} from '../data/RouteModel';

/**
 * Datos de prueba sobre usuarios
 */
export const USER_TEST_DATA = [
    // Usuario "ramon"
    {email: "ramonejemplo@gmail.com", pwd: "Passw0rd!", nombre: "Ramón", apellidos: "García García"},
    // Usuario "maria"
    {email: "mariaejemplo@gmail.com", pwd: "P4ssword!", nombre: "María", apellidos: "De Los Campos"},
]

/**
 * Datos de prueba sobre puntos de interés (POI)
 */
export const POI_TEST_DATA: POIModel[] = [
    // POI A: Alicante
    new POIModel(
        38.345143,
        -0.481508,
        "Alicante",
        geohashForLocation([38.345143, -0.481508], 7),
        false,
        "",
        "Ciudad que no frecuento",
    ),
    // POI B: Valencia
    new POIModel(
        39.473910,
        -0.376380,
        "Valencia",
        geohashForLocation([39.473910, -0.376380], 7),
        false,
        "València",
        "Ciudad que frecuento",
    ),
]

/**
 * Datos de prueba sobre vehículos
 */
export const VEHICLE_TEST_DATA: VehicleModel[] = [
    // Vehículo "Ford Fiesta"
    new VehicleModel(
        "Ford Fiesta",
        "1234XYZ",
        "Ford",
        "Fiesta",
        2022,
        "Gasolina",
        13.0,
        false),
    // Vehículo "Audi A6"
    new VehicleModel(
        "Audi A6",
        "4321XYZ",
        "Audi",
        "A6",
        2019,
        "Diésel",
        6.0,
        false),
]

/**
 * Datos de prueba sobre rutas
 */
export const ROUTE_TEST_DATA: RouteModel[] = [

    // Ruta de Alicante a Valencia
    new RouteModel(
        POI_TEST_DATA[0].geohash,
        POI_TEST_DATA[1].geohash,
        TIPO_TRANSPORTE.COCHE,
        PREFERENCIA.RECOMENDADA,
        177628.3,
        7064.3,
        'De Alicante a Valencia en coche',
        false,
        VEHICLE_TEST_DATA[0].matricula,
    ),
    new RouteModel(
        POI_TEST_DATA[0].geohash,
        POI_TEST_DATA[1].geohash,
        TIPO_TRANSPORTE.A_PIE,
        PREFERENCIA.RECOMENDADA,
        161481.6,
        116265.8,
        'De Alicante a Valencia a pie',
        false,
    ),
]
