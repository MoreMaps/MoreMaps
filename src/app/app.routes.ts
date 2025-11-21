import { Routes } from '@angular/router';
import {MainPageComponent} from './view/mainPage/mainPage';
import {LeafletMapComponent} from './view/map/map';
import {AccountSettingsComponent} from './view/deleteUser/deleteUser';

export const routes: Routes = [
    {
        path: '',
        component: MainPageComponent
    },
    {
        path: 'map',
        component: LeafletMapComponent
    },
    {
        path: 'deleteUser',
        component: AccountSettingsComponent
    }
];
