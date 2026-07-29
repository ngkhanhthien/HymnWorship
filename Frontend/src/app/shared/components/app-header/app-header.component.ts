import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TuiDialogService, TuiButton } from '@taiga-ui/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TuiButton],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css',
})
export class AppHeaderComponent {
  private readonly dialogs = inject(TuiDialogService);

  openSettings(): void {
    this.dialogs.open('Setting is coming soon', { label: 'Settings' }).subscribe();
  }
}
