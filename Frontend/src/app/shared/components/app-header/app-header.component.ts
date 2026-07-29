import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TuiDialogService, TuiButton } from '@taiga-ui/core';
import { SETTINGS_TITLE, SETTINGS_CONTENT } from '../settings/settings.component';

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
    this.dialogs.open(SETTINGS_CONTENT, { label: SETTINGS_TITLE }).subscribe();
  }
}
