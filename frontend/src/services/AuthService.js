// AuthService.js - Simplified and Working Google Authentication
import { apiPost } from '../utils/safeUtils.js';

class AuthService {
  constructor() {
    try {
      this.token = localStorage.getItem('sparkvibe_token');
      this.user = this.token ? JSON.parse(localStorage.getItem('sparkvibe_user') || '{}') : null;
      this.googleInitialized = false;
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
      this.token = null;
      this.user = null;
      localStorage.removeItem('sparkvibe_token');
      localStorage.removeItem('sparkvibe_user');
    }
  }

  async initializeGoogleAuth() {
    if (this.googleInitialized) {
      return true;
    }

    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      console.error('VITE_GOOGLE_CLIENT_ID is not set');
      throw new Error('Google Sign-In not configured');
    }

    try {
      await this.loadGoogleScript();
      
      // Initialize Google Identity Services with simple callback
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: this.handleGoogleCallback.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true
      });

      this.googleInitialized = true;
      console.log('✅ Google Authentication initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Auth:', error);
      throw new Error('Failed to load Google Sign-In');
    }
  }

  loadGoogleScript() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google?.accounts) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Identity Services script loaded');
        // Wait a bit for the library to fully initialize
        setTimeout(() => resolve(), 100);
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Identity Services script');
        reject(new Error('Failed to load Google Sign-In script'));
      };
      
      document.head.appendChild(script);
    });
  }

  async handleGoogleCallback(response) {
    try {
      console.log('Google callback received');
      
      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

      // Validate the credential format
      const credential = response.credential.trim();
      const tokenParts = credential.split('.');
      
      if (tokenParts.length !== 3) {
        console.error('Invalid JWT format from Google:', tokenParts.length, 'segments');
        throw new Error(`Invalid token format from Google: ${tokenParts.length} segments instead of 3`);
      }

      console.log('Sending ID token to backend...');
      console.log('Token segments:', tokenParts.length);
      console.log('Token preview:', credential.substring(0, 50) + '...');

      // Send ID token to backend
      const result = await apiPost('/auth/google', {
        token: credential
      });

      if (result.success) {
        console.log('Backend authentication successful');
        this.setAuthData(result.token, result.user);
        
        // Call success handler if available
        if (window.handleGoogleLoginSuccess) {
          window.handleGoogleLoginSuccess(result.user);
        }
      } else {
        throw new Error(result.message || 'Google authentication failed');
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      
      // Call error handler if available
      if (window.handleGoogleLoginError) {
        window.handleGoogleLoginError(error.message);
      }
    }
  }

  renderGoogleButton(containerId) {
    if (!this.googleInitialized) {
      console.error('Google Auth not initialized');
      return false;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with id '${containerId}' not found`);
      return false;
    }

    try {
      // Clear existing content
      container.innerHTML = '';
      
      // Render the Google Sign-In button
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: '100%'
      });

      console.log('✅ Google button rendered successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to render Google button:', error);
      return false;
    }
  }

  signInWithGoogle() {
    if (!this.googleInitialized) {
      throw new Error('Google Auth not initialized. Please wait a moment and try again.');
    }

    try {
      // Simple approach: just trigger the One Tap prompt
      window.google.accounts.id.prompt((notification) => {
        console.log('Google One Tap notification:', notification);
        
        if (notification.isNotDisplayed()) {
          console.log('One Tap not displayed - user may need to click sign-in button');
        }
        
        if (notification.isSkippedMoment()) {
          console.log('One Tap was skipped');
        }
      });
    } catch (error) {
      console.error('Failed to show Google Sign-In prompt:', error);
      throw new Error('Failed to initiate Google Sign-In');
    }
  }

  // Email authentication methods
  async register(email, password, name) {
    try {
      const result = await apiPost('/auth/signup', {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: password
      });

      if (result.success) {
        this.setAuthData(result.token, result.user);
        return result;
      } else {
        throw new Error(result.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      const result = await apiPost('/auth/signin', {
        email: email.toLowerCase().trim(),
        password: password
      });

      if (result.success) {
        this.setAuthData(result.token, result.user);
        return result;
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  setAuthData(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('sparkvibe_token', token);
    localStorage.setItem('sparkvibe_user', JSON.stringify(user));
    console.log('✅ Auth data saved:', { userId: user.id, name: user.name });
  }

  signOut() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('sparkvibe_token');
    localStorage.removeItem('sparkvibe_user');
    
    // Sign out from Google if available
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    
    console.log('✅ User signed out');
  }

  isAuthenticated() {
    if (!this.token || !this.user) {
      return false;
    }

    // Check if token is expired (simple check)
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.log('Token expired');
        this.signOut();
        return false;
      }
    } catch (error) {
      console.warn('Invalid token format');
      return false;
    }

    return true;
  }

  getCurrentUser() {
    return this.user;
  }

  getAuthToken() {
    return this.token;
  }
}

export default new AuthService();