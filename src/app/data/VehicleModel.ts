export class VehicleModel {
    alias: string
    matricula: string
    marca: string
    modelo: string
    anyo: number
    tipoCombustible: string
    consumoMedio: number

    constructor(alias: string, matricula: string, marca: string, modelo: string, anyo: number, tipoCombustible: string, consumoMedio: number) {
        this.alias = alias;
        this.matricula = matricula;
        this.marca = marca;
        this.modelo = modelo;
        this.anyo = anyo;
        this.tipoCombustible = tipoCombustible;
        this.consumoMedio = consumoMedio;
    }

    toJSON() {
        return {
            alias: this.alias,
            matricula: this.matricula,
            marca: this.marca,
            modelo: this.modelo,
            anyo: this.anyo,
            tipoCombustible: this.tipoCombustible,
            consumoMedio: this.consumoMedio,
        }
    }

    static fromJSON(json: any): VehicleModel {
        return new VehicleModel(json.alias, json.matricula, json.marca, json.modelo, json.anyo, json.tipoCombustible, json.consumoMedio);
    }
}
