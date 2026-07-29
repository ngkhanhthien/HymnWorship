import { Component, inject, ViewChild, TemplateRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TuiDialogService, TuiButton } from '@taiga-ui/core';
import { SettingsComponent, SETTINGS_TITLE } from '../settings/settings.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TuiButton, SettingsComponent],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css',
})
export class AppHeaderComponent {
  private readonly dialogs = inject(TuiDialogService);

  @ViewChild('settingsDialog')
  private readonly settingsDialogTemplate!: TemplateRef<any>;

  openSettings(): void {
    if (this.settingsDialogTemplate) {
      this.dialogs.open(this.settingsDialogTemplate, { label: SETTINGS_TITLE }).subscribe();
    }
  }
}
