export enum FUEL_TYPE {
    GASOLINA ='Gasolina',
    DIESEL = 'Diésel',
    ELECTRICO = 'Eléctrico',
    HEV = 'Híbrido (HEV)',
    PHEV = 'Híbrido Enchufable (PHEV)',
    GLP = 'Gases licuados del petróleo (GLP)',
    GNC = 'Gas Natural Comprimido (GNC)',
    HIDROGENO = 'Hidrógeno',
}

export class VehicleModel {
    alias: string
    matricula: string
    marca: string
    modelo: string
    anyo: number
    tipoCombustible: string
    consumoMedio: number
    pinned: boolean

    constructor(alias: string, matricula: string, marca: string, modelo: string, anyo: number, tipoCombustible: string, consumoMedio: number, pinned?: boolean) {
        this.alias = alias;
        this.matricula = matricula;
        this.marca = marca;
        this.modelo = modelo;
        this.anyo = anyo;
        this.tipoCombustible = tipoCombustible;
        this.consumoMedio = consumoMedio;
        this.pinned = pinned !== undefined ? pinned : false;
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
            ...(this.pinned !== undefined ? {pinned: this.pinned} : {pinned: false}),
        }
    }

    static fromJSON(json: any): VehicleModel {
        return new VehicleModel(json.alias, json.matricula, json.marca, json.modelo,
            json.anyo, json.tipoCombustible, json.consumoMedio, json.pinned);
    }
}
