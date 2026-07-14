import { Routes } from '@angular/router';
import { HomePageComponent } from './futures/home/home.page';
import { HymnPageComponent } from './futures/hymn/hymn.page';
import { NotesPageComponent } from './futures/notes/notes.page';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomePageComponent },
  { path: 'hymn', component: HymnPageComponent },
  { path: 'notes', component: NotesPageComponent }
];
