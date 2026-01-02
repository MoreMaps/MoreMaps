import { Routes } from '@angular/router';
import {MainPageComponent} from './view/mainPage/mainPage';
import {MapPageComponent} from './view/map/map-page.component';
import {AccountSettingsComponent} from './view/deleteUser/deleteUser';
import {SavedItemsComponent} from './view/saved/saved';
import {AuthGuard} from '@angular/fire/auth-guard';
import {VehicleForm} from './view/vehicleForm/vehicleForm';

export const routes: Routes = [
    {
        path: '',
        component: MainPageComponent
    },
    {
        path: 'map',
        component: MapPageComponent,
        canActivate: [AuthGuard],
    },
    {
        path: 'deleteUser',
        component: AccountSettingsComponent,
        canActivate: [AuthGuard],
    },
    {
        path: 'saved',
        component: SavedItemsComponent,
        canActivate: [AuthGuard],
    },
    {
        path: 'vehicle',
        component: VehicleForm,
        canActivate: [AuthGuard],
    }
];
