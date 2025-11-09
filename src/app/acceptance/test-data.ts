// Revisar estos datos conforme avance el proyecto para que reflejen un objeto real
import {gender, UserModel} from '../data/UserModel'

export const MOCK_USERS: UserModel[] = [
    {email: "ramonejemplo@gmail.com", password: "Passw0rd!", nombre: "Ramón", apellidos: "García García", genero: gender.MALE},
    {email: "mariaejemplo@gmail.com", password: "P4ssword!", nombre: "María", apellidos: "De Los Campos", genero: gender.FEMALE},
]

// En historias posteriores habrá que poner el nombre de las interfaces que modelan estos requisitos de datos

export const MOCK_POI = [
    {latitud: 38.345170, longitud: -0.481490, toponimo: "Alicante", alias: "", descripcion: "Ciudad que no frecuento"},
    {latitud: 39.473910, longitud: -0.376388, toponimo: "Valencia", alias: "València", descripcion: "Ciudad que frecuento"},
    {latitud: 39.985980, longitud: -0.037438, toponimo: "Castellón de la Plana", alias: "Castellón", descripcion: "Mi ciudad que no frecuento"},
]

export const MOCK_VEHICLE = [
    {alias: "Ford Fiesta", matricula: "1234XYZ", anyo: 2022, marca: "Ford", modelo: "Fiesta", tipo_combustible: "Gasolina sin plomo", consumo_medio: 13.0},
]
