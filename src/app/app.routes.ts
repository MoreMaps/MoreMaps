import { Routes } from '@angular/router';
import {MainPageComponent} from './view/mainPage/mainPage';
import {LeafletMapComponent} from './view/map/map';

export const routes: Routes = [
    {
        path: '',
        component: MainPageComponent
    },
    {
        path: 'map',
        component: LeafletMapComponent
    }
];
