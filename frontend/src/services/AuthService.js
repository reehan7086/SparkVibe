// AuthService.js
import { apiPost } from '../utils/safeUtils.js';

class AuthService {
  constructor() {
    try {
      this.token = localStorage.getItem('sparkvibe_token');
      this.user = this.token ? JSON.parse(localStorage.getItem('sparkvibe_user') || '{}') : null;
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
      this.token = null;
      this.user = null;
      localStorage.removeItem('sparkvibe_token');
      localStorage.removeItem('sparkvibe_user');
    }
  }

  async initializeGoogle() {
    return new Promise((resolve, reject) => {
      if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        console.error('VITE_GOOGLE_CLIENT_ID is not set');
        reject(new Error('Google Sign-In configuration missing'));
        return;
      }
      if (window.google && window.google.accounts) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Identity Services loaded');
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load Google Identity Services');
        reject(new Error('Failed to load Google Sign-In script'));
      };
      document.head.appendChild(script);
    });
  }

  async signInWithGoogle() {
    const maxRetries = 2;
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        await this.initializeGoogle();
        return await this.signInWithGoogleOAuth();
      } catch (error) {
        console.error(`Google OAuth attempt ${attempt + 1} failed:`, error);
        attempt++;
        if (attempt > maxRetries) {
          console.error('Switching to One Tap fallback');
          try {
            return await this.signInWithGoogleOneTap();
          } catch (oneTapError) {
            console.error('Google One Tap failed:', oneTapError);
            throw new Error('Google sign-in failed. Please try refreshing the page or use email sign-in.');
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
      }
    }
  }

  async signInWithGoogleOAuth() {
    return new Promise((resolve, reject) => {
      try {
        window.google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          callback: async (response) => {
            if (response.error) {
              console.error('OAuth2 callback error:', response.error, response.error_description);
              reject(new Error(`Google Sign-In error: ${response.error}`));
              return;
            }
            try {
              console.log('Processing Google OAuth token:', response.access_token);
              const result = await this.processGoogleToken(response.access_token);
              resolve(result);
            } catch (error) {
              console.error('Google OAuth token processing failed:', error);
              reject(new Error('Failed to process Google Sign-In'));
            }
          },
          error_callback: (error) => {
            console.error('OAuth2 initialization error:', error);
            reject(new Error('Google Sign-In initialization failed'));
          }
        }).requestAccessToken();
      } catch (error) {
        console.error('OAuth2 setup error:', error);
        reject(new Error('Failed to initialize Google Sign-In'));
      }
    });
  }

  async signInWithGoogleOneTap() {
    return new Promise((resolve, reject) => {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const result = await this.processGoogleToken(response.credential);
            resolve(result);
          } catch (error) {
            reject(new Error('Google One Tap authentication failed'));
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });
      window.google.accounts.id.prompt((notification) => {
        console.log('Google One Tap notification:', notification);
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('One Tap failed, falling back to button');
          this.renderGoogleSignInButton().then(resolve).catch(reject);
        }
      });
    });
  }

  async renderGoogleSignInButton() {
    return new Promise((resolve, reject) => {
      const buttonContainer = document.createElement('div');
      buttonContainer.id = 'google-signin-button-temp';
      buttonContainer.style.position = 'fixed';
      buttonContainer.style.top = '50%';
      buttonContainer.style.left = '50%';
      buttonContainer.style.transform = 'translate(-50%, -50%)';
      buttonContainer.style.zIndex = '10000';
      buttonContainer.style.background = 'white';
      buttonContainer.style.padding = '20px';
      buttonContainer.style.borderRadius = '8px';
      buttonContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      document.body.appendChild(buttonContainer);
      try {
        window.google.accounts.id.renderButton(buttonContainer, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          callback: async (response) => {
            try {
              document.body.removeChild(buttonContainer);
              const result = await this.processGoogleToken(response.credential);
              resolve(result);
            } catch (error) {
              document.body.removeChild(buttonContainer);
              reject(new Error('Google Sign-In button authentication failed'));
            }
          }
        });
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.marginTop = '10px';
        cancelButton.style.padding = '8px 16px';
        cancelButton.style.background = '#f0f0f0';
        cancelButton.style.border = '1px solid #ccc';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.onclick = () => {
          document.body.removeChild(buttonContainer);
          reject(new Error('Google Sign-In cancelled'));
        };
        buttonContainer.appendChild(cancelButton);
      } catch (error) {
        document.body.removeChild(buttonContainer);
        reject(new Error('Failed to render Google Sign-In button'));
      }
    });
  }

  async processGoogleToken(token) {
    try {
      const result = await apiPost('/auth/google', { token });
      if (result.success) {
        this.setAuthData(result.token, result.user);
        return result.user;
      }
      throw new Error(result.message || 'Google authentication failed');
    } catch (error) {
      console.error('Google token processing failed:', error);
      throw new Error(error.message || 'Failed to authenticate with Google');
    }
  }

  async signUpWithEmail(userData) {
    try {
      if (!userData.name || !userData.email || !userData.password) {
        throw new Error('Name, email, and password are required');
      }
      const result = await apiPost('/auth/signup', {
        name: userData.name,
        email: userData.email,
        password: userData.password
      });
      return result;
    } catch (error) {
      console.error('Email sign up failed:', error);
      throw new Error(error.message || 'Failed to sign up with email');
    }
  }

  async signInWithEmail(credentials) {
    try {
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }
      const result = await apiPost('/auth/signin', {
        email: credentials.email,
        password: credentials.password
      });
      if (result.success) {
        if (!result.user.emailVerified) {
          throw new Error('Please verify your email address before signing in');
        }
        this.setAuthData(result.token, result.user);
        return result.user;
      }
      throw new Error(result.message || 'Invalid email or password');
    } catch (error) {
      console.error('Email sign in failed:', error);
      throw new Error(error.message || 'Failed to sign in with email');
    }
  }

  async resendVerificationEmail(email) {
    try {
      if (!email) {
        throw new Error('Email is required');
      }
      const result = await apiPost('/auth/resend-verification', { email });
      return result;
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      throw new Error(error.message || 'Failed to resend verification email');
    }
  }

  async verifyEmail(token) {
    try {
      if (!token) {
        throw new Error('Verification token is required');
      }
      const result = await apiPost('/auth/verify-email', { token });
      if (result.success && this.user) {
        this.user.emailVerified = true;
        localStorage.setItem('sparkvibe_user', JSON.stringify(this.user));
      }
      return result;
    } catch (error) {
      console.error('Email verification failed:', error);
      throw new Error(error.message || 'Email verification failed');
    }
  }

  async requestPasswordReset(email) {
    try {
      if (!email) {
        throw new Error('Email is required');
      }
      const result = await apiPost('/auth/reset-password', { email });
      return result;
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }

  async resetPassword(token, newPassword) {
    try {
      if (!token || !newPassword) {
        throw new Error('Token and new password are required');
      }
      const result = await apiPost('/auth/reset-password/confirm', { token, password: newPassword });
      return result;
    } catch (error) {
      console.error('Password reset failed:', error);
      throw new Error(error.message || 'Password reset failed');
    }
  }

  async refreshToken() {
    try {
      if (!this.token) {
        throw new Error('No token available');
      }
      const result = await apiPost('/auth/refresh-token', {}, { Authorization: `Bearer ${this.token}` });
      if (result.success) {
        this.setAuthData(result.token, this.user);
        return result.token;
      }
      throw new Error(result.message || 'Token refresh failed');
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.signOut();
      throw new Error('Session expired, please sign in again');
    }
  }

  setAuthData(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('sparkvibe_token', token);
    localStorage.setItem('sparkvibe_user', JSON.stringify(user));
  }

  signOut() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('sparkvibe_token');
    localStorage.removeItem('sparkvibe_user');
    window.location.reload();
  }

  isAuthenticated() {
    return !!this.token && !!this.user && this.user.emailVerified;
  }

  isEmailVerified() {
    return this.user ? this.user.emailVerified : false;
  }

  getCurrentUser() {
    return this.user;
  }

  getAuthToken() {
    return this.token;
  }

  async updateProfile(userData) {
    try {
      // Note: /auth/update-profile endpoint not implemented in server.js
      // Implement on backend or use /user/profile with PUT method
      throw new Error('Profile update not implemented');
      /*
      const result = await apiPost('/auth/update-profile', userData, {
        Authorization: `Bearer ${this.token}`
      });
      if (result.success) {
        this.user = { ...this.user, ...result.user };
        localStorage.setItem('sparkvibe_user', JSON.stringify(this.user));
        return result.user;
      }
      throw new Error(result.message || 'Profile update failed');
      */
    } catch (error) {
      console.error('Profile update failed:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      // Note: /auth/change-password endpoint not implemented in server.js
      throw new Error('Password change not implemented');
      /*
      const result = await apiPost('/auth/change-password', {
        currentPassword,
        newPassword
      }, { Authorization: `Bearer ${this.token}` });
      return result;
      */
    } catch (error) {
      console.error('Password change failed:', error);
      throw new Error(error.message || 'Failed to change password');
    }
  }

  async subscribeToPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported in this browser');
      return null;
    }
    if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      console.error('VITE_VAPID_PUBLIC_KEY is not set');
      return null;
    }
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
        });
      }
      await apiPost('/subscribe-push', {
        subscription: subscription.toJSON()
      }, { Authorization: `Bearer ${this.token}` });
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  async handleGoogleCallback(response) {
  try {
    console.log('Google callback received');
    console.log('Response object:', response);
    
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
    } else {
      throw error;
    }
  }
}

