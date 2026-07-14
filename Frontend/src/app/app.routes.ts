import { Routes } from '@angular/router';
import { HomePageComponent } from './futures/home/home.page';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomePageComponent }
];
