// Fixed AuthService.js - Updated to Google Identity Services (GIS)
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

    this.initPromise = this.loadGoogleIdentityServices(clientId);
    return this.initPromise;
  }

  async loadGoogleIdentityServices(clientId) {
    try {
      // Load Google Identity Services script if not already loaded
      if (!window.google?.accounts?.id) {
        await this.loadGoogleScript();
      }
  
      // Initialize Google Identity Services with proper COOP handling
      await new Promise((resolve, reject) => {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: this.handleGoogleCallback.bind(this),
            auto_select: false,
            cancel_on_tap_outside: true,
            // Updated for COOP compatibility
            use_fedcm_for_prompt: false, // Disable FedCM to avoid COOP issues
            ux_mode: 'popup', // Force popup mode
            // Add proper context
            context: 'signin',
            state_cookie_domain: window.location.hostname === 'localhost' ? 'localhost' : '.sparkvibe.app'
          });
          
          this.googleInitialized = true;
          console.log('✅ Google Identity Services initialized');
          resolve(true);
        } catch (error) {
          console.error('Google Identity Services initialization failed:', error);
          reject(error);
        }
      });
  
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Identity Services:', error);
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
      // Updated to Google Identity Services endpoint
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Identity Services script loaded');
        // Wait a bit for the API to be ready
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
      console.warn('Google Identity Services not initialized');
      return false;
    }
  
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container not found:', containerId);
      return false;
    }
  
    try {
      container.innerHTML = '';
      
      // Updated button configuration for COOP compatibility
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        width: Math.min(container.offsetWidth || 300, 400),
        text: 'signin_with',
        logo_alignment: 'left',
        // Force specific context
        context: 'signin',
        ux_mode: 'popup',
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
      throw new Error('Google Identity Services not initialized');
    }

    try {
      // Updated to use Google Identity Services prompt
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.log('One Tap not displayed:', notification.getNotDisplayedReason());
          // Fallback: show the sign-in dialog
          this.showGoogleSignInDialog();
        } else if (notification.isSkippedMoment()) {
          console.log('One Tap skipped:', notification.getSkippedReason());
          // Fallback: show the sign-in dialog
          this.showGoogleSignInDialog();
        }
      });
    } catch (error) {
      console.error('Failed to show Google sign-in prompt:', error);
      throw error;
    }
  }

  showGoogleSignInDialog() {
    // Create a temporary button element to trigger the sign-in flow
    const tempDiv = document.createElement('div');
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);
    
    window.google.accounts.id.renderButton(tempDiv, {
      theme: 'outline',
      size: 'large',
      click_listener: () => {
        document.body.removeChild(tempDiv);
      }
    });
    
    // Programmatically click the button
    setTimeout(() => {
      const button = tempDiv.querySelector('[role="button"]');
      if (button) {
        button.click();
      } else {
        document.body.removeChild(tempDiv);
      }
    }, 100);
  }

  // Email authentication methods remain the same
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
    
    // Updated to use Google Identity Services sign out
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.disableAutoSelect();
        // Note: Google Identity Services doesn't have a direct signOut method
        // User sessions are managed independently
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