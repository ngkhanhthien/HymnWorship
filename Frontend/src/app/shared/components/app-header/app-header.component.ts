import { Component, inject, ViewChild, TemplateRef, signal } from '@angular/core';
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

  /** Gear dropdown menu open state */
  readonly isMenuOpen = signal<boolean>(false);

  /** Auth modal state: 'login', 'register', or null */
  readonly authModalMode = signal<'login' | 'register' | null>(null);

  toggleMenu(event?: Event): void {
    event?.stopPropagation();
    this.isMenuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  openAuthModal(mode: 'login' | 'register'): void {
    this.closeMenu();
    this.authModalMode.set(mode);
  }

  closeAuthModal(): void {
    this.authModalMode.set(null);
  }

  switchAuthMode(mode: 'login' | 'register'): void {
    this.authModalMode.set(mode);
  }

  onSelectSettings(): void {
    this.closeMenu();
    this.openSettings();
  }

  handleSocialLogin(provider: 'google' | 'facebook'): void {
    alert(`Signing in with ${provider === 'google' ? 'Google / Gmail' : 'Facebook'}...`);
    this.closeAuthModal();
  }

  openSettings(): void {
    if (this.settingsDialogTemplate) {
      this.dialogs.open(this.settingsDialogTemplate, { label: SETTINGS_TITLE }).subscribe();
    }
  }
}
