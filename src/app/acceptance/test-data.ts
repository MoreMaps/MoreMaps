// Revisar estos datos conforme avance el proyecto para que reflejen un objeto real

export const MOCK_USERS = [
    {user: "ramon", password: "Passw0rd!", nombre: "Ramón", apellidos: "García García", email: "ramonejemplo@gmail.com", genero: "Masculino"},
    {user: "maria", password: "P4ssword!", nombre: "María", apellidos: "De Los Campos", email: "mariaejemplo@gmail.com", genero: "Femenino"},
]

export const MOCK_POI = [
    {latitud: 38.345170, longitud: -0.481490, topónimo: "Alicante", alias: "", descripcion: "Ciudad que no frecuento"},
    {latitud: 39.473910, longitud: -0.376388, topónimo: "Valencia", alias: "València", descripcion: "Ciudad que frecuento"},
    {latitud: 39.985980, longitud: -0.037438, topónimo: "Castellón de la Plana", alias: "Castellón", descripcion: "Mi ciudad que no frecuento"},
]

export const MOCK_VEHICLE = [
    {alias: "Ford Fiesta", matricula: "1234XYZ", año: 2022, marca: "Ford", modelo: "Fiesta", capacidad_combustible: 45, tipo_combustible: "Gasolina sin plomo", consumo_medio: 13.0},
]
