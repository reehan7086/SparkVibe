// Fixed AuthService.js - Complete Working Version
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

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('VITE_GOOGLE_CLIENT_ID is not set');
      throw new Error('Google Sign-In not configured - missing VITE_GOOGLE_CLIENT_ID');
    }

    try {
      // Load Google script
      await this.loadGoogleScript();
      
      // Initialize with callback
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => this.handleGoogleResponse(response),
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false
      });

      this.googleInitialized = true;
      console.log('✅ Google Auth initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Google Auth initialization failed:', error);
      throw error;
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
        setTimeout(resolve, 100);
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google script'));
      };
      
      document.head.appendChild(script);
    });
  }

  async handleGoogleResponse(response) {
    try {
      console.log('=== Google Response Debug ===');
      console.log('Response:', response);
      
      if (!response.credential) {
        throw new Error('No credential in Google response');
      }

      const token = response.credential;
      console.log('Token type:', typeof token);
      console.log('Token length:', token.length);
      
      // Validate JWT format
      const parts = token.split('.');
      console.log('Token parts:', parts.length);
      
      if (parts.length !== 3) {
        throw new Error(`Invalid JWT: ${parts.length} parts instead of 3`);
      }

      console.log('Token preview:', token.substring(0, 50) + '...');
      console.log('Sending to backend...');

      // Send to backend
      const result = await apiPost('/auth/google', { token });
      
      if (result.success) {
        console.log('✅ Backend auth successful');
        this.setAuthData(result.token, result.user);
        
        // Call global success handler
        if (window.handleGoogleLoginSuccess) {
          window.handleGoogleLoginSuccess(result.user);
        }
      } else {
        throw new Error(result.message || 'Backend auth failed');
      }
    } catch (error) {
      console.error('❌ Google auth error:', error);
      
      // Call global error handler
      if (window.handleGoogleLoginError) {
        window.handleGoogleLoginError(error.message);
      }
    }
  }

  renderGoogleButton(containerId) {
    if (!this.googleInitialized) {
      console.error('Google not initialized');
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
        width: '100%'
      });

      console.log('✅ Google button rendered');
      return true;
    } catch (error) {
      console.error('❌ Button render failed:', error);
      return false;
    }
  }

  signInWithGoogle() {
    if (!this.googleInitialized) {
      throw new Error('Google Auth not ready');
    }

    try {
      console.log('Triggering Google prompt...');
      window.google.accounts.id.prompt();
    } catch (error) {
      console.error('Failed to show Google prompt:', error);
      throw error;
    }
  }

  // Email auth methods
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
    console.log('✅ Auth data saved');
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
    return this.user;
  }

  getAuthToken() {
    return this.token;
  }
}

export default new AuthService();