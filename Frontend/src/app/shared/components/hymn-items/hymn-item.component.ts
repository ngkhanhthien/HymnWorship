import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-hymn-item',
  standalone: true,
  imports: [],
  templateUrl: './hymn-item.component.html',
  styleUrl: './hymn-item.component.css',
})
export class HymnItemComponent {
  @Input() number = '';
  @Input() title = '';
}
