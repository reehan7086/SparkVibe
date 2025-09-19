// Fixed AuthService.js - Simplified Google Auth with better error handling
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
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.googleInitialized) {
      return true;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('Google Client ID not configured - Google Sign-In disabled');
      return false;
    }

    this.initPromise = this.loadGoogleAuth(clientId);
    return this.initPromise;
  }

  async loadGoogleAuth(clientId) {
    try {
      // Load Google script if not already loaded
      if (!window.google?.accounts?.id) {
        await this.loadGoogleScript();
      }

      // Initialize Google Auth
      await new Promise((resolve, reject) => {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: this.handleGoogleCallback.bind(this),
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: false
          });
          
          this.googleInitialized = true;
          console.log('✅ Google Auth initialized');
          resolve(true);
        } catch (error) {
          console.error('Google Auth initialization failed:', error);
          reject(error);
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize Google Auth:', error);
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
        console.log('Google script loaded');
        // Wait a bit for the API to be ready
        setTimeout(resolve, 100);
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google script'));
      };
      
      document.head.appendChild(script);
    });
  }

  async handleGoogleCallback(response) {
    try {
      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

      console.log('Processing Google authentication...');
      
      const result = await apiPost('/auth/google', { 
        token: response.credential 
      });
      
      if (result.success && result.user) {
        const userData = this.normalizeUserData(result.user, 'google');
        this.setAuthData(result.token, userData);
        
        // Trigger success event
        window.dispatchEvent(new CustomEvent('googleLoginSuccess', {
          detail: { user: userData, token: result.token }
        }));
        
        console.log('✅ Google login successful');
      } else {
        throw new Error(result.message || 'Google authentication failed');
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      
      // Trigger error event
      window.dispatchEvent(new CustomEvent('googleLoginError', {
        detail: { error: error.message }
      }));
    }
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

  async renderGoogleButton(containerId, options = {}) {
    if (!this.googleInitialized) {
      console.warn('Google Auth not initialized');
      return false;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container not found:', containerId);
      return false;
    }

    try {
      container.innerHTML = '';
      
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        width: container.offsetWidth || 300,
        ...options
      });

      return true;
    } catch (error) {
      console.error('Failed to render Google button:', error);
      return false;
    }
  }

  async signInWithGoogle() {
    if (!this.googleInitialized) {
      throw new Error('Google Auth not initialized');
    }

    try {
      window.google.accounts.id.prompt();
    } catch (error) {
      console.error('Failed to show Google sign-in prompt:', error);
      throw error;
    }
  }

  // Email authentication methods
  async register(email, password, name) {
    try {
      const result = await apiPost('/auth/signup', {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password
      });

      if (result.success && result.user) {
        const userData = this.normalizeUserData(result.user, 'email');
        this.setAuthData(result.token, userData);
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

      if (result.success && result.user) {
        const userData = this.normalizeUserData(result.user, 'email');
        this.setAuthData(result.token, userData);
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
      window.google.accounts.id.disableAutoSelect();
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