// Datos de prueba para los tests
import {POIModel} from '../data/POIModel';
import {geohashForLocation} from 'geofire-common';

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

export const VEHICLE_TEST_DATA = [
    {
        alias: "Ford Fiesta",
        matricula: "1234XYZ",
        marca: "Ford",
        modelo: "Fiesta",
        anyo: 2022,
        tipoCombustible: "Gasolina",
        consumoMedio: 13.0,
    },
    {
        alias: "Audi A6",
        matricula: "4321XYZ",
        marca: "Audi",
        modelo: "A6",
        anyo: 2019,
        tipoCombustible: "Diésel",
        consumoMedio: 6.0,
    },
]