debugGoogleToken(token) {
  console.log('=== Google Token Debug Info ===');
  console.log('Token type:', typeof token);
  console.log('Token length:', token?.length);
  console.log('Token starts with:', token?.substring(0, 20));
  console.log('Token ends with:', token?.substring(token.length - 20));
  
  if (token) {
    const parts = token.split('.');
    console.log('Number of segments:', parts.length);
    
    if (parts.length >= 1) {
      try {
        const header = JSON.parse(atob(parts[0]));
        console.log('JWT Header:', header);
      } catch (e) {
        console.log('Could not decode header:', e.message);
      }
    }
    
    if (parts.length >= 2) {
      try {
        const payload = JSON.parse(atob(parts[1]));
        console.log('JWT Payload (preview):', {
          iss: payload.iss,
          aud: payload.aud,
          sub: payload.sub?.substring(0, 10) + '...',
          exp: new Date(payload.exp * 1000),
          iat: new Date(payload.iat * 1000)
        });
      } catch (e) {
        console.log('Could not decode payload:', e.message);
      }
    }
  }
  console.log('=== End Debug Info ===');
}

  urlBase64ToUint8Array(base64String) {
    try {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch (error) {
      console.error('Failed to convert VAPID key:', error);
      throw new Error('Invalid VAPID public key');
    }
  }
}

export default new AuthService();