// Updated AuthService.js - Better user data persistence and retrieval
import { apiPost } from '../utils/safeUtils.js';

class AuthService {
  constructor() {
    try {
      this.token = localStorage.getItem('sparkvibe_token');
      this.user = this.token ? JSON.parse(localStorage.getItem('sparkvibe_user') || '{}') : null;
      this.googleInitialized = false;
      // NEW: Store success callback for Google login
      this.googleLoginSuccessCallback = null;
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
      this.token = null;
      this.user = null;
      localStorage.removeItem('sparkvibe_token');
      localStorage.removeItem('sparkvibe_user');
    }
  }

  // NEW: Method to register a success callback for Google login
  setGoogleLoginSuccessCallback(callback) {
    if (typeof callback === 'function') {
      this.googleLoginSuccessCallback = callback;
      console.log('✅ Google login success callback registered');
    } else {
      console.warn('⚠️ Invalid callback provided for Google login');
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
      
      // Initialize with callback - FIXED: Added hl parameter for English
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => this.handleGoogleResponse(response),
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
        hl: 'en', // FORCE ENGLISH LANGUAGE
        locale: 'en' // ADDITIONAL LOCALE SETTING
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
      // FIXED: Add language parameter to script URL
      script.src = 'https://accounts.google.com/gsi/client?hl=en';
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
      console.log('Response received');
      
      if (!response.credential) {
        throw new Error('No credential in Google response');
      }

      const token = response.credential;
      console.log('Token received, length:', token.length);
      
      // FIXED: Parse JWT to get user info immediately
      const userInfo = this.parseJWT(token);
      console.log('Parsed user info:', userInfo);

      // Validate JWT format
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error(`Invalid JWT: ${parts.length} parts instead of 3`);
      }

      console.log('Sending to backend...');

      // Send to backend
      const result = await apiPost('/auth/google', { token });
      
      if (result.success) {
        console.log('✅ Backend auth successful');
        
        // FIXED: Ensure user data includes parsed info with proper structure
        const userData = {
          ...result.user,
          name: result.user.name || userInfo.name || 'Google User',
          email: result.user.email || userInfo.email || '',
          avatar: result.user.avatar || userInfo.picture || '👤',
          provider: 'google',
          // FIXED: Ensure totalPoints is at top level for easy access
          totalPoints: result.user.stats?.totalPoints || 0,
          level: result.user.stats?.level || 1,
          streak: result.user.stats?.streak || 0,
          cardsGenerated: result.user.stats?.cardsGenerated || 0,
          cardsShared: result.user.stats?.cardsShared || 0,
          // Also keep stats object for compatibility
          stats: {
            totalPoints: result.user.stats?.totalPoints || 0,
            level: result.user.stats?.level || 1,
            streak: result.user.stats?.streak || 0,
            cardsGenerated: result.user.stats?.cardsGenerated || 0,
            cardsShared: result.user.stats?.cardsShared || 0,
            lastActivity: new Date(),
            bestStreak: result.user.stats?.bestStreak || 0,
            adventuresCompleted: result.user.stats?.adventuresCompleted || 0,
            moodHistory: result.user.stats?.moodHistory || [],
            choices: result.user.stats?.choices || [],
            ...result.user.stats
          }
        };
        
        this.setAuthData(result.token, userData);
        
        // FIXED: Use internal callback if set, otherwise check window handler
        if (this.googleLoginSuccessCallback) {
          console.log('✅ Calling registered Google login success callback');
          this.googleLoginSuccessCallback(userData);
        } else if (window.handleGoogleLoginSuccess && typeof window.handleGoogleLoginSuccess === 'function') {
          console.log('✅ Calling window.handleGoogleLoginSuccess');
          window.handleGoogleLoginSuccess(userData);
        } else {
          console.warn('⚠️ No Google login success callback defined, skipping');
          // Default behavior: Log success and store data
          console.log('✅ Login success callback:', userData);
        }
      } else {
        throw new Error(result.message || 'Backend auth failed');
      }
    } catch (error) {
      console.error('❌ Google auth error:', error);
      
      // Call global error handler
      if (window.handleGoogleLoginError && typeof window.handleGoogleLoginError === 'function') {
        window.handleGoogleLoginError(error.message);
      } else {
        console.warn('⚠️ No Google login error callback defined, logging error:', error.message);
      }
    }
  }

  // FIXED: Added JWT parser to extract user info
  parseJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      return {
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
        given_name: payload.given_name,
        family_name: payload.family_name
      };
    } catch (error) {
      console.error('Failed to parse JWT:', error);
      return {};
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
      
      // FIXED: Calculate responsive width based on container/input field width
      let buttonWidth = 320; // Default width
      
      // Try to match the width of the form inputs
      const parentForm = container.closest('form') || container.closest('.bg-white\\/10');
      if (parentForm) {
        const inputField = parentForm.querySelector('input[type="email"], input[type="text"], input[type="password"]');
        if (inputField) {
          const inputWidth = inputField.offsetWidth;
          if (inputWidth > 0) {
            buttonWidth = Math.min(inputWidth, 400); // Max 400px, but match input width
            console.log(`Setting Google button width to match input: ${buttonWidth}px`);
          }
        }
      }
      
      // Fallback: use container width if available
      if (buttonWidth === 320 && container.offsetWidth > 0) {
        buttonWidth = Math.min(container.offsetWidth - 20, 400);
        console.log(`Using container width for Google button: ${buttonWidth}px`);
      }
      
      // FIXED: Responsive button configuration with proper width
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        width: buttonWidth, // RESPONSIVE WIDTH
        shape: 'rectangular',
        logo_alignment: 'left',
        locale: 'en', // FORCE ENGLISH
        text: 'continue_with' // ENGLISH TEXT
      });

      console.log('✅ Google button rendered with width:', buttonWidth);
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
        // FIXED: Structure user data properly for consistency
        const userData = {
          ...result.user,
          totalPoints: result.user.stats?.totalPoints || 0,
          level: result.user.stats?.level || 1,
          streak: result.user.stats?.streak || 0,
          cardsGenerated: result.user.stats?.cardsGenerated || 0,
          cardsShared: result.user.stats?.cardsShared || 0,
          stats: {
            totalPoints: result.user.stats?.totalPoints || 0,
            level: result.user.stats?.level || 1,
            streak: result.user.stats?.streak || 0,
            cardsGenerated: result.user.stats?.cardsGenerated || 0,
            cardsShared: result.user.stats?.cardsShared || 0,
            lastActivity: new Date(),
            bestStreak: result.user.stats?.bestStreak || 0,
            adventuresCompleted: result.user.stats?.adventuresCompleted || 0,
            moodHistory: result.user.stats?.moodHistory || [],
            choices: result.user.stats?.choices || [],
            ...result.user.stats
          }
        };
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
        password: password
      });

      if (result.success) {
        // FIXED: Structure user data properly for consistency
        const userData = {
          ...result.user,
          totalPoints: result.user.stats?.totalPoints || 0,
          level: result.user.stats?.level || 1,
          streak: result.user.stats?.streak || 0,
          cardsGenerated: result.user.stats?.cardsGenerated || 0,
          cardsShared: result.user.stats?.cardsShared || 0,
          stats: {
            totalPoints: result.user.stats?.totalPoints || 0,
            level: result.user.stats?.level || 1,
            streak: result.user.stats?.streak || 0,
            cardsGenerated: result.user.stats?.cardsGenerated || 0,
            cardsShared: result.user.stats?.cardsShared || 0,
            lastActivity: new Date(),
            bestStreak: result.user.stats?.bestStreak || 0,
            adventuresCompleted: result.user.stats?.adventuresCompleted || 0,
            moodHistory: result.user.stats?.moodHistory || [],
            choices: result.user.stats?.choices || [],
            ...result.user.stats
          }
        };
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
    console.log('✅ Auth data saved with points:', user.totalPoints, user);
  }

  // FIXED: Helper method to update user data and keep localStorage in sync
  updateUser(updates) {
    if (!this.user) return null;
    
    this.user = {
      ...this.user,
      ...updates,
      stats: {
        ...this.user.stats,
        ...updates.stats,
        lastActivity: new Date()
      }
    };
    
    // Ensure top-level properties are in sync with stats
    if (updates.totalPoints !== undefined) {
      this.user.totalPoints = updates.totalPoints;
      this.user.stats.totalPoints = updates.totalPoints;
    }
    if (updates.level !== undefined) {
      this.user.level = updates.level;
      this.user.stats.level = updates.level;
    }
    if (updates.streak !== undefined) {
      this.user.streak = updates.streak;
      this.user.stats.streak = updates.streak;
    }
    
    localStorage.setItem('sparkvibe_user', JSON.stringify(this.user));
    console.log('✅ User data updated with points:', this.user.totalPoints);
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
    // FIXED: Always return the most recent user data from localStorage
    try {
      const storedUser = localStorage.getItem('sparkvibe_user');
      if (storedUser) {
        this.user = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Failed to parse stored user:', error);
    }
    return this.user;
  }

  getAuthToken() {
    return this.token;
  }
}

export default new AuthService();