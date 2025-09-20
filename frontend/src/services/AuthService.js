// frontend/src/services/AuthService.js - FIXED VERSION
import { apiPost } from '../utils/safeUtils.js';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('sparkvibe_token');
    this.user = this.getStoredUser();
    this.googleInitialized = false;
    this.initPromise = null;
  }

  getStoredUser() {
    try {
      const userData = localStorage.getItem('sparkvibe_user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      localStorage.removeItem('sparkvibe_user');
      return null;
    }
  }

  async initializeGoogleAuth() {
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.googleInitialized) {
      return true;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    console.log('🔍 Google Auth Debug:', {
      clientIdExists: !!clientId,
      clientIdLength: clientId?.length,
      domain: window.location.hostname
    });

    if (!clientId) {
      console.error('❌ VITE_GOOGLE_CLIENT_ID not configured');
      return false;
    }

    this.initPromise = this.loadGoogleIdentityServices(clientId);
    return this.initPromise;
  }

  async loadGoogleIdentityServices(clientId) {
    try {
      console.log('🔄 Loading Google Identity Services...');

      if (!window.google?.accounts?.id) {
        await this.loadGoogleScript();
      }

      console.log('🔄 Initializing Google Identity Services...');

      await new Promise((resolve, reject) => {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: this.handleGoogleCallback.bind(this),
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: false,
            ux_mode: 'popup',
            context: 'signin',
            itp_support: true
          });

          this.googleInitialized = true;
          console.log('✅ Google Identity Services initialized successfully');
          resolve(true);
        } catch (error) {
          console.error('❌ Google Identity Services initialization failed:', error);
          reject(error);
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Identity Services:', error);
      this.googleInitialized = false;
      return false;
    }
  }

  loadGoogleScript() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('Google Identity Services script loaded');
        setTimeout(resolve, 100);
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Identity Services script'));
      };

      document.head.appendChild(script);
    });
  }

  async handleGoogleCallback(response) {
    try {
      if (!response.credential) {
        throw new Error('No credential received from Google');
      }
      console.log('Processing Google authentication with ID token...');
      const result = await apiPost('/auth/google', { id_token: response.credential });
      if (result.success && result.data) {
        const userData = this.normalizeUserData(result.data.user, 'google');
        this.setAuthData(result.data.token, userData);
        window.dispatchEvent(new CustomEvent('googleLoginSuccess', {
          detail: { user: userData }
        }));
      } else {
        throw new Error(result.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      window.dispatchEvent(new CustomEvent('googleLoginError', {
        detail: { error: error.message }
      }));
    }
  }

  // FIXED: Simplified Google button rendering
  async renderGoogleButton(container, options = {}) {
    if (!container) {
      console.error('Container not found');
      return false;
    }

    try {
      if (!this.googleInitialized) {
        await this.initializeGoogleAuth();
      }

      if (this.googleInitialized && window.google?.accounts?.id) {
        // Use Google's built-in button
        window.google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          width: Math.min(window.innerWidth - 64, 320),
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        });
        return true;
      } else {
        // Fallback manual button
        this.renderManualButton(container);
        return true;
      }
    } catch (error) {
      console.error('Failed to render Google button:', error);
      this.renderManualButton(container);
      return false;
    }
  }

  renderManualButton(container) {
    container.innerHTML = `
      <button id="manual-google-signin" style="
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        width: 100%;
        padding: 12px 24px;
        background: white;
        border: 1px solid #dadce0;
        border-radius: 8px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 14px;
        font-weight: 500;
        color: #3c4043;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      " 
      onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)'"
      onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)'">
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>
    `;

    document.getElementById('manual-google-signin').addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (!this.googleInitialized) {
          await this.initializeGoogleAuth();
        }
        
        if (window.google?.accounts?.id) {
          window.google.accounts.id.prompt();
        } else {
          console.error('Google Identity Services not available');
        }
      } catch (error) {
        console.error('Manual Google sign-in failed:', error);
      }
    });
  }

  normalizeUserData(userData, provider = 'email') {
    return {
      id: userData.id,
      name: userData.name || userData.given_name || 'User',
      email: userData.email,
      avatar: userData.avatar || userData.picture || '👤',
      provider,
      emailVerified: userData.emailVerified || true,
      totalPoints: userData.stats?.totalPoints || 0,
      level: userData.stats?.level || 1,
      streak: userData.stats?.streak || 0,
      cardsGenerated: userData.stats?.cardsGenerated || 0,
      cardsShared: userData.stats?.cardsShared || 0,
      stats: {
        totalPoints: userData.stats?.totalPoints || 0,
        level: userData.stats?.level || 1,
        streak: userData.stats?.streak || 0,
        cardsGenerated: userData.stats?.cardsGenerated || 0,
        cardsShared: userData.stats?.cardsShared || 0,
        lastActivity: new Date(),
        ...userData.stats
      },
      preferences: userData.preferences || {
        interests: ['wellness', 'creativity'],
        aiPersonality: 'encouraging',
        adventureTypes: ['general'],
        difficulty: 'easy'
      },
      ...userData
    };
  }

  async register(email, password, name) {
    try {
      const result = await apiPost('/auth/signup', {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password
      });

      if (result.success && result.data) {
        const userData = this.normalizeUserData(result.data.user, 'email');
        this.setAuthData(result.data.token, userData);
        return { ...result, user: userData };
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
        password
      });

      if (result.success && result.data) {
        const userData = this.normalizeUserData(result.data.user, 'email');
        this.setAuthData(result.data.token, userData);
        return { ...result, user: userData };
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
    console.log('✅ Auth data saved');
  }

  updateUser(updates) {
    if (!this.user) return null;
    this.user = { ...this.user, ...updates };
    localStorage.setItem('sparkvibe_user', JSON.stringify(this.user));
    return this.user;
  }

  signOut() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('sparkvibe_token');
    localStorage.removeItem('sparkvibe_user');

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch (error) {
        console.warn('Google sign-out warning:', error);
      }
    }
    console.log('✅ Signed out');
  }

  isAuthenticated() {
    return !!(this.token && this.user);
  }

  getCurrentUser() {
    if (!this.user) {
      this.user = this.getStoredUser();
    }
    return this.user;
  }

  getAuthToken() {
    return this.token;
  }
}

export default new AuthService();