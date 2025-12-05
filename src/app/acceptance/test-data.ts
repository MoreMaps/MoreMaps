// Datos de prueba para los tests
import {POIModel} from '../data/POIModel';
import {geohashForLocation} from 'geofire-common';
import {VehicleModel} from '../data/VehicleModel';

export const USER_TEST_DATA = [
    {email: "ramonejemplo@gmail.com", pwd: "Passw0rd!", nombre: "Ramón", apellidos: "García García"},
    {email: "mariaejemplo@gmail.com", pwd: "P4ssword!", nombre: "María", apellidos: "De Los Campos"},
]

export const POI_TEST_DATA: POIModel[] = [
    // POI A: Alicante
    new POIModel(
        38.345170,
        -0.481490,
        "Alicante",
        geohashForLocation([38.345170, -0.481490], 7),
        false,
        "",
        "Ciudad que no frecuento",
    ),
    // POI B: Valencia
    new POIModel(
        39.473910,
        -0.376388,
        "Valencia",
        geohashForLocation([39.473910, -0.376388], 7),
        false,
        "València",
        "Ciudad que frecuento",
    ),
]

export const VEHICLE_TEST_DATA: VehicleModel[] = [
    new VehicleModel(
        "Ford Fiesta",
        "1234XYZ",
        "Ford",
        "Fiesta",
        2022,
        "Gasolina sin plomo",
        13.0,
        false),
    new VehicleModel(
        "Audi A6",
        "4321XYZ",
        "Audi",
        "A6",
        2019,
        "Diesel",
        6.0,
        false),
]
