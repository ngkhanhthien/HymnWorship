import { Component, inject, ViewChild, TemplateRef, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TuiDialogService, TuiButton } from '@taiga-ui/core';
import { SettingsComponent, SETTINGS_TITLE } from '../settings/settings.component';
import { FirebaseAuthService } from '../../../core/services/firebase-auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule, TuiButton, SettingsComponent],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css',
})
export class AppHeaderComponent {
  private readonly dialogs = inject(TuiDialogService);
  protected readonly authService = inject(FirebaseAuthService);

  @ViewChild('settingsDialog')
  private readonly settingsDialogTemplate!: TemplateRef<any>;

  /** Gear dropdown menu open state */
  readonly isMenuOpen = signal<boolean>(false);

  /** Auth modal state: 'login', 'register', or null */
  readonly authModalMode = signal<'login' | 'register' | null>(null);

  /** Form input signals */
  readonly emailInput = signal<string>('');
  readonly passwordInput = signal<string>('');
  readonly confirmPasswordInput = signal<string>('');

  toggleMenu(event?: Event): void {
    event?.stopPropagation();
    this.isMenuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  openAuthModal(mode: 'login' | 'register'): void {
    this.closeMenu();
    this.emailInput.set('');
    this.passwordInput.set('');
    this.confirmPasswordInput.set('');
    this.authService.authError.set(null);
    this.authModalMode.set(mode);
  }

  closeAuthModal(): void {
    this.authModalMode.set(null);
  }

  switchAuthMode(mode: 'login' | 'register'): void {
    this.authService.authError.set(null);
    this.authModalMode.set(mode);
  }

  onSelectSettings(): void {
    this.closeMenu();
    this.openSettings();
  }

  async onSubmitAuth(): Promise<void> {
    const email = this.emailInput().trim();
    const pass = this.passwordInput();
    const mode = this.authModalMode();

    if (!email || !pass) {
      this.authService.authError.set('Please enter both account name and password.');
      return;
    }

    let success = false;
    if (mode === 'login') {
      success = await this.authService.signInWithEmail(email, pass);
    } else {
      success = await this.authService.signUpWithEmail(email, pass);
    }

    if (success) {
      this.closeAuthModal();
    }
  }

  async handleSocialLogin(provider: 'google' | 'facebook'): Promise<void> {
    let success = false;
    if (provider === 'google') {
      success = await this.authService.signInWithGoogle();
    } else {
      success = await this.authService.signInWithFacebook();
    }

    if (success) {
      this.closeAuthModal();
    }
  }

  async onSignOut(): Promise<void> {
    this.closeMenu();
    await this.authService.signOutUser();
  }

  openSettings(): void {
    if (this.settingsDialogTemplate) {
      this.dialogs.open(this.settingsDialogTemplate, { label: SETTINGS_TITLE }).subscribe();
    }
  }
}
