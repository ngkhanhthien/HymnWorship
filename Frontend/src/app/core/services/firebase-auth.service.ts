import { Injectable, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';

/**
 * Firebase Project qthymns1 Web Configuration.
 * Replace apiKey below with your Firebase Web API Key from
 * Firebase Console -> Project Settings -> General -> Web API Key.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyDkENfMEb1ipgnZ6yFGaHEbesU7MrwEKe8',
  authDomain: 'qthymns1.firebaseapp.com',
  projectId: 'qthymns1',
  storageBucket: 'qthymns1.firebasestorage.app',
  messagingSenderId: '153253515262',
  appId: '1:153253515262:web:6954edcec0743288a0baaf',
  measurementId: 'G-1FSBHPHD2B',
};

export interface ActiveUser {
  displayName: string;
  email: string;
  photoURL?: string;
}

/** Maps any account string (e.g., 'abc') to a valid Firebase email syntax */
function toFirebaseEmail(account: string): string {
  const sanitized = account.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return `${sanitized || 'user'}@hymnworship.local`;
}

/** Pads short passwords (e.g., '1') to satisfy Firebase Auth >= 6 char requirement */
function toFirebasePassword(password: string): string {
  if (password.length >= 6) return password;
  return `${password}_secure_padding`;
}

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private app: any = null;
  private auth: any = null;
  private googleProvider: any = null;
  private facebookProvider: any = null;

  /** Real-time Firebase active user state */
  readonly currentUser = signal<ActiveUser | null>(null);

  /** Toast notification signal for English alerts */
  readonly toastNotification = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  /** Auth loading state */
  readonly isLoading = signal<boolean>(false);

  /** Error message signal */
  readonly authError = signal<string | null>(null);

  private toastTimer: any = null;

  constructor() {
    try {
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.googleProvider = new GoogleAuthProvider();
      this.facebookProvider = new FacebookAuthProvider();

      onAuthStateChanged(this.auth, (user: User | null) => {
        if (user) {
          const name = user.displayName || user.email?.split('@')[0] || 'User';
          this.currentUser.set({
            displayName: name,
            email: name,
            photoURL: user.photoURL || undefined,
          });
        } else {
          this.currentUser.set(null);
        }
      });
    } catch (e) {
      console.warn('Firebase Auth SDK initialization error:', e);
    }
  }

  async signInWithEmail(account: string, pass: string): Promise<boolean> {
    this.isLoading.set(true);
    this.authError.set(null);

    if (!this.auth) {
      const msg = 'Firebase Auth is not initialized properly.';
      this.authError.set(msg);
      this.showToast(msg, 'error');
      this.isLoading.set(false);
      return false;
    }

    try {
      const fbEmail = toFirebaseEmail(account);
      const fbPass = toFirebasePassword(pass);
      const res = await signInWithEmailAndPassword(this.auth, fbEmail, fbPass);
      const name = res.user.displayName || account;
      this.currentUser.set({ displayName: name, email: name });
      this.showToast(`Successfully signed in as ${name}!`, 'success');
      this.isLoading.set(false);
      return true;
    } catch (err: any) {
      const msg = this.mapFirebaseError(err);
      this.authError.set(msg);
      this.showToast(msg, 'error');
      this.isLoading.set(false);
      return false;
    }
  }

  async signUpWithEmail(account: string, pass: string): Promise<boolean> {
    this.isLoading.set(true);
    this.authError.set(null);

    if (!this.auth) {
      const msg = 'Firebase Auth is not initialized properly.';
      this.authError.set(msg);
      this.showToast(msg, 'error');
      this.isLoading.set(false);
      return false;
    }

    try {
      const fbEmail = toFirebaseEmail(account);
      const fbPass = toFirebasePassword(pass);
      const res = await createUserWithEmailAndPassword(this.auth, fbEmail, fbPass);
      try {
        await updateProfile(res.user, { displayName: account });
      } catch (e) {
        // profile update optional fallback
      }
      const name = account;
      this.currentUser.set({ displayName: name, email: name });
      this.showToast(`Account created successfully! Welcome ${name}.`, 'success');
      this.isLoading.set(false);
      return true;
    } catch (err: any) {
      const msg = this.mapFirebaseError(err);
      this.authError.set(msg);
      this.showToast(msg, 'error');
      this.isLoading.set(false);
      return false;
    }
  }

  async signInWithGoogle(): Promise<boolean> {
    this.isLoading.set(true);
    this.authError.set(null);

    if (!this.auth || !this.googleProvider) {
      const msg = 'Google Auth Provider is not available.';
      this.authError.set(msg);
      this.showToast(msg, 'error');
      this.isLoading.set(false);
      return false;
    }

    try {
      const res = await signInWithPopup(this.auth, this.googleProvider);
      const name = res.user.displayName || res.user.email || 'Google User';
      this.currentUser.set({ displayName: name, email: res.user.email || 'user@google.com' });
      this.showToast(`Successfully signed in with Google as ${name}!`, 'success');
      this.isLoading.set(false);
      return true;
    } catch (err: any) {
      const msg = this.mapFirebaseError(err);
      this.authError.set(msg);
      this.showToast(msg, 'error');
      this.isLoading.set(false);
      return false;
    }
  }

  async signInWithFacebook(): Promise<boolean> {
    this.isLoading.set(true);
    this.authError.set(null);

    if (!this.auth || !this.facebookProvider) {
      const msg = 'Facebook Auth Provider is not available.';
      this.authError.set(msg);
      this.showToast(msg, 'error');
      this.isLoading.set(false);
      return false;
    }

    try {
      const res = await signInWithPopup(this.auth, this.facebookProvider);
      const name = res.user.displayName || res.user.email || 'Facebook User';
      this.currentUser.set({ displayName: name, email: res.user.email || 'user@facebook.com' });
      this.showToast(`Successfully signed in with Facebook as ${name}!`, 'success');
      this.isLoading.set(false);
      return true;
    } catch (err: any) {
      const msg = this.mapFirebaseError(err);
      this.authError.set(msg);
      this.showToast(msg, 'error');
      this.isLoading.set(false);
      return false;
    }
  }

  async signOutUser(): Promise<void> {
    try {
      if (this.auth) {
        await firebaseSignOut(this.auth);
      }
    } catch (err) {
      // Ignore
    }
    this.currentUser.set(null);
    this.showToast('Successfully signed out!', 'success');
  }

  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastNotification.set({ message, type });
    this.toastTimer = setTimeout(() => {
      this.toastNotification.set(null);
    }, 4000);
  }

  private mapFirebaseError(err: any): string {
    const code = err?.code || '';
    const msg = err?.message || '';

    if (code === 'auth/invalid-api-key' || code === 'auth/api-key-not-valid' || msg.includes('api-key-not-valid')) {
      return 'Firebase Web API Key is invalid or missing. Please add your Web API Key from Firebase Console (Project Settings) to firebase-auth.service.ts.';
    }
    if (code === 'auth/invalid-email') return 'Invalid account format.';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return 'Incorrect account name or password.';
    }
    if (code === 'auth/email-already-in-use') return 'This account name is already registered. Please sign in instead.';
    if (code === 'auth/weak-password') return 'Password is too weak.';
    if (code === 'auth/popup-closed-by-user') return 'Sign-in popup was closed before completion.';
    if (code === 'auth/operation-not-allowed') return 'This auth provider is not enabled in Firebase Console.';
    return err?.message || 'Authentication failed. Please try again.';
  }
}
