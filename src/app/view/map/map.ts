import {Component, OnInit, AfterViewInit, inject} from '@angular/core';
import * as L from 'leaflet';
import {MapMarker, MapUpdateService} from '../../../../../MoreSpikes/src/app/components/map-update-service/map-updater';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';

const customIcon = L.icon({
    iconUrl: 'resources/customMarker.png',
    iconSize: [27, 35],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

@Component({
    selector: 'app-map',
    templateUrl: './map.html',
    styleUrl: './map.scss',
    imports: [MatSnackBarModule]
})

export class LeafletMapComponent implements OnInit, AfterViewInit {
    private map!: L.Map
    protected currentMarker: L.Marker | null = null
    private snackBar = inject(MatSnackBar);

    constructor(private mapUpdateService: MapUpdateService) {}

    ngOnInit() {
        this.initMap();
        this.mapUpdateService.marker$.subscribe((marker: MapMarker) => {
            this.addMarker(marker.lat, marker.lon, marker.name);
            this.map.setView([marker.lat, marker.lon], 14);
        });
        this.mapUpdateService.snackbar$.subscribe((message: string) => {
            this.showSnackbar(message);
        })
    }

    ngAfterViewInit() {
        // Center map based on user location
        this.map.locate({setView: true})
    }

    private initMap() {
        const baseMapURl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        this.map = L.map('map');
        L.tileLayer(baseMapURl).addTo(this.map);
    }

    // Intended to have a dialog here as well for the project
    private addMarker(lat: number, lng: number, name: string): void {
        // Remove previous marker if it exists
        if (this.currentMarker) {
            this.map.removeLayer(this.currentMarker);
        }

        this.currentMarker = L.marker([lat, lng], { icon: customIcon })
            .addTo(this.map)
            .bindPopup("Encontrado: " + name)
            .openPopup();
    }

    private showSnackbar(msg: string): void {
        this.snackBar.open(msg, 'Ok', {
            duration: 5000,
            horizontalPosition: 'left',
            verticalPosition: 'bottom',
        });
    }
}
