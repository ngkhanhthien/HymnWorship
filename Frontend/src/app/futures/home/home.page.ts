import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HymnItemComponent } from '../../shared/components/hymn-items/hymn-item.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, HymnItemComponent],
  templateUrl: './home.page.html',
})
export class HomePageComponent {}
