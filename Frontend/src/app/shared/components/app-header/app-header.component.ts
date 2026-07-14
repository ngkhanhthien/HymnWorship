import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
  <header class="bg-blue-800 text-white shadow-md z-10 w-full shrink-0">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="font-bold text-xl uppercase tracking-wider">HymnWorship</div>
      <nav class="flex space-x-6 font-medium">
        <a routerLink="/home" routerLinkActive="text-yellow-300" class="hover:text-yellow-200 transition">Home</a>
        <a routerLink="/hymn" routerLinkActive="text-yellow-300" class="hover:text-yellow-200 transition">Music</a>
        <a routerLink="/notes" routerLinkActive="text-yellow-300" class="hover:text-yellow-200 transition">Notes</a>
      </nav>
    </div>
  </header>
  `
})
export class AppHeaderComponent {}
