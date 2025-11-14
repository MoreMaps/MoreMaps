// Revisar estos datos conforme avance el proyecto para que reflejen un objeto real
import {UserModel} from '../data/UserModel'

export const USER_TEST_DATA = [
    {email: "ramonejemplo@gmail.com", pwd: "Passw0rd!", nombre: "Ramón", apellidos: "García García"},
    {email: "mariaejemplo@gmail.com", pwd: "P4ssword!", nombre: "María", apellidos: "De Los Campos"},
]

export const POI_TEST_DATA = [
    {latitud: 38.345170, longitud: -0.481490, toponimo: "Alicante", alias: "", descripcion: "Ciudad que no frecuento"},
    {latitud: 39.473910, longitud: -0.376388, toponimo: "Valencia", alias: "València", descripcion: "Ciudad que frecuento"},
    {latitud: 39.985980, longitud: -0.037438, toponimo: "Castellón de la Plana", alias: "Castellón", descripcion: "Mi ciudad que no frecuento"},
]

export const VEHICLE_TEST_DATA = [
    {alias: "Ford Fiesta", matricula: "1234XYZ", anyo: 2022, marca: "Ford", modelo: "Fiesta", tipo_combustible: "Gasolina sin plomo", consumo_medio: 13.0},
]
